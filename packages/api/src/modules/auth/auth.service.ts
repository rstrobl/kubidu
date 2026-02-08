import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as speakeasy from 'speakeasy';
import { User, ApiKey } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import {
  RegisterRequest,
  LoginRequest,
  AuthResponse,
  ApiKeyPermission,
  GDPR_CONFIG,
  slugify,
} from '@kubidu/shared';
import { generateApiKey, validatePassword } from '@kubidu/shared';
import { EncryptionService } from '../../services/encryption.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly encryptionService: EncryptionService,
  ) {}

  /**
   * Register a new user
   */
  async register(
    registerDto: RegisterRequest,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AuthResponse> {
    const { email, password, name, gdprConsents } = registerDto;

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      throw new BadRequestException(passwordValidation.errors);
    }

    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Ensure GDPR consents are provided
    if (!gdprConsents?.termsOfService || !gdprConsents?.privacyPolicy) {
      throw new BadRequestException(
        'You must accept the Terms of Service and Privacy Policy',
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user with GDPR consents and subscription in a transaction
    const user = await this.prisma.$transaction(async (tx) => {
      // Create user
      const newUser = await tx.user.create({
        data: {
          email: email.toLowerCase(),
          passwordHash,
          name,
          status: 'ACTIVE',
          emailVerified: false, // TODO: Implement email verification
        },
      });

      // Create GDPR consents
      await tx.gdprConsent.createMany({
        data: [
          {
            userId: newUser.id,
            consentType: 'terms_of_service',
            consentGiven: gdprConsents.termsOfService as boolean,
            consentVersion: GDPR_CONFIG.CONSENT_VERSION,
            ipAddress,
            userAgent,
          },
          {
            userId: newUser.id,
            consentType: 'privacy_policy',
            consentGiven: gdprConsents.privacyPolicy as boolean,
            consentVersion: GDPR_CONFIG.CONSENT_VERSION,
            ipAddress,
            userAgent,
          },
          ...(gdprConsents.marketing !== undefined
            ? [
                {
                  userId: newUser.id,
                  consentType: 'marketing',
                  consentGiven: gdprConsents.marketing as boolean,
                  consentVersion: GDPR_CONFIG.CONSENT_VERSION,
                  ipAddress,
                  userAgent,
                },
              ]
            : []),
        ],
      });

      // Create personal workspace for the user
      const workspaceName = name ? `${name}'s Workspace` : `${email.split('@')[0]}'s Workspace`;
      const workspaceSlug = `personal-${newUser.id}`;

      const workspace = await tx.workspace.create({
        data: {
          name: workspaceName,
          slug: workspaceSlug,
        },
      });

      // Add user as admin of their workspace
      await tx.workspaceMember.create({
        data: {
          userId: newUser.id,
          workspaceId: workspace.id,
          role: 'ADMIN',
        },
      });

      // Create free subscription for the workspace
      await tx.subscription.create({
        data: {
          workspaceId: workspace.id,
          stripeCustomerId: null,
          stripeSubscriptionId: null,
          plan: 'FREE',
          status: 'ACTIVE',
          currentPeriodStart: null,
          currentPeriodEnd: null,
          canceledAt: null,
        },
      });

      return newUser;
    });

    this.logger.log(`User registered: ${user.id}`);

    // Generate JWT tokens
    return this.generateAuthResponse(user);
  }

  /**
   * Validate user credentials
   */
  async validateUser(email: string, password: string): Promise<User> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Account is not active');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return user;
  }

  /**
   * Login with email and password
   */
  async login(loginDto: LoginRequest): Promise<AuthResponse> {
    const { email, password, twoFactorCode } = loginDto;

    const user = await this.validateUser(email, password);

    // Verify 2FA if enabled
    if (user.twoFactorEnabled) {
      if (!twoFactorCode) {
        throw new UnauthorizedException('Two-factor authentication code required');
      }

      const isValid = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: 'base32',
        token: twoFactorCode,
        window: 2,
      });

      if (!isValid) {
        throw new UnauthorizedException('Invalid two-factor authentication code');
      }
    }

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return this.generateAuthResponse(user);
  }

  /**
   * Generate JWT access and refresh tokens
   */
  private async generateAuthResponse(user: User): Promise<AuthResponse> {
    const payload = { sub: user.id, email: user.email };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: '30d',
    });

    // Remove sensitive fields from response
    const { passwordHash, twoFactorSecret, ...userWithoutSensitiveData } = user;

    return {
      user: userWithoutSensitiveData as any,
      accessToken,
      refreshToken,
      expiresIn: 3600, // 1 hour
    };
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    try {
      const payload = this.jwtService.verify(refreshToken);
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user || user.status !== 'ACTIVE') {
        throw new UnauthorizedException('Invalid refresh token');
      }

      return this.generateAuthResponse(user);
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  /**
   * Generate API key for CLI authentication
   */
  async generateApiKey(
    userId: string,
    name: string,
    expiresInDays?: number,
  ): Promise<{ apiKey: ApiKey; key: string }> {
    const { key, prefix, hash } = generateApiKey();

    const apiKey = await this.prisma.apiKey.create({
      data: {
        userId,
        name,
        keyHash: hash,
        keyPrefix: prefix,
        permissions: [ApiKeyPermission.READ, ApiKeyPermission.WRITE],
        expiresAt: expiresInDays
          ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
          : null,
      },
    });

    this.logger.log(`API key created for user: ${userId}`);

    return { apiKey, key };
  }

  /**
   * Validate API key
   */
  async validateApiKey(key: string): Promise<User> {
    const hash = this.encryptionService.hash(key);

    const apiKey = await this.prisma.apiKey.findFirst({
      where: { keyHash: hash },
      include: { user: true },
    });

    if (!apiKey) {
      throw new UnauthorizedException('Invalid API key');
    }

    if (apiKey.revokedAt) {
      throw new UnauthorizedException('API key has been revoked');
    }

    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      throw new UnauthorizedException('API key has expired');
    }

    if (apiKey.user.status !== 'ACTIVE') {
      throw new UnauthorizedException('User account is not active');
    }

    // Update last used
    await this.prisma.apiKey.update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    });

    return apiKey.user;
  }

  /**
   * Enable 2FA for a user
   */
  async enable2FA(userId: string): Promise<{ secret: string; qrCode: string }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const secret = speakeasy.generateSecret({
      name: `Kubidu (${user.email})`,
      length: 32,
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorSecret: secret.base32 },
    });

    return {
      secret: secret.base32,
      qrCode: secret.otpauth_url,
    };
  }

  /**
   * Verify and activate 2FA
   */
  async verify2FA(userId: string, token: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user || !user.twoFactorSecret) {
      throw new BadRequestException('2FA not initiated');
    }

    const isValid = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token,
      window: 2,
    });

    if (isValid) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { twoFactorEnabled: true },
      });
      this.logger.log(`2FA enabled for user: ${user.id}`);
      return true;
    }

    return false;
  }

  /**
   * Disable 2FA
   */
  async disable2FA(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
      },
    });

    this.logger.log(`2FA disabled for user: ${user.id}`);
  }
}

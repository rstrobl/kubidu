import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { User } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { UserStatus } from '@kubidu/shared';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('jwt.secret'),
    });
  }

  async validate(payload: any): Promise<Omit<User, 'passwordHash' | 'twoFactorSecret' | 'passwordResetToken' | 'passwordResetExpires'>> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException();
    }

    // Remove all sensitive fields including password reset tokens (SEC-002)
    const {
      passwordHash,
      twoFactorSecret,
      passwordResetToken,
      passwordResetExpires,
      ...userWithoutSensitiveData
    } = user;

    return userWithoutSensitiveData;
  }
}

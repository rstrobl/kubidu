import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { HttpModule } from '@nestjs/axios';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DeploymentsController } from './deployments.controller';
import { DeploymentsService } from './deployments.service';
import { DeploymentsGateway } from './deployments.gateway';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'deploy',
    }),
    HttpModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('jwt.secret'),
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [DeploymentsController],
  providers: [DeploymentsService, DeploymentsGateway],
  exports: [DeploymentsService, DeploymentsGateway],
})
export class DeploymentsModule {}

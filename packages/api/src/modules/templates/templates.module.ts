import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { TemplatesService } from './templates.service';
import { TemplatesController, ProjectTemplatesController } from './templates.controller';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [
    DatabaseModule,
    BullModule.registerQueue({
      name: 'template',
    }),
  ],
  controllers: [TemplatesController, ProjectTemplatesController],
  providers: [TemplatesService],
  exports: [TemplatesService],
})
export class TemplatesModule {}

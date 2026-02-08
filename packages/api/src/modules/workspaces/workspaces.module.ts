import { Module, forwardRef } from '@nestjs/common';
import { WorkspacesController, InvitationsController } from './workspaces.controller';
import { WorkspacesService } from './workspaces.service';
import { DatabaseModule } from '../../database/database.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [DatabaseModule, forwardRef(() => NotificationsModule)],
  controllers: [WorkspacesController, InvitationsController],
  providers: [WorkspacesService],
  exports: [WorkspacesService],
})
export class WorkspacesModule {}

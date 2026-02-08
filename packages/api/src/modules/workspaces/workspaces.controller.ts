import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { WorkspacesService } from './workspaces.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WorkspaceRoleGuard } from './guards/workspace-role.guard';
import { WorkspaceRoles } from './decorators/workspace-roles.decorator';
import { WorkspaceRole } from '@prisma/client';

@ApiTags('workspaces')
@Controller('workspaces')
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  // ===============================
  // Workspace CRUD
  // ===============================

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new workspace' })
  @ApiResponse({ status: 201, description: 'Workspace created successfully' })
  async create(@Req() req, @Body() dto: CreateWorkspaceDto) {
    return this.workspacesService.create(req.user.id, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all workspaces for the current user' })
  @ApiResponse({ status: 200, description: 'List of workspaces' })
  async findAll(@Req() req) {
    return this.workspacesService.findAllForUser(req.user.id);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, WorkspaceRoleGuard)
  @WorkspaceRoles(WorkspaceRole.ADMIN, WorkspaceRole.MEMBER, WorkspaceRole.DEPLOYER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get workspace details' })
  @ApiResponse({ status: 200, description: 'Workspace details' })
  async findOne(@Req() req, @Param('id') id: string) {
    return this.workspacesService.findOne(req.user.id, id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, WorkspaceRoleGuard)
  @WorkspaceRoles(WorkspaceRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update workspace (Admin only)' })
  @ApiResponse({ status: 200, description: 'Workspace updated successfully' })
  async update(@Req() req, @Param('id') id: string, @Body() dto: UpdateWorkspaceDto) {
    return this.workspacesService.update(req.user.id, id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, WorkspaceRoleGuard)
  @WorkspaceRoles(WorkspaceRole.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete workspace (Admin only)' })
  @ApiResponse({ status: 204, description: 'Workspace deleted successfully' })
  async remove(@Req() req, @Param('id') id: string) {
    await this.workspacesService.remove(req.user.id, id);
  }

  // ===============================
  // Member Management
  // ===============================

  @Get(':id/members')
  @UseGuards(JwtAuthGuard, WorkspaceRoleGuard)
  @WorkspaceRoles(WorkspaceRole.ADMIN, WorkspaceRole.MEMBER, WorkspaceRole.DEPLOYER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all members of the workspace' })
  @ApiResponse({ status: 200, description: 'List of members' })
  async listMembers(@Req() req, @Param('id') workspaceId: string) {
    return this.workspacesService.listMembers(req.user.id, workspaceId);
  }

  @Patch(':id/members/:memberId')
  @UseGuards(JwtAuthGuard, WorkspaceRoleGuard)
  @WorkspaceRoles(WorkspaceRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update member role (Admin only)' })
  @ApiResponse({ status: 200, description: 'Member role updated' })
  async updateMemberRole(
    @Req() req,
    @Param('id') workspaceId: string,
    @Param('memberId') memberId: string,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    return this.workspacesService.updateMemberRole(req.user.id, workspaceId, memberId, dto);
  }

  @Delete(':id/members/:memberId')
  @UseGuards(JwtAuthGuard, WorkspaceRoleGuard)
  @WorkspaceRoles(WorkspaceRole.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a member from workspace (Admin only)' })
  @ApiResponse({ status: 204, description: 'Member removed' })
  async removeMember(
    @Req() req,
    @Param('id') workspaceId: string,
    @Param('memberId') memberId: string,
  ) {
    await this.workspacesService.removeMember(req.user.id, workspaceId, memberId);
  }

  @Post(':id/leave')
  @UseGuards(JwtAuthGuard, WorkspaceRoleGuard)
  @WorkspaceRoles(WorkspaceRole.ADMIN, WorkspaceRole.MEMBER, WorkspaceRole.DEPLOYER)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Leave a workspace' })
  @ApiResponse({ status: 204, description: 'Successfully left workspace' })
  async leaveWorkspace(@Req() req, @Param('id') workspaceId: string) {
    await this.workspacesService.leaveWorkspace(req.user.id, workspaceId);
  }

  // ===============================
  // Invitation Management
  // ===============================

  @Post(':id/invitations')
  @UseGuards(JwtAuthGuard, WorkspaceRoleGuard)
  @WorkspaceRoles(WorkspaceRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Send an invitation (Admin only)' })
  @ApiResponse({ status: 201, description: 'Invitation sent' })
  async createInvitation(
    @Req() req,
    @Param('id') workspaceId: string,
    @Body() dto: InviteMemberDto,
  ) {
    return this.workspacesService.createInvitation(req.user.id, workspaceId, dto);
  }

  @Get(':id/invitations')
  @UseGuards(JwtAuthGuard, WorkspaceRoleGuard)
  @WorkspaceRoles(WorkspaceRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List pending invitations (Admin only)' })
  @ApiResponse({ status: 200, description: 'List of pending invitations' })
  async listInvitations(@Req() req, @Param('id') workspaceId: string) {
    return this.workspacesService.listInvitations(req.user.id, workspaceId);
  }

  @Delete(':id/invitations/:invitationId')
  @UseGuards(JwtAuthGuard, WorkspaceRoleGuard)
  @WorkspaceRoles(WorkspaceRole.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Cancel an invitation (Admin only)' })
  @ApiResponse({ status: 204, description: 'Invitation cancelled' })
  async cancelInvitation(
    @Req() req,
    @Param('id') workspaceId: string,
    @Param('invitationId') invitationId: string,
  ) {
    await this.workspacesService.cancelInvitation(req.user.id, workspaceId, invitationId);
  }

  // ===============================
  // Audit Logs
  // ===============================

  @Get(':id/audit')
  @UseGuards(JwtAuthGuard, WorkspaceRoleGuard)
  @WorkspaceRoles(WorkspaceRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get workspace audit logs (Admin only)' })
  @ApiResponse({ status: 200, description: 'Audit logs retrieved' })
  async getAuditLogs(
    @Req() req,
    @Param('id') workspaceId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('action') action?: string,
    @Query('resource') resource?: string,
    @Query('userId') userId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.workspacesService.getAuditLogs(workspaceId, {
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0,
      action,
      resource,
      userId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }

  // ===============================
  // Team Activity
  // ===============================

  @Get(':id/team-activity')
  @UseGuards(JwtAuthGuard, WorkspaceRoleGuard)
  @WorkspaceRoles(WorkspaceRole.ADMIN, WorkspaceRole.MEMBER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get team activity per user' })
  @ApiResponse({ status: 200, description: 'Team activity retrieved' })
  async getTeamActivity(
    @Req() req,
    @Param('id') workspaceId: string,
    @Query('userId') userId?: string,
  ) {
    return this.workspacesService.getTeamActivity(workspaceId, userId);
  }
}

// ===============================
// Separate controller for public invitation endpoints
// ===============================

@ApiTags('invitations')
@Controller('invitations')
export class InvitationsController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  @Get(':token')
  @ApiOperation({ summary: 'Get invitation details by token (public)' })
  @ApiResponse({ status: 200, description: 'Invitation details' })
  async getInvitation(@Param('token') token: string) {
    return this.workspacesService.getInvitationByToken(token);
  }

  @Post(':token/accept')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Accept an invitation' })
  @ApiResponse({ status: 201, description: 'Invitation accepted, user added to workspace' })
  async acceptInvitation(@Req() req, @Param('token') token: string) {
    return this.workspacesService.acceptInvitation(req.user.id, token);
  }
}

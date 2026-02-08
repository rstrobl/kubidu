import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class FavoritesService {
  constructor(private prisma: PrismaService) {}

  async getFavorites(userId: string) {
    const favorites = await this.prisma.$queryRaw`
      SELECT fp.id, fp.created_at as "createdAt", 
             p.id as "projectId", p.name as "projectName", p.slug as "projectSlug",
             p.description as "projectDescription",
             w.id as "workspaceId", w.name as "workspaceName", w.slug as "workspaceSlug"
      FROM favorite_projects fp
      JOIN projects p ON p.id = fp.project_id
      JOIN workspaces w ON w.id = p.workspace_id
      WHERE fp.user_id = ${userId}
      ORDER BY fp.created_at DESC
    `;
    
    return favorites;
  }

  async addFavorite(userId: string, projectId: string) {
    // Check if project exists and user has access
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        workspace: {
          include: {
            members: {
              where: { userId },
            },
          },
        },
      },
    });

    if (!project || project.workspace.members.length === 0) {
      throw new NotFoundException('Project not found or access denied');
    }

    // Check if already favorited
    const existing = await this.prisma.$queryRaw`
      SELECT id FROM favorite_projects 
      WHERE user_id = ${userId} AND project_id = ${projectId}
    ` as any[];

    if (existing.length > 0) {
      return { message: 'Already favorited' };
    }

    // Add favorite
    await this.prisma.$executeRaw`
      INSERT INTO favorite_projects (id, user_id, project_id, created_at)
      VALUES (gen_random_uuid(), ${userId}, ${projectId}, NOW())
    `;

    return { message: 'Project added to favorites' };
  }

  async removeFavorite(userId: string, projectId: string) {
    const result = await this.prisma.$executeRaw`
      DELETE FROM favorite_projects 
      WHERE user_id = ${userId} AND project_id = ${projectId}
    `;

    if (result === 0) {
      throw new NotFoundException('Favorite not found');
    }

    return { message: 'Project removed from favorites' };
  }

  async isFavorite(userId: string, projectId: string): Promise<boolean> {
    const result = await this.prisma.$queryRaw`
      SELECT id FROM favorite_projects 
      WHERE user_id = ${userId} AND project_id = ${projectId}
    ` as any[];
    
    return result.length > 0;
  }
}

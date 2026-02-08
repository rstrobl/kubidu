import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { FavoritesService } from './favorites.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('favorites')
@UseGuards(JwtAuthGuard)
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Get()
  async getFavorites(@Request() req) {
    return this.favoritesService.getFavorites(req.user.id);
  }

  @Post(':projectId')
  async addFavorite(@Request() req, @Param('projectId') projectId: string) {
    return this.favoritesService.addFavorite(req.user.id, projectId);
  }

  @Delete(':projectId')
  async removeFavorite(@Request() req, @Param('projectId') projectId: string) {
    return this.favoritesService.removeFavorite(req.user.id, projectId);
  }

  @Get(':projectId/check')
  async isFavorite(@Request() req, @Param('projectId') projectId: string) {
    const isFavorite = await this.favoritesService.isFavorite(req.user.id, projectId);
    return { isFavorite };
  }
}

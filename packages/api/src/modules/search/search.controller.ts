import {
  Controller,
  Get,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { SearchService, SearchResultType } from './search.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('search')
@UseGuards(JwtAuthGuard)
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  async search(
    @Request() req,
    @Query('q') query: string,
    @Query('types') types?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedTypes = types?.split(',').filter(Boolean) as SearchResultType[] | undefined;
    const parsedLimit = limit ? parseInt(limit, 10) : undefined;
    
    return this.searchService.search(
      req.user.id,
      query,
      parsedTypes,
      parsedLimit,
    );
  }

  @Get('suggestions')
  async getSuggestions(
    @Request() req,
    @Query('q') query: string,
  ) {
    return this.searchService.getSuggestions(req.user.id, query);
  }

  @Get('recent')
  async getRecentSearches(@Request() req) {
    return this.searchService.getRecentSearches(req.user.id);
  }
}

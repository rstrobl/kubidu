import { Test, TestingModule } from '@nestjs/testing';
import { SearchController } from '../search.controller';
import { SearchService } from '../search.service';

describe('SearchController', () => {
  let controller: SearchController;
  let searchService: jest.Mocked<SearchService>;

  const mockSearchResults = {
    total: 2,
    results: [
      { id: 'project-123', type: 'project', title: 'Test Project', subtitle: 'Description', icon: '📁', url: '/projects/123' },
      { id: 'service-123', type: 'service', title: 'Test Service', subtitle: 'Description', icon: '⚙️', url: '/services/123' },
    ],
  };

  beforeEach(async () => {
    const mockSearchService = {
      search: jest.fn(),
      getSuggestions: jest.fn(),
      getRecentSearches: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SearchController],
      providers: [
        { provide: SearchService, useValue: mockSearchService },
      ],
    }).compile();

    controller = module.get<SearchController>(SearchController);
    searchService = module.get(SearchService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('search', () => {
    it('should return search results', async () => {
      searchService.search.mockResolvedValue(mockSearchResults as any);

      const result = await controller.search(
        { user: { id: 'user-123' } },
        'test',
        undefined,
        '10',
      );

      expect(result).toEqual(mockSearchResults);
      expect(searchService.search).toHaveBeenCalledWith('user-123', 'test', undefined, 10);
    });

    it('should filter by types', async () => {
      searchService.search.mockResolvedValue({
        total: 1,
        results: [mockSearchResults.results[0]],
      } as any);

      const result = await controller.search(
        { user: { id: 'user-123' } },
        'test',
        'project',
        '10',
      );

      expect(searchService.search).toHaveBeenCalledWith('user-123', 'test', ['project'], 10);
    });
  });

  describe('getSuggestions', () => {
    it('should return search suggestions', async () => {
      const suggestions = ['test project', 'test service'];
      searchService.getSuggestions.mockResolvedValue(suggestions as any);

      const result = await controller.getSuggestions(
        { user: { id: 'user-123' } },
        'test',
      );

      expect(result).toEqual(suggestions);
      expect(searchService.getSuggestions).toHaveBeenCalledWith('user-123', 'test');
    });
  });

  describe('getRecentSearches', () => {
    it('should return recent searches', async () => {
      const recentSearches = ['project', 'service'];
      searchService.getRecentSearches.mockResolvedValue(recentSearches as any);

      const result = await controller.getRecentSearches({ user: { id: 'user-123' } });

      expect(result).toEqual(recentSearches);
      expect(searchService.getRecentSearches).toHaveBeenCalledWith('user-123');
    });
  });
});

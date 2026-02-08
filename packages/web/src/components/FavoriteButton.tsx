import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../services/api.service';
import confetti from 'canvas-confetti';

interface FavoriteButtonProps {
  projectId: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  onToggle?: (isFavorite: boolean) => void;
}

export function FavoriteButton({ 
  projectId, 
  size = 'md', 
  showLabel = false,
  onToggle 
}: FavoriteButtonProps) {
  const queryClient = useQueryClient();
  const [isAnimating, setIsAnimating] = useState(false);

  // Check if project is favorited
  const { data: favoriteStatus, isLoading } = useQuery({
    queryKey: ['favorite', projectId],
    queryFn: () => apiService.isFavorite(projectId),
    staleTime: 30000,
  });

  const isFavorite = favoriteStatus?.isFavorite ?? false;

  // Add favorite mutation
  const addFavorite = useMutation({
    mutationFn: () => apiService.addFavorite(projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorite', projectId] });
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
      setIsAnimating(true);
      
      // Celebration confetti 🎉
      confetti({
        particleCount: 30,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#FFD700', '#FFA500', '#FF6347'],
        scalar: 0.8,
      });
      
      setTimeout(() => setIsAnimating(false), 300);
      onToggle?.(true);
    },
  });

  // Remove favorite mutation
  const removeFavorite = useMutation({
    mutationFn: () => apiService.removeFavorite(projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorite', projectId] });
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
      onToggle?.(false);
    },
  });

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isFavorite) {
      removeFavorite.mutate();
    } else {
      addFavorite.mutate();
    }
  };

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  const buttonClasses = {
    sm: 'p-1',
    md: 'p-1.5',
    lg: 'p-2',
  };

  const isLoaded = !isLoading;
  const isPending = addFavorite.isPending || removeFavorite.isPending;

  return (
    <button
      onClick={handleClick}
      disabled={isPending || !isLoaded}
      className={`
        ${buttonClasses[size]}
        inline-flex items-center gap-1.5
        rounded-lg transition-all duration-200
        ${isFavorite 
          ? 'text-yellow-500 hover:text-yellow-600' 
          : 'text-gray-400 hover:text-yellow-500 dark:text-gray-500 dark:hover:text-yellow-400'
        }
        ${isAnimating ? 'scale-125' : 'scale-100'}
        ${isPending ? 'opacity-50 cursor-wait' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}
        focus:outline-none focus:ring-2 focus:ring-yellow-500/50
      `}
      title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
    >
      <svg
        className={`${sizeClasses[size]} transition-transform duration-200 ${isAnimating ? 'animate-bounce' : ''}`}
        fill={isFavorite ? 'currentColor' : 'none'}
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={isFavorite ? 0 : 2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
        />
      </svg>
      {showLabel && (
        <span className={`text-${size === 'sm' ? 'xs' : 'sm'} font-medium`}>
          {isFavorite ? 'Favorited' : 'Favorite'}
        </span>
      )}
    </button>
  );
}

// Favorites list component
interface FavoritesListProps {
  onSelect?: (projectId: string) => void;
}

export function FavoritesList({ onSelect }: FavoritesListProps) {
  const { data: favorites = [], isLoading } = useQuery({
    queryKey: ['favorites'],
    queryFn: () => apiService.getFavorites(),
  });

  if (isLoading) {
    return (
      <div className="p-4 flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (favorites.length === 0) {
    return (
      <div className="p-6 text-center">
        <div className="text-3xl mb-2">⭐</div>
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          No favorites yet
        </p>
        <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
          Click the star on any project to add it here
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-100 dark:divide-gray-800">
      {favorites.map((fav: any) => (
        <button
          key={fav.id}
          onClick={() => onSelect?.(fav.projectId)}
          className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-left"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-white text-sm font-bold">
            {fav.projectName?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900 dark:text-white truncate">
              {fav.projectName}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {fav.workspaceName}
            </p>
          </div>
          <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      ))}
    </div>
  );
}

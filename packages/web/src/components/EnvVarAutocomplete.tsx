import type { GroupedItems, AutocompleteItem } from '../hooks/useEnvVarAutocomplete';

interface EnvVarAutocompleteProps {
  isOpen: boolean;
  groupedItems: GroupedItems[];
  activeIndex: number;
  onSelect: (item: AutocompleteItem) => void;
}

export function EnvVarAutocomplete({
  isOpen,
  groupedItems,
  activeIndex,
  onSelect,
}: EnvVarAutocompleteProps) {
  if (!isOpen) return null;

  // Build a flat index counter to match activeIndex
  let flatIndex = 0;

  return (
    <div
      className="absolute z-50 left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto"
      style={{ top: '100%', marginTop: '2px' }}
    >
      {groupedItems.length === 0 ? (
        <div className="px-3 py-2 text-sm text-gray-500">
          No shareable variables found
        </div>
      ) : (
        groupedItems.map((group) => (
          <div key={group.serviceName}>
            <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide bg-gray-50 sticky top-0">
              {group.serviceName}
            </div>
            {group.items.map((item) => {
              const currentIndex = flatIndex++;
              const isActive = currentIndex === activeIndex;
              return (
                <div
                  key={`${item.serviceId}-${item.key}`}
                  className={`flex items-center justify-between px-3 py-1.5 cursor-pointer ${
                    isActive ? 'bg-primary-50' : 'hover:bg-gray-50'
                  }`}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onSelect(item);
                  }}
                >
                  <span className="font-mono text-sm text-gray-900">{item.key}</span>
                  {item.isSystem ? (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
                      System
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-teal-100 text-teal-700">
                      Shared
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ))
      )}
    </div>
  );
}

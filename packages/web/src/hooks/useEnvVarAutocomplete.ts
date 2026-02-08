import { useState, useCallback, useEffect, useRef } from 'react';

export interface AutocompleteItem {
  serviceName: string;
  key: string;
  isSystem: boolean;
  isShared: boolean;
  serviceId: string;
}

export interface GroupedItems {
  serviceName: string;
  items: AutocompleteItem[];
}

interface UseEnvVarAutocompleteOptions {
  sharedVars: any[];
  inputRef: React.RefObject<HTMLInputElement | HTMLTextAreaElement | null>;
}

interface UseEnvVarAutocompleteReturn {
  isOpen: boolean;
  groupedItems: GroupedItems[];
  activeIndex: number;
  filterText: string;
  handleKeyDown: (e: React.KeyboardEvent) => void;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  selectItem: (item: AutocompleteItem) => void;
  close: () => void;
}

export function useEnvVarAutocomplete({
  sharedVars,
  inputRef,
}: UseEnvVarAutocompleteOptions): UseEnvVarAutocompleteReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [filterText, setFilterText] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const triggerPos = useRef<number>(-1);

  // Build flat list of all shareable items
  const allItems: AutocompleteItem[] = [];
  for (const source of sharedVars) {
    for (const v of source.variables) {
      allItems.push({
        serviceName: source.serviceName,
        key: v.key,
        isSystem: v.isSystem,
        isShared: v.isShared,
        serviceId: source.serviceId,
      });
    }
  }

  // Filter items based on filterText (match against "ServiceName.KEY")
  const filtered = allItems.filter((item) => {
    if (!filterText) return true;
    const combined = `${item.serviceName}.${item.key}`.toLowerCase();
    const parts = filterText.toLowerCase().split('.');
    if (parts.length > 1) {
      return combined.includes(filterText.toLowerCase());
    }
    // Match on either service name or key independently
    return (
      item.serviceName.toLowerCase().includes(filterText.toLowerCase()) ||
      item.key.toLowerCase().includes(filterText.toLowerCase())
    );
  });

  // Group filtered items by service name
  const groupedItems: GroupedItems[] = [];
  const groupMap = new Map<string, AutocompleteItem[]>();
  for (const item of filtered) {
    let group = groupMap.get(item.serviceName);
    if (!group) {
      group = [];
      groupMap.set(item.serviceName, group);
    }
    group.push(item);
  }
  for (const [serviceName, items] of groupMap) {
    groupedItems.push({ serviceName, items });
  }

  // Flat list for keyboard navigation
  const flatFiltered = groupedItems.flatMap((g) => g.items);

  // Detect trigger: scan backward from cursor for `${{` without closing `}}`
  const detectTrigger = useCallback(
    (value: string, cursorPos: number) => {
      // Look backward from cursor for `${{`
      const before = value.slice(0, cursorPos);
      const lastTrigger = before.lastIndexOf('${{');
      if (lastTrigger === -1) {
        setIsOpen(false);
        return;
      }

      // Check if there's a closing `}}` between trigger and cursor
      const afterTrigger = value.slice(lastTrigger, cursorPos);
      if (afterTrigger.includes('}}')) {
        setIsOpen(false);
        return;
      }

      // We have an open trigger
      triggerPos.current = lastTrigger;
      const text = value.slice(lastTrigger + 3, cursorPos);
      setFilterText(text);
      setIsOpen(true);
      setActiveIndex(0);
    },
    [],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const el = e.target;
      const value = el.value;
      const cursorPos = el.selectionStart ?? value.length;

      // Use requestAnimationFrame to ensure cursor position is available
      requestAnimationFrame(() => {
        detectTrigger(value, cursorPos);
      });
    },
    [detectTrigger],
  );

  const insertToken = useCallback(
    (item: AutocompleteItem) => {
      const el = inputRef.current;
      if (!el || triggerPos.current === -1) return;

      const value = el.value;
      const token = `\${{${item.serviceName}.${item.key}}}`;
      const before = value.slice(0, triggerPos.current);
      const cursorPos = el.selectionStart ?? value.length;
      const after = value.slice(cursorPos);
      const newValue = before + token + after;
      const newCursorPos = before.length + token.length;

      // Trigger a native input change via setter + event dispatch
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value',
      )?.set || Object.getOwnPropertyDescriptor(
        window.HTMLTextAreaElement.prototype,
        'value',
      )?.set;

      if (nativeInputValueSetter) {
        nativeInputValueSetter.call(el, newValue);
      }

      const event = new Event('input', { bubbles: true });
      el.dispatchEvent(event);

      // Restore cursor position
      requestAnimationFrame(() => {
        el.setSelectionRange(newCursorPos, newCursorPos);
        el.focus();
      });

      setIsOpen(false);
      triggerPos.current = -1;
    },
    [inputRef],
  );

  const selectItem = useCallback(
    (item: AutocompleteItem) => {
      insertToken(item);
    },
    [insertToken],
  );

  const close = useCallback(() => {
    setIsOpen(false);
    triggerPos.current = -1;
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((prev) => (prev + 1) % Math.max(flatFiltered.length, 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((prev) => (prev - 1 + flatFiltered.length) % Math.max(flatFiltered.length, 1));
      } else if (e.key === 'Enter') {
        if (flatFiltered.length > 0 && activeIndex < flatFiltered.length) {
          e.preventDefault();
          insertToken(flatFiltered[activeIndex]);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        close();
      } else if (e.key === 'Tab') {
        close();
      }
    },
    [isOpen, flatFiltered, activeIndex, insertToken, close],
  );

  // Click-outside dismissal
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      const el = inputRef.current;
      if (el && !el.contains(e.target as Node)) {
        close();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen, inputRef, close]);

  return {
    isOpen,
    groupedItems,
    activeIndex,
    filterText,
    handleKeyDown,
    handleInputChange,
    selectItem,
    close,
  };
}

import { useState, useEffect, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';

interface ShortcutGroup {
  name: string;
  shortcuts: Array<{
    keys: string[];
    description: string;
  }>;
}

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    name: 'Navigation',
    shortcuts: [
      { keys: ['⌘', 'K'], description: 'Open Command Palette' },
      { keys: ['G', 'P'], description: 'Go to Projects' },
      { keys: ['G', 'S'], description: 'Go to Settings' },
      { keys: ['G', 'N'], description: 'Go to Notifications' },
      { keys: ['ESC'], description: 'Close modal / Go back' },
    ],
  },
  {
    name: 'Project Actions',
    shortcuts: [
      { keys: ['N'], description: 'New Project' },
      { keys: ['A'], description: 'Add Service' },
      { keys: ['D'], description: 'Deploy selected service' },
      { keys: ['L'], description: 'View Logs' },
      { keys: ['E'], description: 'Edit Environment Variables' },
    ],
  },
  {
    name: 'Canvas',
    shortcuts: [
      { keys: ['Space'], description: 'Pan canvas (hold)' },
      { keys: ['⌘', '+'], description: 'Zoom in' },
      { keys: ['⌘', '-'], description: 'Zoom out' },
      { keys: ['⌘', '0'], description: 'Reset zoom' },
      { keys: ['Delete'], description: 'Delete selected service' },
    ],
  },
  {
    name: 'General',
    shortcuts: [
      { keys: ['?'], description: 'Show this help' },
      { keys: ['/'], description: 'Focus search' },
      { keys: ['⌘', 'Shift', 'D'], description: 'Toggle dark mode' },
    ],
  },
];

export function KeyboardShortcuts() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Show shortcuts modal on '?'
      if (e.key === '?' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const target = e.target as HTMLElement;
        // Don't trigger if typing in an input
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
          return;
        }
        e.preventDefault();
        setIsOpen(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-[100]" onClose={setIsOpen}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto p-4 sm:p-6 md:p-20">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <Dialog.Panel className="mx-auto max-w-2xl transform rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 transition-all overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-primary-600 to-success-600 px-6 py-4">
                <Dialog.Title as="h3" className="text-lg font-bold text-white flex items-center gap-2">
                  <span className="text-xl">⌨️</span>
                  Keyboard Shortcuts
                </Dialog.Title>
                <p className="text-primary-100 text-sm mt-1">
                  Navigate faster with these shortcuts
                </p>
              </div>

              {/* Content */}
              <div className="p-6 max-h-[60vh] overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {SHORTCUT_GROUPS.map((group) => (
                    <div key={group.name}>
                      <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
                        {group.name}
                      </h4>
                      <div className="space-y-2">
                        {group.shortcuts.map((shortcut, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50"
                          >
                            <span className="text-sm text-gray-600">
                              {shortcut.description}
                            </span>
                            <div className="flex items-center gap-1">
                              {shortcut.keys.map((key, j) => (
                                <Fragment key={j}>
                                  <kbd className="inline-flex items-center justify-center min-w-[24px] h-6 px-2 text-xs font-medium text-gray-600 bg-gray-100 rounded border border-gray-200 shadow-sm">
                                    {key}
                                  </kbd>
                                  {j < shortcut.keys.length - 1 && (
                                    <span className="text-gray-400 text-xs">+</span>
                                  )}
                                </Fragment>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="bg-gray-50 px-6 py-4 flex justify-between items-center border-t border-gray-100">
                <p className="text-xs text-gray-500">
                  Press <kbd className="px-1.5 py-0.5 text-xs bg-white rounded border border-gray-200">?</kbd> anytime to see this
                </p>
                <button
                  onClick={() => setIsOpen(false)}
                  className="btn btn-sm btn-secondary"
                >
                  Close
                </button>
              </div>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition.Root>
  );
}

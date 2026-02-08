import { useState, useEffect, useRef } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { toast } from 'sonner';

type BadgeStyle = 'default' | 'dark' | 'minimal' | 'large';
type BadgeFormat = 'svg' | 'markdown' | 'html';

interface BadgeConfig {
  style: BadgeStyle;
  customText?: string;
  showCO2?: boolean;
  co2Saved?: number;
}

const BADGE_STYLES: Record<BadgeStyle, { name: string; preview: string }> = {
  default: {
    name: 'Default (Green)',
    preview: 'Green background, white text',
  },
  dark: {
    name: 'Dark Mode',
    preview: 'Dark background, green accent',
  },
  minimal: {
    name: 'Minimal',
    preview: 'Transparent with border',
  },
  large: {
    name: 'Large Banner',
    preview: 'Full-width banner style',
  },
};

export function GreenBadge({ co2Saved = 36.8 }: { co2Saved?: number }) {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState<BadgeConfig>({
    style: 'default',
    showCO2: true,
    co2Saved,
  });
  const [format, setFormat] = useState<BadgeFormat>('svg');

  // Listen for open event from CO2Dashboard
  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener('open-badge-generator', handleOpen);
    return () => window.removeEventListener('open-badge-generator', handleOpen);
  }, []);

  const generateSVG = (style: BadgeStyle, showCO2: boolean, savedAmount: number): string => {
    const styles: Record<BadgeStyle, { bg: string; text: string; accent: string; width: number; height: number }> = {
      default: { bg: '#16A34A', text: '#FFFFFF', accent: '#4ADE80', width: 200, height: 40 },
      dark: { bg: '#0A1F0A', text: '#FFFFFF', accent: '#16A34A', width: 200, height: 40 },
      minimal: { bg: 'transparent', text: '#16A34A', accent: '#16A34A', width: 200, height: 40 },
      large: { bg: '#16A34A', text: '#FFFFFF', accent: '#4ADE80', width: 300, height: 60 },
    };

    const s = styles[style];
    const co2Text = showCO2 ? ` • ${savedAmount.toFixed(1)}kg CO₂ saved` : '';
    const mainText = style === 'large' ? 'Powered by 100% Renewable Energy' : '🌱 Powered by Kubidu';

    if (style === 'large') {
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${s.width}" height="${s.height}" viewBox="0 0 ${s.width} ${s.height}">
  <rect width="${s.width}" height="${s.height}" rx="8" fill="${s.bg}"/>
  <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="${s.text}" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="600">${mainText}${co2Text}</text>
</svg>`;
    }

    const border = style === 'minimal' ? `stroke="${s.accent}" stroke-width="2"` : '';

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${s.width}" height="${s.height}" viewBox="0 0 ${s.width} ${s.height}">
  <rect width="${s.width}" height="${s.height}" rx="6" fill="${s.bg}" ${border}/>
  <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="${s.text}" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="500">${mainText}${co2Text}</text>
</svg>`;
  };

  const getEmbedCode = (): string => {
    const svg = generateSVG(config.style, config.showCO2 || false, config.co2Saved || 0);
    const encoded = encodeURIComponent(svg);
    const dataUrl = `data:image/svg+xml,${encoded}`;

    switch (format) {
      case 'svg':
        return svg;
      case 'markdown':
        return `[![Powered by Kubidu - 100% Renewable Energy](${dataUrl})](https://kubidu.app)`;
      case 'html':
        return `<a href="https://kubidu.app" target="_blank" rel="noopener noreferrer">
  <img src="${dataUrl}" alt="Powered by Kubidu - 100% Renewable Energy" />
</a>`;
      default:
        return svg;
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(getEmbedCode());
      toast.success('Badge code copied to clipboard!');
    } catch {
      toast.error('Failed to copy to clipboard');
    }
  };

  const downloadSVG = () => {
    const svg = generateSVG(config.style, config.showCO2 || false, config.co2Saved || 0);
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kubidu-green-badge-${config.style}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Badge downloaded!');
  };

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-primary-50 text-primary-700 rounded-lg hover:bg-primary-100 transition-colors border border-primary-200"
      >
        <span className="text-lg">🏷️</span>
        <span className="font-medium">Get Green Badge</span>
      </button>

      <Transition.Root show={isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={setIsOpen}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity" />
          </Transition.Child>

          <div className="fixed inset-0 z-10 overflow-y-auto">
            <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                enterTo="opacity-100 translate-y-0 sm:scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              >
                <Dialog.Panel className="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl">
                  {/* Header */}
                  <div className="bg-gradient-to-r from-primary-600 to-success-600 px-6 py-4">
                    <Dialog.Title as="h3" className="text-lg font-bold text-white flex items-center gap-2">
                      <span className="text-2xl">🏷️</span>
                      Green Badge Generator
                    </Dialog.Title>
                    <p className="text-primary-100 text-sm mt-1">
                      Show your commitment to sustainability with an embeddable badge
                    </p>
                  </div>

                  <div className="px-6 py-5">
                    {/* Preview */}
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Preview</label>
                      <div className="flex items-center justify-center p-8 bg-gray-100 rounded-xl border-2 border-dashed border-gray-200">
                        <div
                          dangerouslySetInnerHTML={{
                            __html: generateSVG(config.style, config.showCO2 || false, config.co2Saved || 0),
                          }}
                        />
                      </div>
                    </div>

                    {/* Style Selection */}
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Badge Style</label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {(Object.keys(BADGE_STYLES) as BadgeStyle[]).map((style) => (
                          <button
                            key={style}
                            onClick={() => setConfig({ ...config, style })}
                            className={`p-3 rounded-lg border-2 text-left transition-all ${
                              config.style === style
                                ? 'border-primary-500 bg-primary-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <div className="text-sm font-medium text-gray-900">{BADGE_STYLES[style].name}</div>
                            <div className="text-xs text-gray-500 mt-0.5">{BADGE_STYLES[style].preview}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Options */}
                    <div className="mb-6">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={config.showCO2}
                          onChange={(e) => setConfig({ ...config, showCO2: e.target.checked })}
                          className="w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                        />
                        <span className="text-sm text-gray-700">Show CO₂ saved ({config.co2Saved?.toFixed(1)}kg)</span>
                      </label>
                    </div>

                    {/* Format Selection */}
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Embed Format</label>
                      <div className="flex gap-2">
                        {(['svg', 'markdown', 'html'] as BadgeFormat[]).map((f) => (
                          <button
                            key={f}
                            onClick={() => setFormat(f)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                              format === f
                                ? 'bg-primary-100 text-primary-700'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            {f.toUpperCase()}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Code Preview */}
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Embed Code</label>
                      <div className="relative">
                        <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-xs overflow-x-auto max-h-40">
                          <code>{getEmbedCode()}</code>
                        </pre>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col sm:flex-row gap-3">
                      <button
                        onClick={copyToClipboard}
                        className="flex-1 btn btn-primary flex items-center justify-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        Copy to Clipboard
                      </button>
                      <button
                        onClick={downloadSVG}
                        className="flex-1 btn btn-secondary flex items-center justify-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Download SVG
                      </button>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="bg-gray-50 px-6 py-4 flex justify-between items-center">
                    <p className="text-xs text-gray-500">
                      🌍 Help spread the word about sustainable hosting
                    </p>
                    <button
                      onClick={() => setIsOpen(false)}
                      className="text-sm text-gray-500 hover:text-gray-700"
                    >
                      Close
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition.Root>
    </>
  );
}

// Inline badge component for display in dashboards
export function GreenBadgeInline({ style = 'default' }: { style?: BadgeStyle }) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="32" viewBox="0 0 160 32">
    <rect width="160" height="32" rx="6" fill="#16A34A"/>
    <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#FFFFFF" font-family="system-ui" font-size="11" font-weight="500">🌱 Powered by Kubidu</text>
  </svg>`;

  return (
    <div
      className="inline-block"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

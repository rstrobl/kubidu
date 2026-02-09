import { useState } from 'react';

interface EnvVarValueDisplayProps {
  value: string | null | undefined;
  isSecret: boolean;
  /** Map of "ServiceName.KEY" → resolved value for showing referenced values */
  resolvedValues?: Record<string, string>;
}

const TOKEN_REGEX = /(\$\{\{[^}]+\}\})/g;

export function EnvVarValueDisplay({ value, isSecret, resolvedValues }: EnvVarValueDisplayProps) {
  const [showSecret, setShowSecret] = useState(false);

  if (isSecret && !showSecret) {
    return (
      <span className="text-sm text-gray-500 font-mono inline-flex items-center gap-2">
        <span>••••••••</span>
        <button
          type="button"
          onClick={() => setShowSecret(true)}
          className="text-gray-400 hover:text-gray-600 transition-colors"
          title="Show secret value"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        </button>
      </span>
    );
  }

  if (isSecret && showSecret) {
    return (
      <span className="text-sm text-gray-500 font-mono inline-flex items-center gap-2">
        <span className="truncate">{value || 'Value set'}</span>
        <button
          type="button"
          onClick={() => setShowSecret(false)}
          className="text-gray-400 hover:text-gray-600 transition-colors"
          title="Hide secret value"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
          </svg>
        </button>
      </span>
    );
  }

  if (!value) {
    return <span className="text-sm text-gray-400">Value set</span>;
  }

  // Check if value contains any tokens
  const parts = value.split(TOKEN_REGEX);
  if (parts.length === 1) {
    // No tokens, return plain text
    return <span className="text-sm text-gray-500 font-mono truncate">{value}</span>;
  }

  return (
    <span className="text-sm font-mono truncate inline-flex items-center gap-1 flex-wrap">
      {parts.map((part, i) => {
        if (TOKEN_REGEX.test(part)) {
          // Reset lastIndex since we reuse the regex
          TOKEN_REGEX.lastIndex = 0;
          // Extract the inner reference text (strip ${{ and }})
          const inner = part.slice(3, -2);
          const resolved = resolvedValues?.[inner];
          const tooltip = resolved
            ? `${inner} = ${resolved}`
            : inner;
          return (
            <span
              key={i}
              className="group/pill relative inline-flex items-center px-1.5 py-0.5 rounded bg-teal-100 text-teal-800 border border-teal-200 text-xs font-mono whitespace-nowrap cursor-default"
              title={tooltip}
            >
              {inner}
              {resolved && (
                <span className="ml-1.5 pl-1.5 border-l border-teal-300 text-teal-600 max-w-[180px] truncate">
                  {resolved}
                </span>
              )}
            </span>
          );
        }
        if (!part) return null;
        return (
          <span key={i} className="text-gray-500">
            {part}
          </span>
        );
      })}
    </span>
  );
}

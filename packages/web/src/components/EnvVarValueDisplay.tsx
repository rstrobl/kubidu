interface EnvVarValueDisplayProps {
  value: string | null | undefined;
  isSecret: boolean;
  /** Map of "ServiceName.KEY" → resolved value for showing referenced values */
  resolvedValues?: Record<string, string>;
}

const TOKEN_REGEX = /(\$\{\{[^}]+\}\})/g;

export function EnvVarValueDisplay({ value, isSecret, resolvedValues }: EnvVarValueDisplayProps) {
  if (isSecret) {
    return <span className="text-sm text-gray-500 font-mono">••••••••</span>;
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

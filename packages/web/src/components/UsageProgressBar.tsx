interface UsageProgressBarProps {
  label: string;
  used: string;
  limit: string;
  percentage: number;
  unlimited?: boolean;
}

export function UsageProgressBar({ label, used, limit, percentage, unlimited }: UsageProgressBarProps) {
  const clampedPercentage = Math.min(percentage, 100);

  let barColor = 'bg-green-500';
  if (percentage >= 85) {
    barColor = 'bg-red-500';
  } else if (percentage >= 60) {
    barColor = 'bg-yellow-500';
  }

  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-700 font-medium">{label}</span>
        <span className="text-gray-500">
          {used} / {unlimited ? 'Unlimited' : limit}
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        {unlimited ? (
          <div
            className="bg-green-500 h-2.5 rounded-full"
            style={{ width: `${Math.min(clampedPercentage, 30)}%` }}
          />
        ) : (
          <div
            className={`${barColor} h-2.5 rounded-full transition-all duration-300`}
            style={{ width: `${clampedPercentage}%` }}
          />
        )}
      </div>
    </div>
  );
}

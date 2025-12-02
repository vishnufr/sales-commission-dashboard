type LeaderboardRow = {
  id: string;
  closerName: string;
  revenue: number;
  commission: number;
  dealsWon: number;
};

type Props = {
  leaderboard: LeaderboardRow[];
};

function formatCurrency(v: number) {
  return v.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  });
}

export function Leaderboard({ leaderboard }: Props) {
  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
      <h2 className="text-sm font-medium mb-3">Closer leaderboard</h2>
      <div className="space-y-2">
        {leaderboard.map((row, idx) => (
          <div
            key={row.id}
            className="flex items-center justify-between text-xs bg-slate-950/60 rounded-xl px-3 py-2"
          >
            <div className="flex items-center gap-3">
              <span className="w-6 text-center text-slate-400">
                #{idx + 1}
              </span>
              <div>
                <p className="font-medium">{row.closerName}</p>
                <p className="text-[11px] text-slate-500">
                  {row.dealsWon} won • {formatCurrency(row.commission)} commission
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold">
                {formatCurrency(row.revenue)}
              </p>
              <p className="text-[11px] text-slate-500">Revenue</p>
            </div>
          </div>
        ))}

        {leaderboard.length === 0 && (
          <p className="text-xs text-slate-500">
            No data for this filter.
          </p>
        )}
      </div>
    </div>
  );
}

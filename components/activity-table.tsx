// components/activity-table.tsx
import { CallRecord } from "@/lib/types";

type Props = {
  calls: CallRecord[];
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function pillColor(status: string) {
  switch (status) {
    case "closed_won":
      return "bg-emerald-500/10 text-emerald-300 border-emerald-500/40";
    case "closed_lost":
      return "bg-rose-500/10 text-rose-300 border-rose-500/40";
    case "follow_up":
      return "bg-amber-500/10 text-amber-300 border-amber-500/40";
    case "unqualified":
      return "bg-slate-500/10 text-slate-200 border-slate-500/40";
    default:
      return "bg-slate-500/10 text-slate-200 border-slate-500/40";
  }
}

export function ActivityTable({ calls }: Props) {
  // Sort newest first, but still respect whatever filters the parent applied
  const sorted = [...calls].sort(
    (a, b) =>
      new Date(b.callAt).getTime() - new Date(a.callAt).getTime()
  );

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-medium">Recent calls & deals</h2>
        <p className="text-[11px] text-slate-500">
          Showing latest {sorted.length} records
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="text-slate-400 border-b border-slate-800">
            <tr>
              <th className="text-left py-2">Date</th>
              <th className="text-left py-2">Closer</th>
              <th className="text-left py-2">Source</th>
              <th className="text-left py-2">Call status</th>
              <th className="text-left py-2">Deal stage</th>
              <th className="text-right py-2">Amount</th>
              <th className="text-right py-2">Commission</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(c => (
              <tr
                key={c.id + c.callAt}
                className="border-b border-slate-900/80"
              >
                <td className="py-2 pr-2 whitespace-nowrap">
                  {formatDateTime(c.callAt)}
                </td>
                <td className="py-2 pr-2 whitespace-nowrap">
                  {c.closerName}
                </td>
                <td className="py-2 pr-2 whitespace-nowrap">
                  {c.bookingSource}
                </td>
                <td className="py-2 pr-2 whitespace-nowrap capitalize">
                  {c.callStatus.replace("_", " ")}
                </td>
                <td className="py-2 pr-2">
                  <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize ${pillColor(
                      c.dealStage
                    )}`}
                  >
                    {c.dealStage.replace("_", " ")}
                  </span>
                </td>
                <td className="py-2 text-right">
                  {c.amount != null ? `$${c.amount.toLocaleString()}` : "-"}
                </td>
                <td className="py-2 text-right">
                  {c.commissionAmount != null
                    ? `$${c.commissionAmount.toLocaleString()}`
                    : "-"}
                </td>
              </tr>
            ))}

            {sorted.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="py-6 text-center text-slate-500"
                >
                  No activity for this filter yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

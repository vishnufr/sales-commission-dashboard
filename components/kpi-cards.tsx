import { KpiSummary } from "@/lib/analytics";

type Props = {
  kpis: KpiSummary;
  totalRecords: number;
};

function formatCurrency(v: number) {
  return v.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  });
}

export function KpiCards({ kpis, totalRecords }: Props) {
  const cards = [
    {
      label: "Total revenue (closed won)",
      value: formatCurrency(kpis.totalRevenue),
      sub: `${kpis.dealsWon} deals won`
    },
    {
      label: "Total commissions",
      value: formatCurrency(kpis.totalCommission),
      sub: "Assuming 10% per closed won"
    },
    {
      label: "Close rate",
      value: `${(kpis.closeRate * 100).toFixed(1)}%`,
      sub: `${kpis.dealsWon} / ${totalRecords} total calls`
    },
    {
      label: "Avg deal size",
      value: kpis.avgDealSize ? formatCurrency(kpis.avgDealSize) : "-",
      sub: "Closed won only"
    }
  ];

  return (
    <div className="grid gap-4 md:grid-cols-4">
      {cards.map(card => (
        <div
          key={card.label}
          className="bg-slate-900/60 border border-slate-800 rounded-2xl px-4 py-3"
        >
          <p className="text-xs text-slate-400 mb-1">{card.label}</p>
          <p className="text-lg font-semibold">{card.value}</p>
          <p className="text-xs text-slate-500 mt-1">{card.sub}</p>
        </div>
      ))}
    </div>
  );
}

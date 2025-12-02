// app/coaching/page.tsx
"use client";

import { useMemo, useState } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { FiltersBar } from "@/components/filters-bar";
import { generateSampleCalls } from "@/lib/sample-data";
import {
  getTimeOfDayBucket,
  getDayOfWeekKey
} from "@/lib/analytics";
import type {
  CallRecord,
  AppointmentType,
  BookingSource,
  NurtureType
} from "@/lib/types";

type TimeOfDayFilter =
  | "all"
  | "morning"
  | "afternoon"
  | "evening"
  | "night";
type DayOfWeekFilter =
  | "all"
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";
type AppointmentTypeFilter = "all" | AppointmentType;
type BookingSourceFilter = "all" | BookingSource;
type NurtureTypeFilter = "all" | NurtureType;

const ALL_CALLS: CallRecord[] = generateSampleCalls();

// Fixed "now" to keep calculations deterministic (no hydration issues)
const FIXED_NOW = new Date("2025-01-01T15:00:00Z");
const DAY_MS = 24 * 60 * 60 * 1000;

function formatPercent(v: number) {
  return `${(v * 100).toFixed(1)}%`;
}

function formatCurrency(v: number) {
  return v.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  });
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

// ---------- Closer scorecards ----------
type CloserScorecard = {
  closerId: string;
  closerName: string;
  totalCalls: number;
  totalShows: number;
  totalNoShows: number;
  totalCancelled: number;
  closeRate: number;
  showRate: number;
  revenue: number;
  revenuePerAppt: number;
  revenuePerShow: number;
};

function computeCloserScorecards(
  calls: CallRecord[]
): CloserScorecard[] {
  const agg: Record<string, CloserScorecard> = {};

  for (const c of calls) {
    if (!agg[c.closerId]) {
      agg[c.closerId] = {
        closerId: c.closerId,
        closerName: c.closerName,
        totalCalls: 0,
        totalShows: 0,
        totalNoShows: 0,
        totalCancelled: 0,
        closeRate: 0,
        showRate: 0,
        revenue: 0,
        revenuePerAppt: 0,
        revenuePerShow: 0
      };
    }

    const entry = agg[c.closerId];
    entry.totalCalls += 1;
    if (c.callStatus === "show") entry.totalShows += 1;
    if (c.callStatus === "no_show") entry.totalNoShows += 1;
    if (c.callStatus === "cancelled") entry.totalCancelled += 1;
    if (c.dealStage === "closed_won" && c.amount) {
      entry.revenue += c.amount;
    }
  }

  const result: CloserScorecard[] = [];

  for (const closerId in agg) {
    if (!Object.prototype.hasOwnProperty.call(agg, closerId)) continue;
    const entry = agg[closerId];

    const wonCount = calls.filter(
      c =>
        c.closerId === closerId &&
        c.dealStage === "closed_won"
    ).length;

    entry.closeRate =
      entry.totalCalls > 0 ? wonCount / entry.totalCalls : 0;
    entry.showRate =
      entry.totalCalls > 0
        ? entry.totalShows / entry.totalCalls
        : 0;
    entry.revenuePerAppt =
      entry.totalCalls > 0
        ? entry.revenue / entry.totalCalls
        : 0;
    entry.revenuePerShow =
      entry.totalShows > 0
        ? entry.revenue / entry.totalShows
        : 0;

    result.push(entry);
  }

  return result.sort((a, b) => b.revenue - a.revenue);
}

// ---------- Nurture conversion ----------
type NurtureConversion = {
  nurtureType: NurtureType;
  total: number;
  shows: number;
  closedWon: number;
  revenue: number;
  showRate: number;
  closeRate: number;
};

function computeNurtureConversion(
  calls: CallRecord[]
): NurtureConversion[] {
  const agg: Record<NurtureType, NurtureConversion> = {
    redzone: {
      nurtureType: "redzone",
      total: 0,
      shows: 0,
      closedWon: 0,
      revenue: 0,
      showRate: 0,
      closeRate: 0
    },
    short_term: {
      nurtureType: "short_term",
      total: 0,
      shows: 0,
      closedWon: 0,
      revenue: 0,
      showRate: 0,
      closeRate: 0
    },
    long_term: {
      nurtureType: "long_term",
      total: 0,
      shows: 0,
      closedWon: 0,
      revenue: 0,
      showRate: 0,
      closeRate: 0
    }
  };

  for (const c of calls) {
    const entry = agg[c.nurtureType];
    entry.total += 1;
    if (c.callStatus === "show") entry.shows += 1;
    if (c.dealStage === "closed_won") {
      entry.closedWon += 1;
      if (c.amount) entry.revenue += c.amount;
    }
  }

  for (const key in agg) {
    const entry = agg[key as NurtureType];
    entry.showRate = entry.total
      ? entry.shows / entry.total
      : 0;
    entry.closeRate = entry.total
      ? entry.closedWon / entry.total
      : 0;
  }

  return [
    agg.redzone,
    agg.short_term,
    agg.long_term
  ];
}

// ---------- Lead source × nurture matrix ----------
type MatrixCell = {
  total: number;
  closedWon: number;
  closeRate: number;
};

function computeLeadSourceNurtureMatrix(calls: CallRecord[]) {
  const sources: BookingSource[] = [
    "Organic",
    "Paid Ads",
    "Triage",
    "Referral"
  ];
  const nurtures: NurtureType[] = [
    "redzone",
    "short_term",
    "long_term"
  ];

  const matrix: Record<
    NurtureType,
    Record<BookingSource, MatrixCell>
  > = {
    redzone: {
      Organic: { total: 0, closedWon: 0, closeRate: 0 },
      "Paid Ads": { total: 0, closedWon: 0, closeRate: 0 },
      Triage: { total: 0, closedWon: 0, closeRate: 0 },
      Referral: { total: 0, closedWon: 0, closeRate: 0 }
    },
    short_term: {
      Organic: { total: 0, closedWon: 0, closeRate: 0 },
      "Paid Ads": { total: 0, closedWon: 0, closeRate: 0 },
      Triage: { total: 0, closedWon: 0, closeRate: 0 },
      Referral: { total: 0, closedWon: 0, closeRate: 0 }
    },
    long_term: {
      Organic: { total: 0, closedWon: 0, closeRate: 0 },
      "Paid Ads": { total: 0, closedWon: 0, closeRate: 0 },
      Triage: { total: 0, closedWon: 0, closeRate: 0 },
      Referral: { total: 0, closedWon: 0, closeRate: 0 }
    }
  };

  for (const c of calls) {
    const cell = matrix[c.nurtureType][c.bookingSource];
    cell.total += 1;
    if (c.dealStage === "closed_won") {
      cell.closedWon += 1;
    }
  }

  for (const n of nurtures) {
    for (const s of sources) {
      const cell = matrix[n][s];
      cell.closeRate = cell.total
        ? cell.closedWon / cell.total
        : 0;
    }
  }

  return { sources, nurtures, matrix };
}

// ---------- Red flags (30d vs previous 30d) ----------
type RedFlag = {
  closerId: string;
  closerName: string;
  metric: "showRate" | "closeRate";
  previous: number;
  current: number;
  delta: number;
};

function computeRedFlags(calls: CallRecord[]): RedFlag[] {
  const now = FIXED_NOW.getTime();
  const last30Start = now - 30 * DAY_MS;
  const prev30Start = now - 60 * DAY_MS;

  const last30 = calls.filter(c => {
    const ts = new Date(c.callAt).getTime();
    return ts >= last30Start && ts < now;
  });
  const prev30 = calls.filter(c => {
    const ts = new Date(c.callAt).getTime();
    return ts >= prev30Start && ts < last30Start;
  });

  type Agg = {
    closerName: string;
    total: number;
    shows: number;
    closedWon: number;
  };

  const aggregateByCloser = (
    cs: CallRecord[]
  ): Record<string, Agg> => {
    const agg: Record<string, Agg> = {};
    for (const c of cs) {
      if (!agg[c.closerId]) {
        agg[c.closerId] = {
          closerName: c.closerName,
          total: 0,
          shows: 0,
          closedWon: 0
        };
      }
      const entry = agg[c.closerId];
      entry.total += 1;
      if (c.callStatus === "show") entry.shows += 1;
      if (c.dealStage === "closed_won") entry.closedWon += 1;
    }
    return agg;
  };

  const lastByCloser = aggregateByCloser(last30);
  const prevByCloser = aggregateByCloser(prev30);

  const flags: RedFlag[] = [];
  const minCalls = 8;
  const dropThreshold = 0.1; // 10 percentage points

  for (const closerId in prevByCloser) {
    if (!Object.prototype.hasOwnProperty.call(prevByCloser, closerId)) {
      continue;
    }

    const prevStats = prevByCloser[closerId];
    const curStats = lastByCloser[closerId];
    if (!curStats) continue;
    if (prevStats.total < minCalls || curStats.total < minCalls) continue;

    const prevShowRate =
      prevStats.total > 0 ? prevStats.shows / prevStats.total : 0;
    const curShowRate =
      curStats.total > 0 ? curStats.shows / curStats.total : 0;

    const prevCloseRate =
      prevStats.total > 0
        ? prevStats.closedWon / prevStats.total
        : 0;
    const curCloseRate =
      curStats.total > 0
        ? curStats.closedWon / curStats.total
        : 0;

    const showDrop = prevShowRate - curShowRate;
    const closeDrop = prevCloseRate - curCloseRate;

    if (showDrop > dropThreshold) {
      flags.push({
        closerId,
        closerName: prevStats.closerName,
        metric: "showRate",
        previous: prevShowRate,
        current: curShowRate,
        delta: showDrop
      });
    }
    if (closeDrop > dropThreshold) {
      flags.push({
        closerId,
        closerName: prevStats.closerName,
        metric: "closeRate",
        previous: prevCloseRate,
        current: curCloseRate,
        delta: closeDrop
      });
    }
  }

  return flags.sort((a, b) => b.delta - a.delta);
}

// ---------- Main component ----------
export default function CoachingPage() {
  const [closerId, setCloserId] = useState<string | "all">("all");
  const [timeOfDay, setTimeOfDay] =
    useState<TimeOfDayFilter>("all");
  const [dayOfWeek, setDayOfWeek] =
    useState<DayOfWeekFilter>("all");
  const [appointmentType, setAppointmentType] =
    useState<AppointmentTypeFilter>("all");
  const [bookingSource, setBookingSource] =
    useState<BookingSourceFilter>("all");
  const [nurtureType, setNurtureType] =
    useState<NurtureTypeFilter>("all");

  const comparisonEnabled = false;

  const filteredCalls = useMemo(() => {
    return ALL_CALLS.filter(c => {
      if (closerId !== "all" && c.closerId !== closerId) return false;

      if (timeOfDay !== "all") {
        if (getTimeOfDayBucket(c.callAt) !== timeOfDay) return false;
      }

      if (dayOfWeek !== "all") {
        if (getDayOfWeekKey(c.callAt) !== dayOfWeek) return false;
      }

      if (appointmentType !== "all") {
        if (c.appointmentType !== appointmentType) return false;
      }

      if (bookingSource !== "all") {
        if (c.bookingSource !== bookingSource) return false;
      }

      if (nurtureType !== "all") {
        if (c.nurtureType !== nurtureType) return false;
      }

      return true;
    });
  }, [
    closerId,
    timeOfDay,
    dayOfWeek,
    appointmentType,
    bookingSource,
    nurtureType
  ]);

  const scorecards = useMemo(
    () => computeCloserScorecards(filteredCalls),
    [filteredCalls]
  );

  const nurtureConversion = useMemo(
    () => computeNurtureConversion(filteredCalls),
    [filteredCalls]
  );

  const sourceNurtureMatrix = useMemo(
    () => computeLeadSourceNurtureMatrix(filteredCalls),
    [filteredCalls]
  );

  const redFlags = useMemo(
    () => computeRedFlags(filteredCalls),
    [filteredCalls]
  );

  const sortedCalls = useMemo(
    () =>
      [...filteredCalls].sort(
        (a, b) =>
          new Date(b.callAt).getTime() -
          new Date(a.callAt).getTime()
      ),
    [filteredCalls]
  );

  return (
    <DashboardShell>
      <div className="flex flex-col gap-6">
        <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
              Coaching &amp; Rep Insights
            </h1>
            <p className="text-sm text-slate-400">
              Scorecards, nurture performance, and call outcomes to run better 1:1s.
            </p>
          </div>
        </header>

        <FiltersBar
          closerId={closerId}
          onCloserChange={setCloserId}
          timeOfDay={timeOfDay}
          onTimeOfDayChange={setTimeOfDay}
          dayOfWeek={dayOfWeek}
          onDayOfWeekChange={setDayOfWeek}
          appointmentType={appointmentType}
          onAppointmentTypeChange={setAppointmentType}
          bookingSource={bookingSource}
          onBookingSourceChange={setBookingSource}
          nurtureType={nurtureType}
          onNurtureTypeChange={setNurtureType}
          comparisonEnabled={comparisonEnabled}
          onToggleComparison={() => {}}
        />

        {/* Closer scorecards */}
        <section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-medium">
                Closer scorecards
              </h2>
              <p className="text-[11px] text-slate-400">
                Performance metrics per closer after filters.
              </p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {scorecards.map(s => (
              <div
                key={s.closerId}
                className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 text-xs space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-slate-100">
                    {s.closerName}
                  </p>
                  <span className="text-[11px] text-slate-500">
                    {s.totalCalls} calls
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 mt-1">
                  <span className="text-[11px] text-slate-400">
                    Show rate
                  </span>
                  <span>{formatPercent(s.showRate)}</span>

                  <span className="text-[11px] text-slate-400">
                    Close rate
                  </span>
                  <span>{formatPercent(s.closeRate)}</span>

                  <span className="text-[11px] text-slate-400">
                    No-show rate
                  </span>
                  <span>
                    {s.totalCalls
                      ? formatPercent(
                          s.totalNoShows / s.totalCalls
                        )
                      : "0.0%"}
                  </span>

                  <span className="text-[11px] text-slate-400">
                    Revenue
                  </span>
                  <span>{formatCurrency(s.revenue)}</span>

                  <span className="text-[11px] text-slate-400">
                    Rev / appt
                  </span>
                  <span>
                    {formatCurrency(s.revenuePerAppt)}
                  </span>

                  <span className="text-[11px] text-slate-400">
                    Rev / show
                  </span>
                  <span>
                    {formatCurrency(s.revenuePerShow)}
                  </span>
                </div>
              </div>
            ))}
            {scorecards.length === 0 && (
              <p className="text-[11px] text-slate-500">
                No calls found for the current filters.
              </p>
            )}
          </div>
        </section>

        {/* Nurture conversion & Lead source × Nurture */}
        <section className="grid gap-4 md:grid-cols-2">
          {/* Nurture conversion */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div>
              <h2 className="text-sm font-medium">
                Nurture conversion
              </h2>
              <p className="text-[11px] text-slate-400">
                How redzone, short-term, and long-term leads are performing.
              </p>
            </div>
            <div className="space-y-2">
              {nurtureConversion.map(n => (
                <div
                  key={n.nurtureType}
                  className="bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2 text-xs flex flex-col gap-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold capitalize">
                      {n.nurtureType === "redzone"
                        ? "Redzone (≤7 days)"
                        : n.nurtureType === "short_term"
                        ? "Short term (7–30 days)"
                        : "Long term (30+ days)"}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {n.total} leads
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                    <span className="text-[11px] text-slate-400">
                      Show rate
                    </span>
                    <span>{formatPercent(n.showRate)}</span>

                    <span className="text-[11px] text-slate-400">
                      Close rate
                    </span>
                    <span>{formatPercent(n.closeRate)}</span>

                    <span className="text-[11px] text-slate-400">
                      Closed won
                    </span>
                    <span>{n.closedWon}</span>

                    <span className="text-[11px] text-slate-400">
                      Revenue
                    </span>
                    <span>{formatCurrency(n.revenue)}</span>
                  </div>
                </div>
              ))}
              {nurtureConversion.length === 0 && (
                <p className="text-[11px] text-slate-500">
                  No nurture data for current filters.
                </p>
              )}
            </div>
          </div>

          {/* Lead source × nurture matrix */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div>
              <h2 className="text-sm font-medium">
                Lead source × nurture matrix
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-800">
                    <th className="py-1.5 pr-2 text-left text-[11px] text-slate-400">
                      Nurture
                    </th>
                    {sourceNurtureMatrix.sources.map(s => (
                      <th
                        key={s}
                        className="py-1.5 px-2 text-left text-[11px] text-slate-400"
                      >
                        {s}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sourceNurtureMatrix.nurtures.map(n => (
                    <tr
                      key={n}
                      className="border-b border-slate-900 last:border-0"
                    >
                      <td className="py-1.5 pr-2 text-[11px] text-slate-300">
                        {n === "redzone"
                          ? "Redzone"
                          : n === "short_term"
                          ? "Short"
                          : "Long"}
                      </td>
                      {sourceNurtureMatrix.sources.map(s => {
                        const cell =
                          sourceNurtureMatrix.matrix[n][s];
                        return (
                          <td
                            key={s}
                            className="py-1.5 px-2 text-[11px] text-slate-300"
                          >
                            {cell.total === 0 ? (
                              <span className="text-slate-600">
                                -
                              </span>
                            ) : (
                              <span>
                                {cell.total} •{" "}
                                {formatPercent(cell.closeRate)}
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Red flags */}
        <section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-medium">
                Red flags (30d vs previous 30d)
              </h2>
              <p className="text-[11px] text-slate-400">
                Significant drops in show rate or close rate.
              </p>
            </div>
          </div>
          {redFlags.length === 0 ? (
            <p className="text-[11px] text-slate-500">
              No major drops detected for the last 30 days with the current filters.
            </p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {redFlags.map((f, idx) => (
                <div
                  key={`${f.closerId}-${f.metric}-${idx}`}
                  className="bg-slate-950/60 border border-rose-500/60 rounded-xl px-3 py-2 text-xs"
                >
                  <p className="font-semibold text-rose-300 mb-1">
                    {f.closerName} –{" "}
                    {f.metric === "showRate"
                      ? "Show rate"
                      : "Close rate"}{" "}
                    dropped
                  </p>
                  <p className="text-[11px] text-slate-200">
                    {formatPercent(f.previous)} →{" "}
                    {formatPercent(f.current)}{" "}
                    <span className="text-rose-400">
                      (−{(f.delta * 100).toFixed(1)} pts)
                    </span>
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Call outcome explorer */}
        <section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-medium">
                Call outcome explorer
              </h2>
              <p className="text-[11px] text-slate-400">
                Drill into individual calls behind your metrics.
              </p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="py-1.5 px-2 text-left text-[11px] text-slate-400">
                    Date / time
                  </th>
                  <th className="py-1.5 px-2 text-left text-[11px] text-slate-400">
                    Closer
                  </th>
                  <th className="py-1.5 px-2 text-left text-[11px] text-slate-400">
                    Status
                  </th>
                  <th className="py-1.5 px-2 text-left text-[11px] text-slate-400">
                    Stage
                  </th>
                  <th className="py-1.5 px-2 text-left text-[11px] text-slate-400">
                    Amount
                  </th>
                  <th className="py-1.5 px-2 text-left text-[11px] text-slate-400">
                    Source
                  </th>
                  <th className="py-1.5 px-2 text-left text-[11px] text-slate-400">
                    Nurture
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedCalls.slice(0, 80).map(c => (
                  <tr
                    key={c.id}
                    className="border-b border-slate-900 last:border-0"
                  >
                    <td className="py-1.5 px-2 text-[11px] text-slate-200 whitespace-nowrap">
                      {formatDateTime(c.callAt)}
                    </td>
                    <td className="py-1.5 px-2 text-[11px] text-slate-200 whitespace-nowrap">
                      {c.closerName}
                    </td>
                    <td className="py-1.5 px-2 text-[11px] text-slate-300 capitalize">
                      {c.callStatus.replace("_", " ")}
                    </td>
                    <td className="py-1.5 px-2 text-[11px] text-slate-300 capitalize">
                      {c.dealStage.replace("_", " ")}
                    </td>
                    <td className="py-1.5 px-2 text-[11px] text-slate-200 whitespace-nowrap">
                      {c.amount ? formatCurrency(c.amount) : "-"}
                    </td>
                    <td className="py-1.5 px-2 text-[11px] text-slate-300 whitespace-nowrap">
                      {c.bookingSource}
                    </td>
                    <td className="py-1.5 px-2 text-[11px] text-slate-300 whitespace-nowrap capitalize">
                      {c.nurtureType.replace("_", " ")}
                    </td>
                  </tr>
                ))}
                {sortedCalls.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="py-2 text-[11px] text-slate-500"
                    >
                      No calls found for the current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </DashboardShell>
  );
}

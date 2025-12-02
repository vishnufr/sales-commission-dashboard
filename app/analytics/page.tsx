// app/analytics/page.tsx
"use client";

import { useMemo, useState } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { FiltersBar } from "@/components/filters-bar";
import { generateSampleCalls, CLOSERS } from "@/lib/sample-data";
import {
  computeAppointmentMetrics,
  computeKpis,
  getTimeOfDayBucket,
  getDayOfWeekKey
} from "@/lib/analytics";
import type {
  CallRecord,
  AppointmentType,
  BookingSource,
  NurtureType
} from "@/lib/types";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend
} from "recharts";

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

type ComparisonDimension = "closer" | "timeOfDay";
type TimeOfDayKey = "morning" | "afternoon" | "evening" | "night";

const ALL_CALLS: CallRecord[] = generateSampleCalls();

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

export default function AnalyticsPage() {
  // Base filters (applied to both segments)
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

  // Comparison state
  const [comparisonEnabled, setComparisonEnabled] =
    useState(false);
  const [comparisonDimension, setComparisonDimension] =
    useState<ComparisonDimension>("closer");

  const [segmentACloserId, setSegmentACloserId] = useState<
    string | "all"
  >("cl1");
  const [segmentBCloserId, setSegmentBCloserId] = useState<
    string | "all"
  >("cl2");

  const [segmentATimeOfDay, setSegmentATimeOfDay] =
    useState<TimeOfDayFilter>("morning");
  const [segmentBTimeOfDay, setSegmentBTimeOfDay] =
    useState<TimeOfDayFilter>("evening");

  // Base filtering
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

  // Segment calls
  const segmentCallsA = useMemo(() => {
    if (!comparisonEnabled) return filteredCalls;

    if (comparisonDimension === "closer") {
      if (segmentACloserId === "all") return filteredCalls;
      return filteredCalls.filter(
        c => c.closerId === segmentACloserId
      );
    } else {
      if (segmentATimeOfDay === "all") return filteredCalls;
      return filteredCalls.filter(
        c => getTimeOfDayBucket(c.callAt) === segmentATimeOfDay
      );
    }
  }, [
    comparisonEnabled,
    comparisonDimension,
    filteredCalls,
    segmentACloserId,
    segmentATimeOfDay
  ]);

  const segmentCallsB = useMemo(() => {
    if (!comparisonEnabled) return [];

    if (comparisonDimension === "closer") {
      if (segmentBCloserId === "all") return filteredCalls;
      return filteredCalls.filter(
        c => c.closerId === segmentBCloserId
      );
    } else {
      if (segmentBTimeOfDay === "all") return filteredCalls;
      return filteredCalls.filter(
        c => getTimeOfDayBucket(c.callAt) === segmentBTimeOfDay
      );
    }
  }, [
    comparisonEnabled,
    comparisonDimension,
    filteredCalls,
    segmentBCloserId,
    segmentBTimeOfDay
  ]);

  // Metrics for segments
  const apptA = useMemo(
    () => computeAppointmentMetrics(segmentCallsA),
    [segmentCallsA]
  );
  const kpisA = useMemo(
    () => computeKpis(segmentCallsA),
    [segmentCallsA]
  );

  const apptB = useMemo(
    () => computeAppointmentMetrics(segmentCallsB),
    [segmentCallsB]
  );
  const kpisB = useMemo(
    () => computeKpis(segmentCallsB),
    [segmentCallsB]
  );

  // Derived metrics A
  const cancelRateA =
    apptA.totalAppointments > 0
      ? apptA.totalCancelled / apptA.totalAppointments
      : 0;

  const noShowRateA =
    apptA.totalAppointments > 0
      ? apptA.totalNoShows / apptA.totalAppointments
      : 0;

  const avgSalesCycleDaysA = (() => {
    const closedWon = segmentCallsA.filter(
      c =>
        c.dealStage === "closed_won" &&
        typeof c.salesCycleDays === "number"
    );
    if (!closedWon.length) return 0;
    const sum = closedWon.reduce(
      (acc, c) => acc + (c.salesCycleDays ?? 0),
      0
    );
    return sum / closedWon.length;
  })();

  const revenuePerCallA =
    apptA.totalAppointments > 0
      ? kpisA.totalRevenue / apptA.totalAppointments
      : 0;

  const revenuePerShowA =
    apptA.totalShows > 0
      ? kpisA.totalRevenue / apptA.totalShows
      : 0;

  // Derived metrics B
  const cancelRateB =
    apptB.totalAppointments > 0
      ? apptB.totalCancelled / apptB.totalAppointments
      : 0;

  const noShowRateB =
    apptB.totalAppointments > 0
      ? apptB.totalNoShows / apptB.totalAppointments
      : 0;

  const avgSalesCycleDaysB = (() => {
    const closedWon = segmentCallsB.filter(
      c =>
        c.dealStage === "closed_won" &&
        typeof c.salesCycleDays === "number"
    );
    if (!closedWon.length) return 0;
    const sum = closedWon.reduce(
      (acc, c) => acc + (c.salesCycleDays ?? 0),
      0
    );
    return sum / closedWon.length;
  })();

  const revenuePerCallB =
    apptB.totalAppointments > 0
      ? kpisB.totalRevenue / apptB.totalAppointments
      : 0;

  const revenuePerShowB =
    apptB.totalShows > 0
      ? kpisB.totalRevenue / apptB.totalShows
      : 0;

  // Time-of-day stats
  type TimeOfDayStat = {
    key: TimeOfDayKey;
    label: string;
    appointments: number;
    closedWon: number;
  };

  const computeTimeOfDayStats = (
    calls: CallRecord[]
  ): TimeOfDayStat[] => {
    const keys: TimeOfDayKey[] = [
      "morning",
      "afternoon",
      "evening",
      "night"
    ];
    const labels: Record<TimeOfDayKey, string> = {
      morning: "Morning (6–12)",
      afternoon: "Afternoon (12–5)",
      evening: "Evening (5–9)",
      night: "Night (9–6)"
    };

    const agg: Record<
      TimeOfDayKey,
      { total: number; won: number }
    > = {
      morning: { total: 0, won: 0 },
      afternoon: { total: 0, won: 0 },
      evening: { total: 0, won: 0 },
      night: { total: 0, won: 0 }
    };

    for (const c of calls) {
      const key = getTimeOfDayBucket(c.callAt) as TimeOfDayKey;
      agg[key].total += 1;
      if (c.dealStage === "closed_won") {
        agg[key].won += 1;
      }
    }

    return keys.map(k => ({
      key: k,
      label: labels[k],
      appointments: agg[k].total,
      closedWon: agg[k].won
    }));
  };

  const timeStatsA = useMemo(
    () => computeTimeOfDayStats(segmentCallsA),
    [segmentCallsA]
  );
  const timeStatsB = useMemo(
    () => computeTimeOfDayStats(segmentCallsB),
    [segmentCallsB]
  );

  const timeOfDayChartData = useMemo(() => {
    const keys: TimeOfDayKey[] = [
      "morning",
      "afternoon",
      "evening",
      "night"
    ];
    const labelMap: Record<TimeOfDayKey, string> = {
      morning: "Morning (6–12)",
      afternoon: "Afternoon (12–5)",
      evening: "Evening (5–9)",
      night: "Night (9–6)"
    };

    return keys.map(k => {
      const a = timeStatsA.find(s => s.key === k);
      const b = timeStatsB.find(s => s.key === k);
      return {
        bucket: labelMap[k],
        aClosedWon: a?.closedWon ?? 0,
        bClosedWon: b?.closedWon ?? 0
      };
    });
  }, [timeStatsA, timeStatsB]);

  const recentDealsA = useMemo(() => {
    const deals = segmentCallsA.filter(c =>
      ["closed_won", "closed_lost"].includes(c.dealStage)
    );
    return deals
      .sort(
        (a, b) =>
          new Date(b.callAt).getTime() -
          new Date(a.callAt).getTime()
      )
      .slice(0, 8);
  }, [segmentCallsA]);

  const recentDealsB = useMemo(() => {
    const deals = segmentCallsB.filter(c =>
      ["closed_won", "closed_lost"].includes(c.dealStage)
    );
    return deals
      .sort(
        (a, b) =>
          new Date(b.callAt).getTime() -
          new Date(a.callAt).getTime()
      )
      .slice(0, 8);
  }, [segmentCallsB]);

  return (
    <DashboardShell>
      <div className="flex flex-col gap-6">
        <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
              Analytics
            </h1>
            <p className="text-sm text-slate-400">
              Deep dive into appointments, outcomes, and economics. Turn on
              comparison to benchmark closers or time-of-day windows.
            </p>
          </div>
        </header>

        {/* Base filters */}
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
          onToggleComparison={() =>
            setComparisonEnabled(prev => !prev)
          }
        />

        {/* Comparison configuration */}
        {comparisonEnabled && (
          <section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-medium">
                  Comparison settings
                </h2>
                <p className="text-[11px] text-slate-400">
                  Compare two closers, or two time-of-day windows, inside the
                  current filters.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <span className="text-[11px] text-slate-400">
                Compare by:
              </span>
              <button
                type="button"
                onClick={() =>
                  setComparisonDimension("closer")
                }
                className={`text-[11px] px-3 py-1 rounded-full border transition ${
                  comparisonDimension === "closer"
                    ? "border-indigo-500 bg-indigo-500/10 text-indigo-200"
                    : "border-slate-700 text-slate-300 hover:border-slate-500"
                }`}
              >
                Closer
              </button>
              <button
                type="button"
                onClick={() =>
                  setComparisonDimension("timeOfDay")
                }
                className={`text-[11px] px-3 py-1 rounded-full border transition ${
                  comparisonDimension === "timeOfDay"
                    ? "border-indigo-500 bg-indigo-500/10 text-indigo-200"
                    : "border-slate-700 text-slate-300 hover:border-slate-500"
                }`}
              >
                Time of day
              </button>
            </div>

            <div className="grid gap-3 md:grid-cols-2 mt-2">
              {/* Segment A */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 text-xs space-y-2">
                <p className="text-[11px] font-semibold text-indigo-300">
                  Segment A
                </p>
                {comparisonDimension === "closer" ? (
                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-400">
                      Closer
                    </label>
                    <select
                      className="w-full bg-slate-900 border border-slate-700 rounded-md px-2 py-1 text-[11px] text-slate-100"
                      value={segmentACloserId}
                      onChange={e =>
                        setSegmentACloserId(e.target.value)
                      }
                    >
                      {CLOSERS.map(cl => (
                        <option key={cl.id} value={cl.id}>
                          {cl.name}
                        </option>
                      ))}
                      <option value="all">All closers</option>
                    </select>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-400">
                      Time of day
                    </label>
                    <select
                      className="w-full bg-slate-900 border border-slate-700 rounded-md px-2 py-1 text-[11px] text-slate-100"
                      value={segmentATimeOfDay}
                      onChange={e =>
                        setSegmentATimeOfDay(
                          e.target.value as TimeOfDayFilter
                        )
                      }
                    >
                      <option value="morning">
                        Morning (6–12)
                      </option>
                      <option value="afternoon">
                        Afternoon (12–5)
                      </option>
                      <option value="evening">
                        Evening (5–9)
                      </option>
                      <option value="night">
                        Night (9–6)
                      </option>
                      <option value="all">All times</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Segment B */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 text-xs space-y-2">
                <p className="text-[11px] font-semibold text-emerald-300">
                  Segment B
                </p>
                {comparisonDimension === "closer" ? (
                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-400">
                      Closer
                    </label>
                    <select
                      className="w-full bg-slate-900 border border-slate-700 rounded-md px-2 py-1 text-[11px] text-slate-100"
                      value={segmentBCloserId}
                      onChange={e =>
                        setSegmentBCloserId(e.target.value)
                      }
                    >
                      {CLOSERS.map(cl => (
                        <option key={cl.id} value={cl.id}>
                          {cl.name}
                        </option>
                      ))}
                      <option value="all">All closers</option>
                    </select>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-400">
                      Time of day
                    </label>
                    <select
                      className="w-full bg-slate-900 border border-slate-700 rounded-md px-2 py-1 text-[11px] text-slate-100"
                      value={segmentBTimeOfDay}
                      onChange={e =>
                        setSegmentBTimeOfDay(
                          e.target.value as TimeOfDayFilter
                        )
                      }
                    >
                      <option value="morning">
                        Morning (6–12)
                      </option>
                      <option value="afternoon">
                        Afternoon (12–5)
                      </option>
                      <option value="evening">
                        Evening (5–9)
                      </option>
                      <option value="night">
                        Night (9–6)
                      </option>
                      <option value="all">All times</option>
                    </select>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Segment metrics */}
        <section className="grid gap-4 md:grid-cols-2">
          {/* Segment A */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-medium">
                  Segment A metrics
                </h2>
                <p className="text-[11px] text-slate-400">
                  Base filters + Segment A selection.
                </p>
              </div>
              <span className="text-[10px] text-indigo-300">
                {segmentCallsA.length} calls
              </span>
            </div>

            <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
              <div>
                <p className="text-[11px] text-slate-400">
                  Total appointments
                </p>
                <p className="font-semibold text-slate-100">
                  {apptA.totalAppointments}
                </p>
              </div>

              <div>
                <p className="text-[11px] text-slate-400">
                  Show-up rate
                </p>
                <p className="font-semibold text-slate-100">
                  {formatPercent(apptA.showRate)}
                </p>
              </div>

              <div>
                <p className="text-[11px] text-slate-400">
                  Close rate (on shows)
                </p>
                <p className="font-semibold text-slate-100">
                  {formatPercent(apptA.closeRateOnShows)}
                </p>
              </div>

              <div>
                <p className="text-[11px] text-slate-400">
                  Cancel rate
                </p>
                <p className="font-semibold text-slate-100">
                  {formatPercent(cancelRateA)}
                </p>
              </div>

              <div>
                <p className="text-[11px] text-slate-400">
                  No-show rate
                </p>
                <p className="font-semibold text-slate-100">
                  {formatPercent(noShowRateA)}
                </p>
              </div>

              <div>
                <p className="text-[11px] text-slate-400">
                  Avg days in sales cycle
                </p>
                <p className="font-semibold text-slate-100">
                  {avgSalesCycleDaysA.toFixed(1)}
                </p>
              </div>

              <div>
                <p className="text-[11px] text-slate-400">
                  Revenue (closed won)
                </p>
                <p className="font-semibold text-slate-100">
                  {formatCurrency(kpisA.totalRevenue)}
                </p>
              </div>

              <div>
                <p className="text-[11px] text-slate-400">
                  Revenue per call
                </p>
                <p className="font-semibold text-slate-100">
                  {formatCurrency(revenuePerCallA)}
                </p>
              </div>

              <div>
                <p className="text-[11px] text-slate-400">
                  Revenue per show
                </p>
                <p className="font-semibold text-slate-100">
                  {formatCurrency(revenuePerShowA)}
                </p>
              </div>
            </div>
          </div>

          {/* Segment B */}
          {comparisonEnabled && (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-medium">
                    Segment B metrics
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    Base filters + Segment B selection.
                  </p>
                </div>
                <span className="text-[10px] text-emerald-300">
                  {segmentCallsB.length} calls
                </span>
              </div>

              <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                <div>
                  <p className="text-[11px] text-slate-400">
                    Total appointments
                  </p>
                  <p className="font-semibold text-slate-100">
                    {apptB.totalAppointments}
                  </p>
                </div>

                <div>
                  <p className="text-[11px] text-slate-400">
                    Show-up rate
                  </p>
                  <p className="font-semibold text-slate-100">
                    {formatPercent(apptB.showRate)}
                  </p>
                </div>

                <div>
                  <p className="text-[11px] text-slate-400">
                    Close rate (on shows)
                  </p>
                  <p className="font-semibold text-slate-100">
                    {formatPercent(apptB.closeRateOnShows)}
                  </p>
                </div>

                <div>
                  <p className="text-[11px] text-slate-400">
                    Cancel rate
                  </p>
                  <p className="font-semibold text-slate-100">
                    {formatPercent(cancelRateB)}
                  </p>
                </div>

                <div>
                  <p className="text-[11px] text-slate-400">
                    No-show rate
                  </p>
                  <p className="font-semibold text-slate-100">
                    {formatPercent(noShowRateB)}
                  </p>
                </div>

                <div>
                  <p className="text-[11px] text-slate-400">
                    Avg days in sales cycle
                  </p>
                  <p className="font-semibold text-slate-100">
                    {avgSalesCycleDaysB.toFixed(1)}
                  </p>
                </div>

                <div>
                  <p className="text-[11px] text-slate-400">
                    Revenue (closed won)
                  </p>
                  <p className="font-semibold text-slate-100">
                    {formatCurrency(kpisB.totalRevenue)}
                  </p>
                </div>

                <div>
                  <p className="text-[11px] text-slate-400">
                    Revenue per call
                  </p>
                  <p className="font-semibold text-slate-100">
                    {formatCurrency(revenuePerCallB)}
                  </p>
                </div>

                <div>
                  <p className="text-[11px] text-slate-400">
                    Revenue per show
                  </p>
                  <p className="font-semibold text-slate-100">
                    {formatCurrency(revenuePerShowB)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Time-of-day performance chart (with white tooltips) */}
        <section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-medium">
                Time-of-day performance
              </h2>
              <p className="text-[11px] text-slate-400">
                Closed won deals by time of day. When comparison is on, both
                segments are overlaid.
              </p>
            </div>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={timeOfDayChartData}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#1f2937"
                />
                <XAxis
                  dataKey="bucket"
                  tick={{ fontSize: 11, fill: "#9ca3af" }}
                  axisLine={{ stroke: "#4b5563" }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#9ca3af" }}
                  axisLine={{ stroke: "#4b5563" }}
                  allowDecimals={false}
                />
                <Legend
                  wrapperStyle={{
                    fontSize: "10px",
                    color: "#9ca3af"
                  }}
                />
                <RechartsTooltip
                cursor={{ fill: "transparent" }}
                contentStyle={{
                backgroundColor: "#020617",
                border: "1px solid #ffffffff",
                borderRadius: "0.5rem",
                fontSize: "0.75rem"
  }}
  labelStyle={{ color: "#e5e7eb" }}   // label text (top)
  itemStyle={{ color: "#f9fafb" }}    // value text
  formatter={(value: any) => [
    String(value),
    "Closed won deals"
  ]}
                />
                <Bar
                  dataKey="aClosedWon"
                  name={
                    comparisonEnabled
                      ? "Segment A closed won"
                      : "Closed won deals"
                  }
                  radius={[4, 4, 0, 0]}
                  fill="#6366f1"
                />
                {comparisonEnabled && (
                  <Bar
                    dataKey="bClosedWon"
                    name="Segment B closed won"
                    radius={[4, 4, 0, 0]}
                    fill="#22c55e"
                  />
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Recent deals for A/B */}
        <section className="grid gap-4 md:grid-cols-2">
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-sm font-medium">
                  Recent deals – Segment A
                </h2>
                <p className="text-[11px] text-slate-400">
                  Closed won and lost after Segment A filters.
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
                      Stage
                    </th>
                    <th className="py-1.5 px-2 text-left text-[11px] text-slate-400">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recentDealsA.map(c => (
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
                      <td
                        className={`py-1.5 px-2 text-[11px] capitalize whitespace-nowrap ${
                          c.dealStage === "closed_won"
                            ? "text-emerald-400"
                            : "text-rose-400"
                        }`}
                      >
                        {c.dealStage.replace("_", " ")}
                      </td>
                      <td className="py-1.5 px-2 text-[11px] text-slate-200 whitespace-nowrap">
                        {c.amount
                          ? formatCurrency(c.amount)
                          : "-"}
                      </td>
                    </tr>
                  ))}
                  {recentDealsA.length === 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        className="py-2 text-[11px] text-slate-500"
                      >
                        No deals found for Segment A.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {comparisonEnabled && (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-sm font-medium">
                    Recent deals – Segment B
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    Closed won and lost after Segment B filters.
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
                        Stage
                      </th>
                      <th className="py-1.5 px-2 text-left text-[11px] text-slate-400">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentDealsB.map(c => (
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
                        <td
                          className={`py-1.5 px-2 text-[11px] capitalize whitespace-nowrap ${
                            c.dealStage === "closed_won"
                              ? "text-emerald-400"
                              : "text-rose-400"
                          }`}
                        >
                          {c.dealStage.replace("_", " ")}
                        </td>
                        <td className="py-1.5 px-2 text-[11px] text-slate-200 whitespace-nowrap">
                          {c.amount
                            ? formatCurrency(c.amount)
                            : "-"}
                        </td>
                      </tr>
                    ))}
                    {recentDealsB.length === 0 && (
                      <tr>
                        <td
                          colSpan={4}
                          className="py-2 text-[11px] text-slate-500"
                        >
                          No deals found for Segment B.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      </div>
    </DashboardShell>
  );
}

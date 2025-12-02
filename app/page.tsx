// app/page.tsx
"use client";

import { useMemo, useState } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { FiltersBar } from "@/components/filters-bar";
import { generateSampleCalls } from "@/lib/sample-data";
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
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
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

type ExpandedCard = "stage" | "source" | null;

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

export default function DashboardPage() {
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
  const [expandedCard, setExpandedCard] =
    useState<ExpandedCard>(null);

  // ---- Apply filters to all calls ----
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

  // Core metrics
  const apptMetrics = useMemo(
    () => computeAppointmentMetrics(filteredCalls),
    [filteredCalls]
  );
  const kpis = useMemo(
    () => computeKpis(filteredCalls),
    [filteredCalls]
  );

  // ---- Deal stage breakdown (for pie chart) ----
  const stageCounts = useMemo(() => {
    const counts: Record<string, number> = {
      closed_won: 0,
      closed_lost: 0,
      follow_up: 0,
      unqualified: 0
    };
    for (const c of filteredCalls) {
      counts[c.dealStage] = (counts[c.dealStage] || 0) + 1;
    }
    return [
      {
        key: "closed_won",
        label: "Closed won",
        value: counts.closed_won
      },
      {
        key: "closed_lost",
        label: "Closed lost",
        value: counts.closed_lost
      },
      {
        key: "follow_up",
        label: "Follow up",
        value: counts.follow_up
      },
      {
        key: "unqualified",
        label: "Unqualified",
        value: counts.unqualified
      }
    ];
  }, [filteredCalls]);

  // ---- Deals by source (booking source, closed_won only) ----
  const dealsBySource = useMemo(() => {
    const sources: BookingSource[] = [
      "Organic",
      "Paid Ads",
      "Triage",
      "Referral"
    ];
    const counts: Record<BookingSource, number> = {
      Organic: 0,
      "Paid Ads": 0,
      Triage: 0,
      Referral: 0
    };

    for (const c of filteredCalls) {
      if (c.dealStage === "closed_won") {
        counts[c.bookingSource] += 1;
      }
    }

    return sources.map(s => ({
      source: s,
      deals: counts[s]
    }));
  }, [filteredCalls]);

  // ---- Recent calls & deals ----
  const recentCalls = useMemo(
    () =>
      [...filteredCalls]
        .sort(
          (a, b) =>
            new Date(b.callAt).getTime() -
            new Date(a.callAt).getTime()
        )
        .slice(0, 10),
    [filteredCalls]
  );

  const recentDeals = useMemo(() => {
    const deals = filteredCalls.filter(c =>
      ["closed_won", "closed_lost"].includes(c.dealStage)
    );
    return deals
      .sort(
        (a, b) =>
          new Date(b.callAt).getTime() -
          new Date(a.callAt).getTime()
      )
      .slice(0, 10);
  }, [filteredCalls]);

  // ---- Recharts state for hover interaction ----
  const [activeStageIndex, setActiveStageIndex] =
    useState<number | null>(null);
  const [activeSourceIndex, setActiveSourceIndex] =
    useState<number | null>(null);

  const STAGE_COLORS = ["#22c55e", "#ef4444", "#f97316", "#6366f1"];

  return (
    <DashboardShell>
      <div className="flex flex-col gap-6">
        <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
              Dashboard
            </h1>
            <p className="text-sm text-slate-400">
              Real-time view of appointments, pipeline, and commission
              performance.
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

        {/* KPI row */}
        <section className="grid gap-4 md:grid-cols-4">
          {/* Total revenue (closed_won only) */}
          <div
            className="bg-slate-900/60 border border-slate-800 rounded-2xl px-4 py-3
                       transition-transform transition-shadow duration-150
                       hover:scale-[1.02] hover:shadow-lg hover:shadow-indigo-500/20"
          >
            <p className="text-xs text-slate-400 mb-1">
              Revenue (closed won)
            </p>
            <p className="text-lg font-semibold">
              {formatCurrency(kpis.totalRevenue)}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              Only deals that actually closed.
            </p>
          </div>

          {/* Total appointments */}
          <div
            className="bg-slate-900/60 border border-slate-800 rounded-2xl px-4 py-3
                       transition-transform transition-shadow duration-150
                       hover:scale-[1.02] hover:shadow-lg hover:shadow-indigo-500/20"
          >
            <p className="text-xs text-slate-400 mb-1">
              Total appointments
            </p>
            <p className="text-lg font-semibold">
              {apptMetrics.totalAppointments.toLocaleString()}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              Calls after all filters.
            </p>
          </div>

          {/* Show-up rate */}
          <div
            className="bg-slate-900/60 border border-slate-800 rounded-2xl px-4 py-3
                       transition-transform transition-shadow duration-150
                       hover:scale-[1.02] hover:shadow-lg hover:shadow-indigo-500/20"
          >
            <p className="text-xs text-slate-400 mb-1">Show-up rate</p>
            <p className="text-lg font-semibold">
              {formatPercent(apptMetrics.showRate)}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              {apptMetrics.totalShows} shows /{" "}
              {apptMetrics.totalAppointments} booked
            </p>
          </div>

          {/* Close rate on shows */}
          <div
            className="bg-slate-900/60 border border-slate-800 rounded-2xl px-4 py-3
                       transition-transform transition-shadow duration-150
                       hover:scale-[1.02] hover:shadow-lg hover:shadow-indigo-500/20"
          >
            <p className="text-xs text-slate-400 mb-1">
              Close rate (on shows)
            </p>
            <p className="text-lg font-semibold">
              {formatPercent(apptMetrics.closeRateOnShows)}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              Shows that became closed won.
            </p>
          </div>
        </section>

        {/* Charts row: Deal stage pie + Deals by source */}
        <section className="grid gap-4 md:grid-cols-2">
          {/* Deal stage breakdown */}
          <div
            onClick={() =>
              setExpandedCard(prev =>
                prev === "stage" ? null : "stage"
              )
            }
            className={`bg-slate-900/60 border border-slate-800 rounded-2xl p-4 cursor-pointer
                        transition-all duration-150
                        hover:scale-[1.01] hover:shadow-lg hover:shadow-indigo-500/20
                        ${
                          expandedCard === "stage"
                            ? "md:col-span-2 md:h-[360px]"
                            : ""
                        }`}
          >
            <div className="flex items-center justify-between gap-2 mb-3">
              <div>
                <h2 className="text-sm font-medium">
                  Pipeline breakdown
                </h2>
                <p className="text-[11px] text-slate-400">
                  Distribution of deals by stage (after filters).
                </p>
              </div>
              <span className="text-[10px] text-slate-500">
                Click to {expandedCard === "stage" ? "shrink" : "expand"}
              </span>
            </div>

            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <div className="flex-1 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stageCounts}
                      dataKey="value"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={activeStageIndex === null ? 80 : 70}
                      paddingAngle={2}
                      onMouseEnter={(_, index) =>
                        setActiveStageIndex(index)
                      }
                      onMouseLeave={() =>
                        setActiveStageIndex(null)
                      }
                    >
                      {stageCounts.map((entry, index) => (
                        <Cell
                          key={entry.key}
                          fill={
                            STAGE_COLORS[index % STAGE_COLORS.length]
                          }
                          stroke={
                            activeStageIndex === index
                            ? "#e5e7eb"
                              : "#020617"
                          }
                          strokeWidth={
                            activeStageIndex === index ? 2 : 1
                          }
                        />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: "#020617",
                        border: "1px solid #1f2937",
                        borderRadius: "0.5rem",
                        fontSize: "0.75rem",
                        color: "#ffffffff"
                      }}
                      formatter={(value: any, _name: any, props: any) => {
                        const { payload } = props;
                        return [`${value}`, payload.label as string];
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Legend */}
              <div className="flex-1 space-y-1 text-xs">
                {stageCounts.map((s, idx) => (
                  <div
                    key={s.key}
                    className="flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block h-2 w-2 rounded-full"
                        style={{
                          backgroundColor:
                            STAGE_COLORS[
                              idx % STAGE_COLORS.length
                            ]
                        }}
                      />
                      <span className="text-slate-200">
                        {s.label}
                      </span>
                    </div>
                    <span className="text-slate-400">
                      {s.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Deals by source (Closed won) */}
          <div
            onClick={() =>
              setExpandedCard(prev =>
                prev === "source" ? null : "source"
              )
            }
            className={`bg-slate-900/60 border border-slate-800 rounded-2xl p-4 cursor-pointer
                        transition-all duration-150
                        hover:scale-[1.01] hover:shadow-lg hover:shadow-indigo-500/20
                        ${
                          expandedCard === "source"
                            ? "md:col-span-2 md:h-[360px]"
                            : ""
                        }`}
          >
            <div className="flex items-center justify-between gap-2 mb-3">
              <div>
                <h2 className="text-sm font-medium">
                  Deals by booking source
                </h2>
                <p className="text-[11px] text-slate-400">
                  Closed won deals by booking source (Organic, Paid Ads,
                  Triage, Referral).
                </p>
              </div>
              <span className="text-[10px] text-slate-500">
                Click to {expandedCard === "source" ? "shrink" : "expand"}
              </span>
            </div>

            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={dealsBySource}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#1f2937"
                  />
                  <XAxis
                    dataKey="source"
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
                      border: "1px solid #1f2937",
                      borderRadius: "0.5rem",
                      fontSize: "0.75rem",
                    }}
                    labelStyle={{ color: "#e5e7eb" }}      // label at the top
  itemStyle={{ color: "#f9fafb" }}       // value text
  formatter={(value: any) => [
    String(value),
    "Closed won deals"
                    ]}
                  />
                  <Bar
                    dataKey="deals"
                    name="Closed won deals"
                    fill="#0ea5e9"
                    onMouseEnter={(_, index) =>
                      setActiveSourceIndex(index)
                    }
                    onMouseLeave={() =>
                      setActiveSourceIndex(null)
                    }
                    radius={[4, 4, 0, 0]}
                  >
                    {dealsBySource.map((_, index) => (
                      <Cell
      key={`cell-${index}`}
      // keep the bar blue
      fill={
        activeSourceIndex === index
          ? "#38bdf8"  // slightly lighter blue on hover (optional)
          : "#0ea5e9"
      }
      // add a white outline ONLY when hovered
      stroke={activeSourceIndex === index ? "#ffffff" : "none"}
      strokeWidth={activeSourceIndex === index ? 2 : 0}
    />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        {/* Recent calls & deals */}
        <section className="grid gap-4 md:grid-cols-2">
          {/* Recent calls */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-sm font-medium">
                  Recent calls
                </h2>
                <p className="text-[11px] text-slate-400">
                  Latest appointments after filters.
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
                      Source
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recentCalls.map(c => (
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
                      <td className="py-1.5 px-2 text-[11px] text-slate-300 whitespace-nowrap">
                        {c.bookingSource}
                      </td>
                    </tr>
                  ))}
                  {recentCalls.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="py-2 text-[11px] text-slate-500"
                      >
                        No calls found for the current filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent deals */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-sm font-medium">
                  Recent deals
                </h2>
                <p className="text-[11px] text-slate-400">
                  Closed won and closed lost, newest first.
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
                    <th className="py-1.5 px-2 text-left text-[11px] text-slate-400">
                      Source
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recentDeals.map(c => (
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
                      <td className="py-1.5 px-2 text-[11px] text-slate-300 whitespace-nowrap">
                        {c.bookingSource}
                      </td>
                    </tr>
                  ))}
                  {recentDeals.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="py-2 text-[11px] text-slate-500"
                      >
                        No deals found for the current filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </DashboardShell>
  );
}

// lib/analytics.ts
import { CallRecord } from "./types";

export type KpiSummary = {
  totalRevenue: number;
  totalCommission: number;
  closeRate: number;
  avgDealSize: number;
  dealsWon: number;
  dealsLost: number;
};

export type TimeOfDayBucket = "morning" | "afternoon" | "evening" | "night";
export type DayOfWeekKey =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export type AppointmentMetrics = {
  totalAppointments: number;
  totalShows: number;
  totalCancelled: number;
  totalNoShows: number;
  showRate: number;
  cancelRate: number;
  noShowRate: number;
  closeRatePerAppointment: number;
  closeRateOnShows: number;

  avgSalesCycleDays: number;

  revenuePerAppointment: number;
  revenuePerShow: number;
  commissionPerAppointment: number;
};

export type CloseBucketStats = {
  key: string;
  label: string;
  dealsWon: number;
  total: number;
  closeRate: number;
  revenue: number;
};

// ---------- Core KPI ----------
export function computeKpis(calls: CallRecord[]): KpiSummary {
  const won = calls.filter(c => c.dealStage === "closed_won");
  const lost = calls.filter(c => c.dealStage === "closed_lost");

  const totalRevenue = won.reduce((sum, c) => sum + (c.amount ?? 0), 0);
  const totalCommission = calls.reduce(
    (sum, c) => sum + (c.commissionAmount ?? 0),
    0
  );
  const avgDealSize = won.length > 0 ? totalRevenue / won.length : 0;
  const closeRate = calls.length > 0 ? won.length / calls.length : 0;

  return {
    totalRevenue,
    totalCommission,
    closeRate,
    avgDealSize,
    dealsWon: won.length,
    dealsLost: lost.length
  };
}

// ---------- Appointment / call metrics ----------
export function computeAppointmentMetrics(
  calls: CallRecord[]
): AppointmentMetrics {
  const totalAppointments = calls.length;
  const totalShows = calls.filter(c => c.callStatus === "show").length;
  const totalCancelled = calls.filter(c => c.callStatus === "cancelled").length;
  const totalNoShows = calls.filter(c => c.callStatus === "no_show").length;

  const closedWon = calls.filter(c => c.dealStage === "closed_won");
  const totalRevenue = closedWon.reduce(
    (sum, c) => sum + (c.amount ?? 0),
    0
  );
  const totalCommission = calls.reduce(
    (sum, c) => sum + (c.commissionAmount ?? 0),
    0
  );

  const showRate =
    totalAppointments > 0 ? totalShows / totalAppointments : 0;
  const cancelRate =
    totalAppointments > 0 ? totalCancelled / totalAppointments : 0;
  const noShowRate =
    totalAppointments > 0 ? totalNoShows / totalAppointments : 0;

  const closeRatePerAppointment =
    totalAppointments > 0 ? closedWon.length / totalAppointments : 0;
  const closeRateOnShows =
    totalShows > 0 ? closedWon.length / totalShows : 0;

  const withCycle = closedWon.filter(
    c => c.salesCycleDays != null
  );
  const avgSalesCycleDays =
    withCycle.length > 0
      ? withCycle.reduce((s, c) => s + (c.salesCycleDays ?? 0), 0) /
        withCycle.length
      : 0;

  const revenuePerAppointment =
    totalAppointments > 0 ? totalRevenue / totalAppointments : 0;
  const revenuePerShow =
    totalShows > 0 ? totalRevenue / totalShows : 0;

  const commissionPerAppointment =
    totalAppointments > 0 ? totalCommission / totalAppointments : 0;

  return {
    totalAppointments,
    totalShows,
    totalCancelled,
    totalNoShows,
    showRate,
    cancelRate,
    noShowRate,
    closeRatePerAppointment,
    closeRateOnShows,
    avgSalesCycleDays,
    revenuePerAppointment,
    revenuePerShow,
    commissionPerAppointment
  };
}

// ---------- Time helpers ----------
export function getTimeOfDayBucket(iso: string): TimeOfDayBucket {
  const d = new Date(iso);
  const h = d.getHours();
  if (h >= 6 && h < 12) return "morning";
  if (h >= 12 && h < 17) return "afternoon";
  if (h >= 17 && h < 21) return "evening";
  return "night";
}

export function getDayOfWeekKey(iso: string): DayOfWeekKey {
  const d = new Date(iso);
  const day = d.getDay(); // 0 = Sunday
  switch (day) {
    case 0:
      return "sunday";
    case 1:
      return "monday";
    case 2:
      return "tuesday";
    case 3:
      return "wednesday";
    case 4:
      return "thursday";
    case 5:
      return "friday";
    case 6:
    default:
      return "saturday";
  }
}

// ---------- Grouping for charts ----------
export function groupRevenueByDate(calls: CallRecord[]) {
  const map = new Map<string, number>();

  for (const c of calls) {
    if (c.dealStage !== "closed_won" || !c.amount) continue;
    const dateKey = c.callAt.slice(0, 10);
    map.set(dateKey, (map.get(dateKey) ?? 0) + c.amount);
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([date, revenue]) => ({ date, revenue }));
}

export function groupByBookingSource(calls: CallRecord[]) {
  const map = new Map<string, { count: number; revenue: number }>();

  for (const c of calls) {
    const key = c.bookingSource;
    const existing = map.get(key) ?? { count: 0, revenue: 0 };
    existing.count += 1;
    if (c.dealStage === "closed_won" && c.amount) {
      existing.revenue += c.amount;
    }
    map.set(key, existing);
  }

  return Array.from(map.entries()).map(([source, v]) => ({
    source,
    count: v.count,
    revenue: v.revenue
  }));
}

export function groupByDealStage(calls: CallRecord[]) {
  const map = new Map<string, number>();
  for (const c of calls) {
    map.set(c.dealStage, (map.get(c.dealStage) ?? 0) + 1);
  }
  return Array.from(map.entries()).map(([stage, value]) => ({
    stage,
    value
  }));
}

export function groupCallsByTimeOfDay(calls: CallRecord[]) {
  const counts: Record<TimeOfDayBucket, number> = {
    morning: 0,
    afternoon: 0,
    evening: 0,
    night: 0
  };

  for (const c of calls) {
    const bucket = getTimeOfDayBucket(c.callAt);
    counts[bucket] += 1;
  }

  return [
    { bucket: "morning", label: "Morning", count: counts.morning },
    { bucket: "afternoon", label: "Afternoon", count: counts.afternoon },
    { bucket: "evening", label: "Evening", count: counts.evening },
    { bucket: "night", label: "Night", count: counts.night }
  ];
}

export function groupCallsByDayOfWeek(calls: CallRecord[]) {
  const order: DayOfWeekKey[] = [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday"
  ];
  const labels: Record<DayOfWeekKey, string> = {
    monday: "Mon",
    tuesday: "Tue",
    wednesday: "Wed",
    thursday: "Thu",
    friday: "Fri",
    saturday: "Sat",
    sunday: "Sun"
  };

  const counts: Record<DayOfWeekKey, number> = {
    monday: 0,
    tuesday: 0,
    wednesday: 0,
    thursday: 0,
    friday: 0,
    saturday: 0,
    sunday: 0
  };

  for (const c of calls) {
    const key = getDayOfWeekKey(c.callAt);
    counts[key] += 1;
  }

  return order.map(key => ({
    dayKey: key,
    dayLabel: labels[key],
    count: counts[key]
  }));
}

export function groupByAppointmentType(calls: CallRecord[]) {
  const map = new Map<string, number>();
  for (const c of calls) {
    map.set(c.appointmentType, (map.get(c.appointmentType) ?? 0) + 1);
  }
  return Array.from(map.entries()).map(([type, count]) => ({
    type,
    count
  }));
}

export function groupByNurtureType(calls: CallRecord[]) {
  const map = new Map<string, number>();
  for (const c of calls) {
    map.set(c.nurtureType, (map.get(c.nurtureType) ?? 0) + 1);
  }
  return Array.from(map.entries()).map(([type, count]) => ({
    type,
    count
  }));
}

// ---------- Close stats by time/day ----------
export function closeStatsByTimeOfDay(
  calls: CallRecord[]
): CloseBucketStats[] {
  const buckets: Record<
    TimeOfDayBucket,
    { total: number; dealsWon: number; revenue: number }
  > = {
    morning: { total: 0, dealsWon: 0, revenue: 0 },
    afternoon: { total: 0, dealsWon: 0, revenue: 0 },
    evening: { total: 0, dealsWon: 0, revenue: 0 },
    night: { total: 0, dealsWon: 0, revenue: 0 }
  };

  for (const c of calls) {
    const bucket = getTimeOfDayBucket(c.callAt);
    const slot = buckets[bucket];
    slot.total += 1;
    if (c.dealStage === "closed_won") {
      slot.dealsWon += 1;
      if (c.amount) slot.revenue += c.amount;
    }
  }

  const labels: Record<TimeOfDayBucket, string> = {
    morning: "Morning (6a–12p)",
    afternoon: "Afternoon (12p–5p)",
    evening: "Evening (5p–9p)",
    night: "Night (9p–6a)"
  };

  return (["morning", "afternoon", "evening", "night"] as TimeOfDayBucket[]).map(
    key => {
      const s = buckets[key];
      const closeRate = s.total > 0 ? s.dealsWon / s.total : 0;
      return {
        key,
        label: labels[key],
        dealsWon: s.dealsWon,
        total: s.total,
        closeRate,
        revenue: s.revenue
      };
    }
  );
}

export function closeStatsByDayOfWeek(
  calls: CallRecord[]
): CloseBucketStats[] {
  const order: DayOfWeekKey[] = [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday"
  ];

  const labels: Record<DayOfWeekKey, string> = {
    monday: "Monday",
    tuesday: "Tuesday",
    wednesday: "Wednesday",
    thursday: "Thursday",
    friday: "Friday",
    saturday: "Saturday",
    sunday: "Sunday"
  };

  const buckets: Record<
    DayOfWeekKey,
    { total: number; dealsWon: number; revenue: number }
  > = {
    monday: { total: 0, dealsWon: 0, revenue: 0 },
    tuesday: { total: 0, dealsWon: 0, revenue: 0 },
    wednesday: { total: 0, dealsWon: 0, revenue: 0 },
    thursday: { total: 0, dealsWon: 0, revenue: 0 },
    friday: { total: 0, dealsWon: 0, revenue: 0 },
    saturday: { total: 0, dealsWon: 0, revenue: 0 },
    sunday: { total: 0, dealsWon: 0, revenue: 0 }
  };

  for (const c of calls) {
    const key = getDayOfWeekKey(c.callAt);
    const slot = buckets[key];
    slot.total += 1;
    if (c.dealStage === "closed_won") {
      slot.dealsWon += 1;
      if (c.amount) slot.revenue += c.amount;
    }
  }

  return order.map(key => {
    const s = buckets[key];
    const closeRate = s.total > 0 ? s.dealsWon / s.total : 0;
    return {
      key,
      label: labels[key],
      dealsWon: s.dealsWon,
      total: s.total,
      closeRate,
      revenue: s.revenue
    };
  });
}

// ---------- Leaderboard ----------
export function computeLeaderboard(calls: CallRecord[]) {
  const byCloser = new Map<
    string,
    { closerName: string; revenue: number; commission: number; dealsWon: number }
  >();

  for (const c of calls) {
    const current =
      byCloser.get(c.closerId) ?? {
        closerName: c.closerName,
        revenue: 0,
        commission: 0,
        dealsWon: 0
      };
    if (c.dealStage === "closed_won" && c.amount) {
      current.revenue += c.amount;
      current.dealsWon += 1;
    }
    if (c.commissionAmount) {
      current.commission += c.commissionAmount;
    }
    byCloser.set(c.closerId, current);
  }

  return Array.from(byCloser.entries())
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => b.revenue - a.revenue);
}

// lib/sample-data.ts

/**
 * Sample data generator for the demo dashboard.
 *
 * BUSINESS RULES:
 * - Only CLOSED WON deals generate revenue & commission.
 * - CLOSED LOST deals never generate profit (amount = null, commission = 0).
 * - FOLLOW UP / UNQUALIFIED have no revenue yet.
 * - David (cl4) and Emma (cl5) are guaranteed to have clear closed_won deals.
 */

import {
  CallRecord,
  Closer,
  Company,
  DealStage,
  TrafficSource,
  AppointmentType,
  BookingSource,
  NurtureType,
  CallStatus
} from "./types";

export const COMPANIES: Company[] = [
  { id: "c1", name: "Your Company" }
];

export const CLOSERS: Closer[] = [
  { id: "cl1", name: "Alice Johnson" },
  { id: "cl2", name: "Brian Lee" },
  { id: "cl3", name: "Carla Gomez" },
  { id: "cl4", name: "David Smith" },
  { id: "cl5", name: "Emma Chen" }
];

const SOURCES: TrafficSource[] = ["TikTok", "YouTube", "Instagram"];

const BOOKING_SOURCES: BookingSource[] = [
  "Organic",
  "Paid Ads",
  "Triage",
  "Referral"
];

// deterministic "now" to keep SSR/CSR in sync (avoid hydration errors)
const BASE_TIME = new Date("2025-01-01T15:00:00Z").getTime();
const DAY_MS = 24 * 60 * 60 * 1000;

export function generateSampleCalls(): CallRecord[] {
  const records: CallRecord[] = [];
  const TOTAL_RECORDS = 150;

  for (let i = 0; i < TOTAL_RECORDS; i++) {
    const company = COMPANIES[0];

    // cycle closers so everyone gets volume
    const closerIndex = i % CLOSERS.length;
    const closer = CLOSERS[closerIndex];

    const source = SOURCES[i % SOURCES.length];
    const bookingSource = BOOKING_SOURCES[i % BOOKING_SOURCES.length];

    // ---- Deal stage distribution ----
    // Base distribution: 30% won, 40% lost, 30% follow_up/unqualified
    const stageIndex = i % 10;
    let dealStage: DealStage;
    if (stageIndex < 3) {
      dealStage = "closed_won";
    } else if (stageIndex < 7) {
      dealStage = "closed_lost";
    } else {
      dealStage = stageIndex % 2 === 0 ? "follow_up" : "unqualified";
    }

    // EXTRA BOOST: guarantee David & Emma have plenty of closed_won
    if (closer.id === "cl4" || closer.id === "cl5") {
      // every 3rd call for David/Emma is forced to be a win
      if (i % 3 === 0) {
        dealStage = "closed_won";
      }
    }

    // ---- Call status ----
    const statusIndex = i % 10;
    let callStatus: CallStatus;
    if (statusIndex < 6) callStatus = "show"; // 60%
    else if (statusIndex < 8) callStatus = "no_show"; // 20%
    else if (statusIndex === 8) callStatus = "cancelled"; // 10%
    else callStatus = "rescheduled"; // 10%

    // ---- Call time: last 90 days, 4 time-of-day buckets ----
    const dayOffset = i % 90; // 0–89 days back
    const bucket = i % 4;
    let hour: number;
    switch (bucket) {
      case 0:
        hour = 8; // Morning (6–12)
        break;
      case 1:
        hour = 14; // Afternoon (12–17)
        break;
      case 2:
        hour = 18; // Evening (17–21)
        break;
      default:
        hour = 21; // Night (21–24 / 0–6)
        break;
    }

    const timestamp =
      BASE_TIME - dayOffset * DAY_MS - hour * 60 * 60 * 1000;
    const callAt = new Date(timestamp).toISOString();

    // ---- Amount / commission / sales cycle ----
    let amount: number | null = null;
    let commissionAmount: number | null = null;
    let salesCycleDays: number | null = null;

    // Offer price band: 2k–10k in 1k steps
    const priceBand = 2000 + (i % 9) * 1000; // 2000..10000

    if (dealStage === "closed_won") {
      // ONLY wins produce revenue & commission
      amount = priceBand;
      commissionAmount = Math.round(amount * 0.1); // 10% commission
      salesCycleDays = 5 + (i % 41); // 5–45 days
    } else if (dealStage === "closed_lost") {
      // Lost deals do NOT produce revenue
      amount = null;
      commissionAmount = 0;
      salesCycleDays = 3 + (i % 28); // 3–30 days spent before losing
    } else {
      // follow_up / unqualified: no revenue yet
      amount = null;
      commissionAmount = null;
      salesCycleDays = null;
    }

    // ---- Nurture type rotation ----
    const nurtureIndex = i % 3;
    let nurtureType: NurtureType;
    if (nurtureIndex === 0) nurtureType = "redzone";
    else if (nurtureIndex === 1) nurtureType = "short_term";
    else nurtureType = "long_term";

    // ---- Appointment type ----
    const appointmentType: AppointmentType =
      (i % 10) < 7 ? "first_call" : "follow_up";

    records.push({
      id: `${i}`,
      companyId: company.id,
      closerId: closer.id,
      closerName: closer.name,
      source,
      dealStage,
      callStatus,
      amount, // ONLY non-null for closed_won
      commissionAmount,
      callAt,
      appointmentType,
      bookingSource,
      nurtureType,
      salesCycleDays
    });
  }

  return records;
}

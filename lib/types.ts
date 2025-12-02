// lib/types.ts

export type TrafficSource = "TikTok" | "YouTube" | "Instagram";

export type CallStatus = "show" | "no_show" | "cancelled" | "rescheduled";

export type DealStage =
  | "closed_won"
  | "closed_lost"
  | "follow_up"
  | "unqualified";

export type AppointmentType = "first_call" | "follow_up";

export type BookingSource = "Organic" | "Triage" | "Referral" | "Paid Ads";

export type NurtureType = "redzone" | "short_term" | "long_term";

export type Closer = {
  id: string;
  name: string;
};

export type Company = {
  id: string;
  name: string;
};

export type CallRecord = {
  id: string;
  companyId: string;
  closerId: string;
  closerName: string;
  source: TrafficSource;
  callStatus: CallStatus;
  dealStage: DealStage;
  amount: number | null;
  commissionAmount: number | null;
  callAt: string;

  appointmentType: AppointmentType;
  bookingSource: BookingSource;
  nurtureType: NurtureType;

  // Synthetic: approximate sales cycle in days for closed deals
  salesCycleDays: number | null;
};

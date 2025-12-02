// components/filters-bar.tsx
"use client";
import type { Closer } from "@/lib/types";

type TimeOfDayOption = "all" | "morning" | "afternoon" | "evening" | "night";
type DayOfWeekOption =
  | "all"
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";
type AppointmentTypeOption = "all" | "first_call" | "follow_up";
type BookingSourceOption =
  | "all"
  | "Organic"
  | "Triage"
  | "Referral"
  | "Paid Ads";
type NurtureTypeOption = "all" | "redzone" | "short_term" | "long_term";

import { CLOSERS } from "@/lib/sample-data";

type Props = {
  closerId: string | "all";
  onCloserChange: (id: string | "all") => void;

  timeOfDay: TimeOfDayOption;
  onTimeOfDayChange: (v: TimeOfDayOption) => void;

  dayOfWeek: DayOfWeekOption;
  onDayOfWeekChange: (v: DayOfWeekOption) => void;

  appointmentType: AppointmentTypeOption;
  onAppointmentTypeChange: (v: AppointmentTypeOption) => void;

  bookingSource: BookingSourceOption;
  onBookingSourceChange: (v: BookingSourceOption) => void;

  nurtureType: NurtureTypeOption;
  onNurtureTypeChange: (v: NurtureTypeOption) => void;

  comparisonEnabled: boolean;
  onToggleComparison: () => void;
};

export function FiltersBar({
  closerId,
  onCloserChange,
  timeOfDay,
  onTimeOfDayChange,
  dayOfWeek,
  onDayOfWeekChange,
  appointmentType,
  onAppointmentTypeChange,
  bookingSource,
  onBookingSourceChange,
  nurtureType,
  onNurtureTypeChange,
  comparisonEnabled,
  onToggleComparison
}: Props) {
  return (
    <div className="flex flex-col gap-3 bg-slate-900/60 border border-slate-800 rounded-2xl px-4 py-3">
      {/* Top row: closer + comparison toggle */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-3">
          <div className="flex flex-col">
            <label className="text-xs text-slate-400 mb-1">
              Closer (primary view)
            </label>
            <select
              value={closerId}
              onChange={e =>
                onCloserChange(e.target.value as "all" | string)
              }
              className="bg-slate-950/80 border border-slate-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All closers</option>
              {CLOSERS.map((cl: Closer) => (

                <option key={cl.id} value={cl.id}>
                  {cl.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="button"
          onClick={onToggleComparison}
          className={`text-xs px-3 py-1.5 rounded-full border transition ${
            comparisonEnabled
              ? "border-indigo-400 bg-indigo-500/10 text-indigo-200"
              : "border-slate-700 bg-slate-950/60 text-slate-300 hover:border-indigo-400/70 hover:text-indigo-200"
          }`}
        >
          {comparisonEnabled ? "Comparison mode: ON" : "Comparison mode: OFF"}
        </button>
      </div>

      {/* Second row: filters */}
      <div className="grid gap-3 md:grid-cols-5">
        <div className="flex flex-col">
          <label className="text-xs text-slate-400 mb-1">
            Time of day
          </label>
          <select
            value={timeOfDay}
            onChange={e =>
              onTimeOfDayChange(e.target.value as TimeOfDayOption)
            }
            className="bg-slate-950/80 border border-slate-700 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All</option>
            <option value="morning">Morning (6a–12p)</option>
            <option value="afternoon">Afternoon (12p–5p)</option>
            <option value="evening">Evening (5p–9p)</option>
            <option value="night">Night (9p–6a)</option>
          </select>
        </div>

        <div className="flex flex-col">
          <label className="text-xs text-slate-400 mb-1">
            Day of week
          </label>
          <select
            value={dayOfWeek}
            onChange={e =>
              onDayOfWeekChange(e.target.value as DayOfWeekOption)
            }
            className="bg-slate-950/80 border border-slate-700 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All</option>
            <option value="monday">Monday</option>
            <option value="tuesday">Tuesday</option>
            <option value="wednesday">Wednesday</option>
            <option value="thursday">Thursday</option>
            <option value="friday">Friday</option>
            <option value="saturday">Saturday</option>
            <option value="sunday">Sunday</option>
          </select>
        </div>

        <div className="flex flex-col">
          <label className="text-xs text-slate-400 mb-1">
            Appointment type
          </label>
          <select
            value={appointmentType}
            onChange={e =>
              onAppointmentTypeChange(
                e.target.value as AppointmentTypeOption
              )
            }
            className="bg-slate-950/80 border border-slate-700 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All</option>
            <option value="first_call">First call</option>
            <option value="follow_up">Follow up</option>
          </select>
        </div>

        <div className="flex flex-col">
          <label className="text-xs text-slate-400 mb-1">
            Booking source
          </label>
          <select
            value={bookingSource}
            onChange={e =>
              onBookingSourceChange(
                e.target.value as BookingSourceOption
              )
            }
            className="bg-slate-950/80 border border-slate-700 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All</option>
            <option value="Organic">Organic</option>
            <option value="Triage">Triage</option>
            <option value="Referral">Referral</option>
            <option value="Paid Ads">Paid Ads</option>
          </select>
        </div>

        <div className="flex flex-col">
          <label className="text-xs text-slate-400 mb-1">
            Nurture type
          </label>
          <select
            value={nurtureType}
            onChange={e =>
              onNurtureTypeChange(
                e.target.value as NurtureTypeOption
              )
            }
            className="bg-slate-950/80 border border-slate-700 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All</option>
            <option value="redzone">Redzone (&lt;=7 days)</option>
            <option value="short_term">Short term (7–30)</option>
            <option value="long_term">Long term (30+)</option>
          </select>
        </div>
      </div>
    </div>
  );
}

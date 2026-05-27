import { Booking, WeeklySchedule, WeekDay, DEFAULT_WEEKLY_SCHEDULE } from '../types';

const WEEK_KEY_BY_GETDAY: Record<number, WeekDay> = {
  0: 'sunday', 1: 'monday', 2: 'tuesday', 3: 'wednesday',
  4: 'thursday', 5: 'friday', 6: 'saturday',
};

export interface DayOption {
  dateStr: string; // YYYY-MM-DD
  dayNum: string;  // '22'
  monthLabel: string; // '05'
  dowAbbr: string; // 'SEG'
  isToday: boolean;
}

const DOW_ABBR = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];

export function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

export function nextNDays(n: number, from: Date = new Date()): DayOption[] {
  const todayStr = ymd(from);
  const out: DayOption[] = [];
  for (let i = 0; i < n; i++) {
    const d = new Date(from.getFullYear(), from.getMonth(), from.getDate() + i);
    const dateStr = ymd(d);
    out.push({
      dateStr,
      dayNum: String(d.getDate()).padStart(2, '0'),
      monthLabel: String(d.getMonth() + 1).padStart(2, '0'),
      dowAbbr: DOW_ABBR[d.getDay()],
      isToday: dateStr === todayStr,
    });
  }
  return out;
}

function toHHMM(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
}

// Generate "HH:MM" slots for the given date, respecting the weekly schedule.
// If schedule is omitted, falls back to DEFAULT_WEEKLY_SCHEDULE (back-compat).
export function generateDaySlots(
  dateISO: string,
  schedule: WeeklySchedule = DEFAULT_WEEKLY_SCHEDULE,
  slotMinutes = 30
): string[] {
  const d = new Date(dateISO + 'T00:00:00');
  const dayKey = WEEK_KEY_BY_GETDAY[d.getDay()];
  const ranges = schedule[dayKey] || [];
  const slots: string[] = [];
  for (const range of ranges) {
    const start = timeToMinutes(range.start);
    const end = timeToMinutes(range.end);
    for (let m = start; m + slotMinutes <= end; m += slotMinutes) {
      slots.push(toHHMM(m));
    }
  }
  return slots;
}

export function dayHasAnySlot(schedule: WeeklySchedule | undefined, dateISO: string): boolean {
  return generateDaySlots(dateISO, schedule ?? DEFAULT_WEEKLY_SCHEDULE).length > 0;
}

// Returns minutes since midnight (e.g. "14:30" -> 870)
export function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

// Returns true if [aStart, aEnd) and [bStart, bEnd) overlap
export function overlap(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && bStart < aEnd;
}

// Slot is "now or past" relative to the given Date (default = system now), with a buffer.
// If `dateStr` is in the future, always returns false.
export function isSlotPast(dateStr: string, hhmm: string, bufferMin = 15, now: Date = new Date()): boolean {
  const todayStr = ymd(now);
  if (dateStr > todayStr) return false;
  if (dateStr < todayStr) return true;
  const nowMin = now.getHours() * 60 + now.getMinutes();
  return timeToMinutes(hhmm) < nowMin + bufferMin;
}

export interface SlotAvailability {
  time: string;
  past: boolean;
  conflict: boolean; // overlaps an existing non-cancelled booking for that specialist
}

export function computeSlotAvailability(params: {
  dateStr: string;
  durationMin: number;
  specialistId: string;
  bookings: Booking[];
  schedule?: WeeklySchedule;
  slots?: string[];
  now?: Date;
}): SlotAvailability[] {
  const slots = params.slots ?? generateDaySlots(params.dateStr, params.schedule);
  const now = params.now ?? new Date();
  const dayBookings = params.bookings.filter(b =>
    b.specialistId === params.specialistId &&
    b.date === params.dateStr &&
    b.status !== 'cancelado'
  );

  return slots.map(time => {
    const start = timeToMinutes(time);
    const end = start + Math.max(params.durationMin, 1);
    const conflict = dayBookings.some(b => {
      const bStart = timeToMinutes(b.time);
      const bEnd = bStart + (b.totalDuration || 30);
      return overlap(start, end, bStart, bEnd);
    });
    return {
      time,
      past: isSlotPast(params.dateStr, time, 15, now),
      conflict,
    };
  });
}

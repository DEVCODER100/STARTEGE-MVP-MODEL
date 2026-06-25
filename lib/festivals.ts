// Hardcoded Indian festival calendar used by the "+ Festival theme" quick-add
// chip. nearestFestival() returns the next festival within a window from today.

export interface Festival {
  name: string;
  date: string; // ISO YYYY-MM-DD
}

// Approximate dates; refresh yearly. Sorted chronologically.
export const FESTIVALS: Festival[] = [
  { name: "Makar Sankranti", date: "2026-01-14" },
  { name: "Republic Day", date: "2026-01-26" },
  { name: "Maha Shivaratri", date: "2026-02-15" },
  { name: "Holi", date: "2026-03-04" },
  { name: "Ugadi / Gudi Padwa", date: "2026-03-19" },
  { name: "Eid al-Fitr", date: "2026-03-21" },
  { name: "Ram Navami", date: "2026-03-27" },
  { name: "Baisakhi", date: "2026-04-14" },
  { name: "Buddha Purnima", date: "2026-05-01" },
  { name: "Eid al-Adha", date: "2026-05-27" },
  { name: "Rath Yatra", date: "2026-07-16" },
  { name: "Onam", date: "2026-08-26" },
  { name: "Raksha Bandhan", date: "2026-08-28" },
  { name: "Janmashtami", date: "2026-09-04" },
  { name: "Ganesh Chaturthi", date: "2026-09-14" },
  { name: "Navratri", date: "2026-10-11" },
  { name: "Dussehra", date: "2026-10-20" },
  { name: "Karva Chauth", date: "2026-10-29" },
  { name: "Dhanteras", date: "2026-11-06" },
  { name: "Diwali", date: "2026-11-08" },
  { name: "Bhai Dooj", date: "2026-11-10" },
  { name: "Chhath Puja", date: "2026-11-15" },
  { name: "Christmas", date: "2026-12-25" },
  { name: "New Year", date: "2027-01-01" },
];

function startOfDay(d: Date): number {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

/**
 * The nearest upcoming festival within `windowDays` of `from` (default: today,
 * within 14 days). Returns null if nothing is coming up that soon.
 */
export function nearestFestival(
  windowDays = 14,
  from: Date = new Date()
): Festival | null {
  const today = startOfDay(from);
  const limit = today + windowDays * 86400000;
  for (const f of FESTIVALS) {
    const fd = startOfDay(new Date(f.date + "T00:00:00Z"));
    if (fd >= today && fd <= limit) return f;
  }
  return null;
}

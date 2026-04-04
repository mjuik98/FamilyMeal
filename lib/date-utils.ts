const APP_TIMEZONE_OFFSET_MINUTES = 9 * 60;
const APP_TIMEZONE_OFFSET_MS = APP_TIMEZONE_OFFSET_MINUTES * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

const padTwoDigits = (value: number) => `${value}`.padStart(2, "0");

const getAppTimeDate = (value: Date | number): Date =>
  new Date((typeof value === "number" ? value : value.getTime()) + APP_TIMEZONE_OFFSET_MS);

const getAppDateParts = (
  value: Date | number
): {
  year: number;
  month: number;
  day: number;
  hours: number;
  minutes: number;
  weekday: number;
} => {
  const date = getAppTimeDate(value);

  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
    hours: date.getUTCHours(),
    minutes: date.getUTCMinutes(),
    weekday: date.getUTCDay(),
  };
};

const parseDateKeyParts = (
  value: string | null
): { year: number; month: number; day: number } | null => {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;

  const [year, month, day] = value.split("-").map(Number);
  const validated = new Date(Date.UTC(year, month - 1, day));
  if (
    validated.getUTCFullYear() !== year ||
    validated.getUTCMonth() !== month - 1 ||
    validated.getUTCDate() !== day
  ) {
    return null;
  }

  return { year, month, day };
};

const buildAppDate = (
  parts: { year: number; month: number; day: number },
  hours: number,
  minutes: number
): Date =>
  new Date(
    Date.UTC(parts.year, parts.month - 1, parts.day, hours, minutes, 0, 0) -
      APP_TIMEZONE_OFFSET_MS
  );

export const formatDateKey = (date: Date) => {
  const parts = getAppDateParts(date);
  return `${parts.year}-${padTwoDigits(parts.month)}-${padTwoDigits(parts.day)}`;
};

export const formatTimeKey = (date: Date) => {
  const parts = getAppDateParts(date);
  return `${padTwoDigits(parts.hours)}:${padTwoDigits(parts.minutes)}`;
};

export const parseDateKey = (value: string | null): Date | null => {
  const parts = parseDateKeyParts(value);
  if (!parts) return null;

  const nextDate = buildAppDate(parts, 12, 0);
  return formatDateKey(nextDate) === value ? nextDate : null;
};

export const parseTimeKey = (
  value: string | null
): { hours: number; minutes: number } | null => {
  if (!value || !/^\d{2}:\d{2}$/.test(value)) return null;

  const [hours, minutes] = value.split(":").map(Number);
  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }

  return { hours, minutes };
};

export const combineDateAndTime = (
  dateValue: string | null,
  timeValue: string | null
): Date | null => {
  const dateParts = parseDateKeyParts(dateValue);
  const time = parseTimeKey(timeValue);
  if (!dateParts || !time) {
    return null;
  }

  const nextDate = buildAppDate(dateParts, time.hours, time.minutes);
  if (formatDateKey(nextDate) !== dateValue || formatTimeKey(nextDate) !== timeValue) {
    return null;
  }

  return nextDate;
};

export const getDayRangeForDate = (
  date: Date
): { startOfDay: Date; endOfDay: Date } => {
  const parts = parseDateKeyParts(formatDateKey(date));
  if (!parts) {
    throw new Error("Invalid date");
  }

  const startOfDay = buildAppDate(parts, 0, 0);
  return {
    startOfDay,
    endOfDay: new Date(startOfDay.getTime() + DAY_MS - 1),
  };
};

export const getAppDayOfWeek = (date: Date): number => getAppDateParts(date).weekday;

export const getWeekDatesForDate = (referenceDate: Date): Date[] => {
  const normalizedReference = parseDateKey(formatDateKey(referenceDate));
  if (!normalizedReference) {
    return [];
  }

  const startOfWeek = new Date(
    normalizedReference.getTime() - getAppDayOfWeek(normalizedReference) * DAY_MS
  );

  return Array.from({ length: 7 }, (_, index) => new Date(startOfWeek.getTime() + index * DAY_MS));
};

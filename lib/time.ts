export const formatRelativeTime = (timestamp: number): string => {
  const diffSeconds = Math.round((timestamp - Date.now()) / 1000);
  const abs = Math.abs(diffSeconds);
  const formatter = new Intl.RelativeTimeFormat("ko", { numeric: "auto" });

  if (abs < 60) return formatter.format(Math.trunc(diffSeconds), "second");
  if (abs < 3600) return formatter.format(Math.trunc(diffSeconds / 60), "minute");
  if (abs < 86400) return formatter.format(Math.trunc(diffSeconds / 3600), "hour");
  if (abs < 604800) return formatter.format(Math.trunc(diffSeconds / 86400), "day");
  if (abs < 2592000) return formatter.format(Math.trunc(diffSeconds / 604800), "week");
  if (abs < 31536000) return formatter.format(Math.trunc(diffSeconds / 2592000), "month");
  return formatter.format(Math.trunc(diffSeconds / 31536000), "year");
};

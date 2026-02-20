import { formatInTimeZone } from "date-fns-tz";
import type { Locale } from "date-fns";

/** Format a UTC/ISO date string in a given IANA timezone */
export function formatInZone(
  utcStr: string,
  tz: string,
  fmtStr: string,
  locale?: Locale,
) {
  return formatInTimeZone(utcStr, tz, fmtStr, { locale });
}

const CITY_LABELS: Record<string, { fr: string; en: string }> = {
  "America/New_York": { fr: "Norfolk, VA", en: "Norfolk, VA" },
  "America/Chicago": { fr: "Chicago", en: "Chicago" },
  "America/Denver": { fr: "Denver", en: "Denver" },
  "America/Los_Angeles": { fr: "Los Angeles", en: "Los Angeles" },
  "Europe/Paris": { fr: "Paris", en: "Paris" },
  "Europe/London": { fr: "Londres", en: "London" },
};

/** Map an IANA timezone to a friendly city name */
export function getCityLabel(timezone: string, lang: "fr" | "en"): string {
  return CITY_LABELS[timezone]?.[lang] ?? timezone.replace(/_/g, " ").split("/").pop()!;
}

/** Produce a counterpart time hint like "(08:00 à Norfolk, VA)" */
export function formatCounterpartHint(
  utcStr: string,
  counterpartTz: string,
  lang: "fr" | "en",
  locale?: Locale,
): string {
  const time = formatInZone(utcStr, counterpartTz, "HH:mm", locale);
  const city = getCityLabel(counterpartTz, lang);
  const prep = lang === "fr" ? "\u00e0" : "in"; // à / in
  return `(${time} ${prep} ${city})`;
}

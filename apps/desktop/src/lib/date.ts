import { useState, useEffect } from "react";

const MONTHS_FULL = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];
const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

export function parseGitDate(dateInput: string | Date | number): Date {
  if (dateInput instanceof Date) return dateInput;
  if (typeof dateInput === "number") return new Date(dateInput);

  if (/^\d+$/.test(dateInput)) {
    return new Date(parseInt(dateInput, 10));
  }

  const normalized = dateInput.replace(
    /^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2}) ([+-]\d{2})(\d{2})$/,
    "$1T$2$3:$4",
  );
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    const direct = new Date(dateInput);
    if (!Number.isNaN(direct.getTime())) {
      return direct;
    }
    return new Date(NaN);
  }
  return parsed;
}

export function formatDateString(date: Date, pattern: string): string {
  if (Number.isNaN(date.getTime())) {
    return "Invalid Date";
  }

  const YYYY = date.getFullYear();
  const YY = String(YYYY).slice(-2);
  const M = date.getMonth() + 1;
  const MM = String(M).padStart(2, "0");
  const MMMM = MONTHS_FULL[date.getMonth()];
  const MMM = MONTHS_SHORT[date.getMonth()];
  const D = date.getDate();
  const DD = String(D).padStart(2, "0");
  const H = date.getHours();
  const HH = String(H).padStart(2, "0");
  const h = H % 12 || 12;
  const hh = String(h).padStart(2, "0");
  const m = date.getMinutes();
  const mm = String(m).padStart(2, "0");
  const s = date.getSeconds();
  const ss = String(s).padStart(2, "0");
  const A = H >= 12 ? "PM" : "AM";
  const a = H >= 12 ? "pm" : "am";

  return pattern
    .replace(/YYYY/g, String(YYYY))
    .replace(/YY/g, YY)
    .replace(/MMMM/g, MMMM)
    .replace(/MMM/g, MMM)
    .replace(/MM/g, MM)
    .replace(/M/g, String(M))
    .replace(/DD/g, DD)
    .replace(/D/g, String(D))
    .replace(/HH/g, HH)
    .replace(/H/g, String(H))
    .replace(/hh/g, hh)
    .replace(/h/g, String(h))
    .replace(/mm/g, mm)
    .replace(/m/g, String(m))
    .replace(/ss/g, ss)
    .replace(/s/g, String(s))
    .replace(/A/g, A)
    .replace(/a/g, a);
}

export function formatRelativeTime(date: Date): string {
  const now = new Date();
  
  // Get calendar date boundaries
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  
  if (targetDate.getTime() === today.getTime()) {
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.max(0, Math.floor(diffMs / 1000));
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);

    if (diffSecs < 10) return "Just now";
    if (diffSecs < 60) return `${diffSecs}s ago`;
    if (diffMins < 60) return `${diffMins}m ago`;
    return `${diffHours}h ago`;
  }
  
  return formatDateString(date, "YYYY-MM-DD HH:mm");
}

export function formatCommitDate(dateInput: string | Date | number): string {
  const format = localStorage.getItem("gitflowDateFormat") || "relative";
  const customFormat = localStorage.getItem("gitflowCustomDateFormat") || "YYYY-MM-DD HH:mm";
  const date = parseGitDate(dateInput);

  if (Number.isNaN(date.getTime())) {
    return typeof dateInput === "string" ? dateInput : "Invalid Date";
  }

  if (format === "relative") {
    return formatRelativeTime(date);
  }

  const pattern = format === "custom" ? customFormat : format;
  return formatDateString(date, pattern);
}

export function useCommitDateFormatter() {
  const [format, setFormat] = useState(() => localStorage.getItem("gitflowDateFormat") || "relative");
  const [customFormat, setCustomFormat] = useState(() => localStorage.getItem("gitflowCustomDateFormat") || "YYYY-MM-DD HH:mm");

  useEffect(() => {
    const handleUpdate = () => {
      setFormat(localStorage.getItem("gitflowDateFormat") || "relative");
      setCustomFormat(localStorage.getItem("gitflowCustomDateFormat") || "YYYY-MM-DD HH:mm");
    };

    window.addEventListener("gitflow-settings-updated", handleUpdate);
    return () => {
      window.removeEventListener("gitflow-settings-updated", handleUpdate);
    };
  }, []);

  return (dateInput: string | Date | number) => {
    const date = parseGitDate(dateInput);

    if (Number.isNaN(date.getTime())) {
      return typeof dateInput === "string" ? dateInput : "Invalid Date";
    }

    if (format === "relative") {
      return formatRelativeTime(date);
    }

    const pattern = format === "custom" ? customFormat : format;
    return formatDateString(date, pattern);
  };
}

export type LocalTimeDisplay = {
  display: string;
  dateTime: string;
};

export function formatLocalTime(date: Date): LocalTimeDisplay {
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const seconds = date.getSeconds().toString().padStart(2, "0");

  return {
    display: `${hours}:${minutes}:${seconds}`,
    dateTime: date.toISOString(),
  };
}

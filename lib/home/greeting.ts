export function getTimeAwareGreeting(now = new Date()): string {
  const hour = now.getHours();

  if (hour < 12) {
    return "Good morning";
  }

  if (hour < 17) {
    return "Good afternoon";
  }

  return "Good evening";
}

export function getGreetingSubtitle(): string {
  return "Ready for a tiny start?";
}

export const myTimezone =
  Intl.DateTimeFormat().resolvedOptions().timeZone ||
  Intl.supportedValuesOf("timeZone")[0];

export const Timezones = Intl.supportedValuesOf("timeZone").sort((a, b) => {
  if (a === myTimezone) return -1;
  if (b === myTimezone) return 1;
  return a.localeCompare(b);
});

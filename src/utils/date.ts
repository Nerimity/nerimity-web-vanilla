import { t } from "@lingui/core/macro";
let timeFormat: number = 24;

export const formatters = (() => {
  // const lang = getCurrentLanguageISO();
  // const options = [lang, "en-GB"];
  const options = ["en-GB"];
  return {
    duration: {
      long: new Intl.DurationFormat(options, {
        style: "long",
      }),
      narrow: new Intl.DurationFormat(options, {
        style: "narrow",
      }),
      narrowForceSeconds: new Intl.DurationFormat(options, {
        style: "narrow",
        secondsDisplay: "always",
      }),
      // H:MM:SS or MM:SS
      digital: new Intl.DurationFormat(options, {
        style: "narrow",
        hoursDisplay: "auto",
        hours: "numeric",
        minutes: "2-digit",
        seconds: "2-digit",
      }),
      // H:MM:SS or M:SS
      digitalShort: new Intl.DurationFormat(options, {
        style: "narrow",
        hoursDisplay: "auto",
        hours: "numeric",
        minutes: "numeric",
        seconds: "2-digit",
      }),
    },
    datetime: {
      longDate: new Intl.DateTimeFormat(options, {
        dateStyle: "full",
        timeStyle: "short",
        hour12: timeFormat === 12,
      }),
      mediumDate: new Intl.DateTimeFormat(options, {
        dateStyle: "medium",
        timeStyle: "short",
        hour12: timeFormat === 12,
      }),
      dateOnly: new Intl.DateTimeFormat(options, {
        dateStyle: "medium",
      }),
      time: new Intl.DateTimeFormat(options, {
        timeStyle: "short",
        hour12: timeFormat === 12,
      }),
      seconds: new Intl.DateTimeFormat(options, {
        timeStyle: "medium",
        hour12: timeFormat === 12,
      }),
    },
    relative: new Intl.RelativeTimeFormat(options, {
      numeric: "auto",
    }),
  };
})();

// hh:mm | Yesterday at hh:mm | dd/mm/yyyy at hh:mm
export function friendlyTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();

  const time = date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  if (isToday) return time;

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  if (isYesterday) return `Yesterday at ${time}`;

  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();

  return `${dd}/${mm}/${yyyy} at ${time}`;
}

// Tuesday, 26 May 2026
export function fullDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export const formatExpiry = (expiresAt: number): string => {
  const ms = expiresAt - Date.now();
  if (ms <= 0) return t`Expired`;

  const minutes = Math.floor(ms / 1000 / 60);
  if (minutes < 60) return t`Expires in ${minutes}m`;

  const hours = Math.floor(minutes / 60);
  return t`Expires in ${hours}h`;
};

export function calculateTimeElapsedForActivityStatus(
  startTime: number,
  music = false,
  speed = 1,
  updatedAt?: number,
) {
  try {
    if (music) {
      return activityMusicTimeElapsed(startTime, speed, updatedAt);
    }
    return activityStatusDuration(startTime);
  } catch (e) {
    console.warn(e);
    return t`Error`;
  }
}

function activityMusicTimeElapsed(
  timestamp: number,
  speed = 1,
  updatedAt?: number,
) {
  const ms = Date.now() - timestamp;
  let seconds = ms / 1000;

  if (updatedAt) {
    const seekedSeconds = (updatedAt - timestamp) / 1000;
    const seekedSecondsWithSpeed = seekedSeconds * speed;
    const seekedSpeed = -(seekedSeconds - seekedSecondsWithSpeed);
    seconds = seconds * speed - seekedSpeed;
  }
  return formatMillisElapsedDigital(seconds * 1000);
}

function activityStatusDuration(startTime: number) {
  const now = Temporal.Now.zonedDateTimeISO();
  const start = Temporal.Instant.fromEpochMilliseconds(
    Math.round(startTime),
  ).toZonedDateTimeISO(now.timeZoneId);
  let elapsed = start.until(now, {
    largestUnit: "years",
  });

  if (elapsed.sign == -1) {
    elapsed = new Temporal.Duration();
  }
  const rounded = roundDuration(elapsed, start, { useWeeks: true });

  const formatter = rounded.secondsOnly
    ? formatters.duration.narrowForceSeconds
    : formatters.duration.narrow;
  return formatter.format(rounded.duration);
}

function roundDuration(
  duration: Temporal.Duration,
  start?: Temporal.ZonedDateTime,
  options?: {
    useWeeks?: boolean;
    largestUnit?: Temporal.RoundingOptionsWithLargestUnit<
      Temporal.DateUnit | Temporal.TimeUnit
    >["largestUnit"];
    roundingMode?: Temporal.RoundingOptions<
      Temporal.DateUnit | Temporal.TimeUnit
    >["roundingMode"];
    roundingIncrement?: number;
  },
) {
  if (options?.largestUnit) {
    // Ensure the duration is balanced (turn 150s to 2m 30s)
    duration = duration.round({
      relativeTo: start,
      largestUnit: options.largestUnit,
    });
  }

  if (options?.useWeeks) {
    duration = duration.with({
      weeks: duration.weeks + Math.floor(duration.days / 7),
      days: duration.days % 7,
    });
  }

  const baseDuration = duration;
  if (duration.sign === -1) {
    duration = duration.negated();
  }

  let smallestUnit: Temporal.RoundingOptions<
    Temporal.DateUnit | Temporal.TimeUnit
  >["smallestUnit"];
  let secondsOnly = false;
  if (duration.years > 0) {
    smallestUnit = "months";
  } else if (duration.months > 0) {
    smallestUnit = options?.useWeeks ? "weeks" : "days";
  } else if (duration.weeks > 0) {
    smallestUnit = "days";
  } else if (duration.days > 0) {
    smallestUnit = "hours";
  } else if (duration.hours > 0) {
    smallestUnit = "minutes";
  } else if (duration.minutes > 0) {
    smallestUnit = "seconds";
  } else {
    secondsOnly = true;
    smallestUnit = "seconds";
  }

  const rounded = baseDuration.round({
    relativeTo: start,
    smallestUnit,
    ...options,
  });
  return {
    duration: rounded,
    secondsOnly,
  };
}

export function formatMillisElapsedDigital(milliseconds: number) {
  try {
    const duration = Temporal.Duration.from({
      milliseconds: Math.round(milliseconds),
    });
    const rounded = duration.round({
      largestUnit: "hour",
      smallestUnit: "second",
      roundingMode: "floor",
    });
    return formatters.duration.digitalShort.format(rounded);
  } catch (e) {
    console.warn(e);
    return t`Error`;
  }
}

export function formatTimestamp(timestampMs: number, seconds = false) {
  try {
    const today = Temporal.Now.zonedDateTimeISO();
    const timestamp = Temporal.Instant.fromEpochMilliseconds(
      Math.round(timestampMs),
    )
      .toZonedDateTimeISO(today.timeZoneId)
      .round({
        roundingMode: "trunc",
        smallestUnit: "second",
      });

    const yesterday = today.subtract(Temporal.Duration.from({ days: 1 }));
    const date = timestamp.toPlainDate();
    const dateValue = new Date(timestamp.toInstant().epochMilliseconds);

    const dateFormat = formatters.datetime.dateOnly;
    const timeFormat = seconds
      ? formatters.datetime.seconds
      : formatters.datetime.time;

    if (date.equals(today.toPlainDate())) {
      return timeFormat.format(dateValue);
    } else if (date.equals(yesterday.toPlainDate())) {
      const time = timeFormat.format(dateValue);
      return t`Yesterday at ${time}`;
    } else {
      const date = dateFormat.format(dateValue);
      const time = timeFormat.format(dateValue);
      return t`${date} at ${time}`;
    }
  } catch (e) {
    console.warn(e);
    return t`Error`;
  }
}

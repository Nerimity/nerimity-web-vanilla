export const convertShorthandToLinearGradient = (shorthand?: string) => {
  if (!shorthand) return null;
  const parts = shorthand.trim().split(/\s+/);

  if (parts.length < 3 || parts.length > 5) {
    return null;
  }

  const startMatch = parts[0]?.match(/^lg(\d+)(#[a-f0-9]{3,6})$/i);
  if (!startMatch) return null;

  const degree = startMatch[1];
  const colors = [startMatch[2]];
  const stops: string[] = [];

  for (let i = 1; i < parts.length - 1; i++) {
    const middleMatch = parts[i]?.match(/^(\d+)(#[a-f0-9]{3,6})$/i);
    if (!middleMatch) return null;

    stops.push(middleMatch[1]!);
    colors.push(middleMatch[2]);
  }

  const endMatch = parts[parts.length - 1]?.match(/^(\d+)$/);
  if (!endMatch) return null;

  stops.push(endMatch[1]!);

  const cssStops = colors.map((hex, i) => `${hex} ${stops[i]}%`).join(", ");

  // return { gradient: `linear-gradient(${degree}deg, ${cssStops})`, colors };
  return `linear-gradient(${degree}deg, ${cssStops})`;
};

export interface ColorStop {
  color: string;
  percent: number;
}

interface GradientData {
  angle: number;
  stops: ColorStop[];
}

const splitGradientParts = (value: string) => {
  const parts: string[] = [];
  let current = "";
  let depth = 0;

  for (let i = 0; i < value.length; i++) {
    const char = value[i]!;
    if (char === "(") depth += 1;
    if (char === ")") depth = Math.max(0, depth - 1);

    if (char === "," && depth === 0) {
      parts.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  if (current.trim()) {
    parts.push(current.trim());
  }

  return parts;
};

const isSupportedColorStop = (value: string) =>
  /^#([a-f0-9]{3,4}|[a-f0-9]{6}|[a-f0-9]{8})$/i.test(value) ||
  /^rgba?\(/i.test(value) ||
  /^hsla?\(/i.test(value);

export const parseGradient = (str: string): GradientData => {
  const match = str.match(/linear-gradient\((.*)\)/i)?.[1] ?? "";

  if (!match) {
    return { angle: 180, stops: [] };
  }

  const parts = splitGradientParts(match);

  let angle = 180;
  const firstPart = parts[0] ?? "";

  if (firstPart.toLowerCase().includes("deg")) {
    const degMatch = firstPart.match(/^(\d+)deg$/i);
    if (degMatch?.[1]) {
      angle = parseInt(degMatch[1], 10);
    }
    parts.shift();
  }

  const stops = parts.reduce((acc: ColorStop[], part) => {
    const stopMatch = part.match(/^(.+?)\s+(\d+(?:\.\d+)?)%$/);
    const color = stopMatch?.[1]?.trim();
    const percent = stopMatch?.[2];

    if (color && percent && isSupportedColorStop(color)) {
      acc.push({
        color,
        percent: parseFloat(percent),
      });
    }

    return acc;
  }, []);

  return { angle, stops };
};

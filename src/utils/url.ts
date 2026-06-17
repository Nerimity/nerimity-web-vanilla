export const safeDecodeURIComponent = (val: string) => {
  try {
    return decodeURIComponent(val);
  } catch {
    console.error("could not decode", val);
    return "Decode Fail " + val;
  }
};

export const getFilenameFromPath = (path: string | undefined): string =>
  path?.split("/").at(-1)!;

export const prettyBytes = (num: number, precision = 2) => {
  const UNITS = ["B", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
  if (Math.abs(num) < 1) return num + " ";
  const exponent = Math.min(
    Math.floor(Math.log10(num) / Math.log10(1024)),
    UNITS.length - 1,
  );
  const n = Number(((num < 0 ? -1 : 1) * num) / Math.pow(1024, exponent));
  return (num < 0 ? "-" : "") + n.toFixed(precision) + " " + UNITS[exponent];
};

export const isImage = (file: File) => file.type.startsWith("image/");

export const isMoreThan12MB = (file: File) => file.size > 12 * 1024 * 1024;
export const isMoreThan50MB = (file: File) => file.size > 50 * 1024 * 1024;

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.addEventListener(
      "load",
      () => {
        resolve(reader.result as string);
      },
      false,
    );

    reader.readAsDataURL(file);
  });
}

export async function fileToDimensions(file: File) {
  const img = new Image();

  const url = await fileToDataUrl(file);
  img.src = url;
  return new Promise<{
    width: number;
    height: number;
    image: HTMLImageElement;
  }>((resolve) => {
    img.onload = () => {
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight,
        image: img,
      });
    };
  });
}

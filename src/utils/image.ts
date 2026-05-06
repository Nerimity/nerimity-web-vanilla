import { cdnUrl } from "../config";

export function buildImageUrl(
  url: string,
  options: {
    size?: number;
    animate?: boolean;
    forceIsAnimated?: boolean;
  } = {},
) {
  const { size, animate, forceIsAnimated } = options;
  const uri = new URL(`${cdnUrl}${url}`);

  const endsWithGif = uri.pathname.endsWith(".gif");
  const endsWithHashA = uri.hash === "#a";
  const isAnimated = endsWithGif || endsWithHashA || forceIsAnimated === true;

  if (!isAnimated && size == null) return [uri.toString(), false] as const;

  if ((isAnimated && animate == null) || animate === false) {
    uri.searchParams.set("type", "webp");
  }

  if (size != null) uri.searchParams.set("size", size.toString());

  return [uri.toString(), isAnimated] as const;
}

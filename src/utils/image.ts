import { cdnUrl } from "../config";

export function buildImageUrl(
  url?: string,
  options: {
    size?: number;
    animate?: boolean;
    forceIsAnimated?: boolean;
  } = {},
) {
  if (!url) return [null, false, null] as const;
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

type Dimensions = {
  width: number;
  height: number;
};

interface ConstrainParams {
  width: number;
  height: number;
  maxWidth: number;
  maxHeight: number;
}

export function constrainDimensions({
  width,
  height,
  maxWidth,
  maxHeight,
}: ConstrainParams): Dimensions {
  const ratio = width / height;

  if (width > maxWidth) {
    width = maxWidth;
    height = width / ratio;
  }

  if (height > maxHeight) {
    height = maxHeight;
    width = height * ratio;
  }

  return { width: width, height: height };
}

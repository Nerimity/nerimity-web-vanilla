import type { ImageCropModalProps } from "./ImageCropModal";

export const createImageCropModalLazy = async (props: ImageCropModalProps) => {
  const { createImageCropModal } = await import("./ImageCropModal");
  return createImageCropModal(props);
};

import type { createImageCropModal } from "./ImageCropModal";

export const createImageCropModalLazy = async (
  ...params: Parameters<typeof createImageCropModal>
) => {
  return (await import("./ImageCropModal")).createImageCropModal(...params);
};

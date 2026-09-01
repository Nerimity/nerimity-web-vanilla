import type { ColorPickerModalOpts } from "./createColorPickerModal";

export const createColorPickerModalLazy = async (
  opts: ColorPickerModalOpts,
) => {
  const { createColorPickerModal } = await import("./createColorPickerModal");
  return createColorPickerModal(opts);
};

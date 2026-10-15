import type { ColorPickerModalOpts } from "./createColorPickerModal";

export const createColorPickerModalLazy = async (
  opts: ColorPickerModalOpts,
) => {
  const { _createColorPickerModal } = await import("./createColorPickerModal");
  return _createColorPickerModal(opts);
};

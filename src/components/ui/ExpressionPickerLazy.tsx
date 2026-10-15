import type { ExpressionPickerProps } from "./ExpressionPicker";

export const ExpressionPickerLazy = async (opts: ExpressionPickerProps) => {
  const { _createExpressionPicker } = await import("./ExpressionPicker");
  _createExpressionPicker(opts);
};

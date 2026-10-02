export const lazySortable = async () => {
  const res = await import("sortablejs");
  return res.default;
};

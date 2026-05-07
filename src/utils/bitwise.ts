export const hasBit = (permissions: number | undefined, bit: number) => {
  return ((permissions || 0) & bit) === bit;
};

export const addBit = (permissions: number, bit: number) => {
  return permissions | bit;
};
export const removeBit = (permissions: number, bit: number) => {
  return permissions & ~bit;
};

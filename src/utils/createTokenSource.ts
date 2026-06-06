export const createTokenSource = () => {
  let current = 0;

  const invalidate = () => ++current;

  const capture = () => {
    const token = ++current;
    const isStale = () => token !== current;
    return isStale;
  };

  return { capture, invalidate };
};

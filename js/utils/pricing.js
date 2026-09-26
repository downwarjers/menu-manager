export const applyCustomRounding = (val, mode) => {
  if (!mode || mode === 'round1') {
    return Math.round(val);
  }
  if (mode === 'ceil5') {
    return Math.ceil(val / 5) * 5;
  }
  if (mode === 'ceil10') {
    return Math.ceil(val / 10) * 10;
  }
  if (mode === 'end9') {
    const baseRound = Math.ceil(val);
    const rem = baseRound % 10;
    return rem <= 9 ? baseRound + (9 - rem) : baseRound + 9;
  }
  if (mode === 'end8') {
    const baseRound = Math.ceil(val);
    const rem = baseRound % 10;
    return rem <= 8 ? baseRound + (8 - rem) : baseRound + (18 - rem);
  }
  return Math.round(val);
};

export const calculateMarkupPrice = (basePrice, markupPercent, roundMode) => {
  const rate = 1 + (Number(markupPercent) || 0) / 100;
  return applyCustomRounding((Number(basePrice) || 0) * rate, roundMode);
};

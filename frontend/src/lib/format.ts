// One price format for the whole site: "$250" for whole dollars, "$22.73" when there are cents.
export const money = (n: number | string | null | undefined) => {
  const value = Math.round(Number(n || 0) * 100) / 100;
  const cents = Number.isInteger(value) ? 0 : 2;
  return '$' + value.toLocaleString('en-AU', { minimumFractionDigits: cents, maximumFractionDigits: cents });
};

/**
 * Academy API uses integer fils for QAR currency (1 QAR = 100 dirhams/fils or base integer units).
 */
export function formatQAR(amountInFils: number | undefined | null): string {
  if (amountInFils == null || isNaN(amountInFils)) {
    return '0.00 QAR';
  }
  // Standard conversion 1 QAR = 100 units/fils
  const qar = amountInFils / 100;
  return `${qar.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} QAR`;
}

/**
 * Converts user input QAR to integer fils (e.g., 250.50 QAR -> 25050 fils)
 */
export function qarToFils(qarAmount: number | string): number {
  const num = typeof qarAmount === 'string' ? parseFloat(qarAmount) : qarAmount;
  if (isNaN(num)) return 0;
  return Math.round(num * 100);
}

/**
 * Converts fils to input QAR value (e.g., 25050 fils -> 250.5)
 */
export function filsToQar(amountInFils: number | undefined | null): number {
  if (amountInFils == null || isNaN(amountInFils)) return 0;
  return amountInFils / 100;
}

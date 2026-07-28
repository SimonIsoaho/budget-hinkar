import type { BudgetPeriod, BucketTransaction } from './types';

/** Period runs from the 25th inclusive to the 24th inclusive. */
export function getCurrentPeriod(now = new Date()): BudgetPeriod {
  const day = now.getDate();

  if (day >= 25) {
    return {
      start: new Date(now.getFullYear(), now.getMonth(), 25, 0, 0, 0, 0),
      end: new Date(now.getFullYear(), now.getMonth() + 1, 24, 23, 59, 59, 999),
    };
  }

  return {
    start: new Date(now.getFullYear(), now.getMonth() - 1, 25, 0, 0, 0, 0),
    end: new Date(now.getFullYear(), now.getMonth(), 24, 23, 59, 59, 999),
  };
}

export function formatPeriodLabel(period: BudgetPeriod): string {
  const fmt = new Intl.DateTimeFormat('sv-SE', {
    day: 'numeric',
    month: 'short',
  });
  return `${fmt.format(period.start)} – ${fmt.format(period.end)}`;
}

export function summarizePeriodCashflow(transactions: BucketTransaction[]): {
  incoming: number;
  outgoing: number;
} {
  let incoming = 0;
  let outgoing = 0;

  for (const tx of transactions) {
    if (tx.transfer_id) continue;
    if (tx.direction === 'add') incoming += tx.amount;
    else outgoing += tx.amount;
  }

  return {
    incoming: Math.round(incoming * 100) / 100,
    outgoing: Math.round(outgoing * 100) / 100,
  };
}

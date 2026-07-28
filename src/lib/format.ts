export function formatAmount(amount: number): string {
  const formatted = new Intl.NumberFormat('sv-SE', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);

  return `${formatted} kr`;
}

export function formatSignedAmount(amount: number, direction: 'add' | 'remove'): string {
  const formatted = new Intl.NumberFormat('sv-SE', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);

  const sign = direction === 'add' ? '+' : '−';
  return `${sign}${formatted} kr`;
}

export function formatTransactionDate(iso: string): string {
  return new Intl.DateTimeFormat('sv-SE', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

export function parseAmount(input: string): number | null {
  const normalized = input.trim().replace(/\s/g, '').replace(',', '.');
  if (!normalized) return null;

  const value = Number(normalized);
  if (!Number.isFinite(value) || value <= 0) return null;

  return Math.round(value * 100) / 100;
}

export function normalizeDescription(input: string | undefined): string | null {
  const trimmed = input?.trim() ?? '';
  return trimmed.length > 0 ? trimmed : null;
}

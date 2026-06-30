const HOUSEHOLD_KEY = 'household_id';

export function getStoredHouseholdId(): string | null {
  return localStorage.getItem(HOUSEHOLD_KEY);
}

export function setStoredHouseholdId(id: string): void {
  localStorage.setItem(HOUSEHOLD_KEY, id);
}

export function clearStoredHouseholdId(): void {
  localStorage.removeItem(HOUSEHOLD_KEY);
}

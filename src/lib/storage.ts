const HOUSEHOLD_KEY = 'household_id';
const DISPLAY_NAME_KEY = 'display_name';
const INSTALL_DISMISSED_KEY = 'install_prompt_dismissed';

export function getStoredHouseholdId(): string | null {
  return localStorage.getItem(HOUSEHOLD_KEY);
}

export function setStoredHouseholdId(id: string): void {
  localStorage.setItem(HOUSEHOLD_KEY, id);
}

export function clearStoredHouseholdId(): void {
  localStorage.removeItem(HOUSEHOLD_KEY);
}

export function getDisplayName(): string | null {
  const value = localStorage.getItem(DISPLAY_NAME_KEY)?.trim() ?? '';
  return value.length > 0 ? value : null;
}

export function setDisplayName(name: string): void {
  localStorage.setItem(DISPLAY_NAME_KEY, name.trim());
}

export function isInstallPromptDismissed(): boolean {
  return localStorage.getItem(INSTALL_DISMISSED_KEY) === '1';
}

export function dismissInstallPrompt(): void {
  localStorage.setItem(INSTALL_DISMISSED_KEY, '1');
}

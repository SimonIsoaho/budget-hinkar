import AsyncStorage from '@react-native-async-storage/async-storage';

const HOUSEHOLD_KEY = 'household_id';

export async function getStoredHouseholdId(): Promise<string | null> {
  return AsyncStorage.getItem(HOUSEHOLD_KEY);
}

export async function setStoredHouseholdId(id: string): Promise<void> {
  await AsyncStorage.setItem(HOUSEHOLD_KEY, id);
}

export async function clearStoredHouseholdId(): Promise<void> {
  await AsyncStorage.removeItem(HOUSEHOLD_KEY);
}

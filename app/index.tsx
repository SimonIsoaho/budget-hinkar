import { Redirect } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useEffect, useState } from 'react';
import { getStoredHouseholdId } from '../lib/storage';
import { isSupabaseConfigured } from '../lib/supabase';
import { colors, spacing } from '../constants/theme';

export default function Index() {
  const [householdId, setHouseholdId] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    getStoredHouseholdId().then(setHouseholdId);
  }, []);

  if (!isSupabaseConfigured) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Supabase saknas</Text>
        <Text style={styles.body}>
          Skapa en .env-fil med EXPO_PUBLIC_SUPABASE_URL och EXPO_PUBLIC_SUPABASE_ANON_KEY.
          Se README.md för instruktioner.
        </Text>
      </View>
    );
  }

  if (householdId === undefined) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (householdId) {
    return <Redirect href="/home" />;
  }

  return <Redirect href="/setup" />;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  body: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
});

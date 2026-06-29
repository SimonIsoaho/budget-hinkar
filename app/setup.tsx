import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Button, Screen } from '../components/Button';
import { colors, radius, spacing } from '../constants/theme';
import { createHousehold, joinHousehold } from '../lib/household';
import { setStoredHouseholdId } from '../lib/storage';

type Mode = 'choose' | 'create' | 'join';

export default function SetupScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('choose');
  const [householdName, setHouseholdName] = useState('Vårt hushåll');
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);

  const finishSetup = async (householdId: string) => {
    await setStoredHouseholdId(householdId);
    router.replace('/home');
  };

  const handleCreate = async () => {
    setLoading(true);
    try {
      const household = await createHousehold(householdName);
      await finishSetup(household.id);
    } catch (error) {
      Alert.alert('Något gick fel', error instanceof Error ? error.message : 'Försök igen.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!joinCode.trim()) {
      Alert.alert('Ange kod', 'Skriv in delningskoden du fått av din sambo.');
      return;
    }

    setLoading(true);
    try {
      const household = await joinHousehold(joinCode);
      await finishSetup(household.id);
    } catch (error) {
      Alert.alert('Något gick fel', error instanceof Error ? error.message : 'Försök igen.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.hero}>
            <Text style={styles.emoji}>🪣</Text>
            <Text style={styles.title}>Budgethinkar</Text>
            <Text style={styles.subtitle}>
              Håll koll på gemensamma spar-hinkar tillsammans. Skapa ett hushåll och dela koden
              med din sambo.
            </Text>
          </View>

          {mode === 'choose' && (
            <View style={styles.section}>
              <Button title="Skapa nytt hushåll" onPress={() => setMode('create')} />
              <Button
                title="Gå med med kod"
                variant="secondary"
                onPress={() => setMode('join')}
                style={styles.spaced}
              />
            </View>
          )}

          {mode === 'create' && (
            <View style={styles.section}>
              <Text style={styles.label}>Namn på hushållet</Text>
              <TextInput
                value={householdName}
                onChangeText={setHouseholdName}
                placeholder="T.ex. Simon & Partner"
                placeholderTextColor={colors.textSecondary}
                style={styles.input}
              />
              <Button title="Skapa hushåll" onPress={handleCreate} loading={loading} />
              <Button
                title="Tillbaka"
                variant="secondary"
                onPress={() => setMode('choose')}
                style={styles.spaced}
              />
            </View>
          )}

          {mode === 'join' && (
            <View style={styles.section}>
              <Text style={styles.label}>Delningskod</Text>
              <TextInput
                value={joinCode}
                onChangeText={(text) => setJoinCode(text.toUpperCase())}
                placeholder="ABC12345"
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="characters"
                autoCorrect={false}
                style={[styles.input, styles.codeInput]}
              />
              <Button title="Gå med" onPress={handleJoin} loading={loading} />
              <Button
                title="Tillbaka"
                variant="secondary"
                onPress={() => setMode('choose')}
                style={styles.spaced}
              />
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  hero: {
    alignItems: 'center',
    marginBottom: spacing.xl,
    marginTop: spacing.lg,
  },
  emoji: {
    fontSize: 56,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  section: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.background,
    marginBottom: spacing.lg,
  },
  codeInput: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 4,
    textAlign: 'center',
  },
  spaced: {
    marginTop: spacing.sm,
  },
});

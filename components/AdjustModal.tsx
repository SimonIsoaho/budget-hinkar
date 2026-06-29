import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Button } from './Button';
import { colors, radius, spacing } from '../constants/theme';
import { formatAmount, parseAmount } from '../lib/format';
import type { Bucket } from '../lib/types';

type AdjustModalProps = {
  visible: boolean;
  bucket: Bucket | null;
  onClose: () => void;
  onAdjust: (bucket: Bucket, delta: number) => Promise<void>;
  onDelete: (bucket: Bucket) => Promise<void>;
};

export function AdjustModal({
  visible,
  bucket,
  onClose,
  onAdjust,
  onDelete,
}: AdjustModalProps) {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const handleClose = () => {
    setAmount('');
    onClose();
  };

  const applyDelta = async (sign: 1 | -1) => {
    if (!bucket) return;

    const parsed = parseAmount(amount);
    if (parsed === null) {
      Alert.alert('Ogiltigt belopp', 'Ange ett positivt tal, t.ex. 500 eller 49,90.');
      return;
    }

    setLoading(true);
    try {
      await onAdjust(bucket, sign * parsed);
      handleClose();
    } catch (error) {
      Alert.alert('Något gick fel', error instanceof Error ? error.message : 'Försök igen.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    if (!bucket) return;

    Alert.alert(
      'Ta bort hink',
      `Vill du ta bort "${bucket.name}"? Detta går inte att ångra.`,
      [
        { text: 'Avbryt', style: 'cancel' },
        {
          text: 'Ta bort',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await onDelete(bucket);
              handleClose();
            } catch (error) {
              Alert.alert(
                'Något gick fel',
                error instanceof Error ? error.message : 'Försök igen.',
              );
            } finally {
              setLoading(false);
            }
          },
        },
      ],
    );
  };

  if (!bucket) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <Pressable style={styles.backdrop} onPress={handleClose} />
        <View style={styles.sheet}>
          <Text style={styles.title}>{bucket.name}</Text>
          <Text style={styles.balance}>Saldo: {formatAmount(bucket.balance)}</Text>

          <TextInput
            autoFocus
            value={amount}
            onChangeText={setAmount}
            placeholder="Belopp"
            placeholderTextColor={colors.textSecondary}
            keyboardType="decimal-pad"
            style={styles.input}
          />

          <View style={styles.actions}>
            <Button
              title="Lägg till"
              onPress={() => applyDelta(1)}
              loading={loading}
              style={styles.action}
            />
            <Button
              title="Ta bort"
              variant="secondary"
              onPress={() => applyDelta(-1)}
              loading={loading}
              style={styles.action}
            />
          </View>

          <Pressable onPress={handleDelete} style={styles.deleteLink}>
            <Text style={styles.deleteText}>Radera hinken</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  balance: {
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
    fontSize: 16,
    color: colors.textSecondary,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 24,
    fontWeight: '600',
    color: colors.text,
    backgroundColor: colors.background,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  action: {
    flex: 1,
  },
  deleteLink: {
    marginTop: spacing.lg,
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  deleteText: {
    color: colors.danger,
    fontSize: 15,
    fontWeight: '500',
  },
});

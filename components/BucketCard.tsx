import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../constants/theme';
import { formatAmount } from '../lib/format';
import type { Bucket } from '../lib/types';

type BucketCardProps = {
  bucket: Bucket;
  onPress: () => void;
  onLongPress?: () => void;
};

export function BucketCard({ bucket, onPress, onLongPress }: BucketCardProps) {
  const isNegative = bucket.balance < 0;

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.content}>
        <Text style={styles.name}>{bucket.name}</Text>
        <Text style={[styles.amount, isNegative && styles.negative]}>
          {formatAmount(bucket.balance)}
        </Text>
      </View>
      <Text style={styles.hint}>Tryck för att justera</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  pressed: {
    opacity: 0.95,
    transform: [{ scale: 0.995 }],
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
  name: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  amount: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.positive,
  },
  negative: {
    color: colors.negative,
  },
  hint: {
    marginTop: spacing.sm,
    fontSize: 13,
    color: colors.textSecondary,
  },
});

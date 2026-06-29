import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation, useRouter } from 'expo-router';
import { AdjustModal } from '../components/AdjustModal';
import { BucketCard } from '../components/BucketCard';
import { Button, Screen } from '../components/Button';
import { TextModal } from '../components/TextModal';
import { colors, radius, spacing } from '../constants/theme';
import {
  adjustBucketBalance,
  createBucket,
  deleteBucket,
  fetchBuckets,
  subscribeToBuckets,
} from '../lib/buckets';
import { formatAmount } from '../lib/format';
import { getHousehold } from '../lib/household';
import { clearStoredHouseholdId, getStoredHouseholdId } from '../lib/storage';
import type { Bucket, Household } from '../lib/types';

export default function HomeScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const [household, setHousehold] = useState<Household | null>(null);
  const [buckets, setBuckets] = useState<Bucket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBucket, setSelectedBucket] = useState<Bucket | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addingBucket, setAddingBucket] = useState(false);

  const loadData = useCallback(async () => {
    const householdId = await getStoredHouseholdId();
    if (!householdId) {
      router.replace('/setup');
      return;
    }

    const [householdData, bucketData] = await Promise.all([
      getHousehold(householdId),
      fetchBuckets(householdId),
    ]);

    if (!householdData) {
      await clearStoredHouseholdId();
      router.replace('/setup');
      return;
    }

    setHousehold(householdData);
    setBuckets(bucketData);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    loadData().catch((error) => {
      Alert.alert('Något gick fel', error instanceof Error ? error.message : 'Försök igen.');
      setLoading(false);
    });
  }, [loadData]);

  useEffect(() => {
    if (!household) return undefined;

    return subscribeToBuckets(household.id, () => {
      fetchBuckets(household.id)
        .then(setBuckets)
        .catch(() => undefined);
    });
  }, [household]);

  const showShareCode = useCallback(async () => {
    if (!household) return;

    await Share.share({
      message: `Gå med i våra budgethinkar! Ange koden ${household.code} i appen Budgethinkar.`,
    });
  }, [household]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable onPress={showShareCode} hitSlop={12} style={styles.headerButton}>
          <Text style={styles.headerButtonText}>Dela kod</Text>
        </Pressable>
      ),
    });
  }, [navigation, showShareCode]);

  const handleAddBucket = async (name: string) => {
    if (!household) return;

    setAddingBucket(true);
    try {
      const bucket = await createBucket(household.id, name);
      setBuckets((current) => [...current, bucket]);
      setShowAddModal(false);
    } catch (error) {
      Alert.alert('Något gick fel', error instanceof Error ? error.message : 'Försök igen.');
    } finally {
      setAddingBucket(false);
    }
  };

  const handleAdjust = async (bucket: Bucket, delta: number) => {
    const updated = await adjustBucketBalance(bucket, delta);
    setBuckets((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    setSelectedBucket(null);
  };

  const handleDelete = async (bucket: Bucket) => {
    await deleteBucket(bucket.id);
    setBuckets((current) => current.filter((item) => item.id !== bucket.id));
    setSelectedBucket(null);
  };

  const handleLeave = () => {
    Alert.alert(
      'Lämna hushållet',
      'Du loggas ut från detta hushåll på den här telefonen. Dina hinkar finns kvar för andra.',
      [
        { text: 'Avbryt', style: 'cancel' },
        {
          text: 'Lämna',
          style: 'destructive',
          onPress: async () => {
            await clearStoredHouseholdId();
            router.replace('/setup');
          },
        },
      ],
    );
  };

  const totalBalance = buckets.reduce((sum, bucket) => sum + bucket.balance, 0);

  if (loading) {
    return (
      <Screen>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <FlatList
        data={buckets}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.summary}>
            <Text style={styles.householdName}>{household?.name}</Text>
            <Text style={styles.codeLabel}>Delningskod: {household?.code}</Text>
            <View style={styles.totalCard}>
              <Text style={styles.totalLabel}>Totalt i hinkarna</Text>
              <Text style={styles.totalAmount}>{formatAmount(totalBalance)}</Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Inga hinkar ännu</Text>
            <Text style={styles.emptyBody}>
              Lägg till er första budgethink, t.ex. &quot;Mat&quot; eller &quot;Semester&quot;.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <BucketCard bucket={item} onPress={() => setSelectedBucket(item)} />
        )}
        ListFooterComponent={
          <View style={styles.footer}>
            <Button title="Lägg till hink" onPress={() => setShowAddModal(true)} />
            <Button
              title="Lämna hushåll"
              variant="secondary"
              onPress={handleLeave}
              style={styles.leaveButton}
            />
          </View>
        }
      />

      <TextModal
        visible={showAddModal}
        title="Ny hink"
        placeholder="Namn, t.ex. Mat"
        confirmLabel="Skapa"
        loading={addingBucket}
        onClose={() => setShowAddModal(false)}
        onConfirm={handleAddBucket}
      />

      <AdjustModal
        visible={selectedBucket !== null}
        bucket={selectedBucket}
        onClose={() => setSelectedBucket(null)}
        onAdjust={handleAdjust}
        onDelete={handleDelete}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  summary: {
    marginBottom: spacing.lg,
  },
  householdName: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
  },
  codeLabel: {
    marginTop: spacing.xs,
    fontSize: 15,
    color: colors.textSecondary,
    letterSpacing: 1,
  },
  totalCard: {
    marginTop: spacing.md,
    backgroundColor: colors.primaryLight,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  totalLabel: {
    fontSize: 14,
    color: colors.primaryDark,
    fontWeight: '600',
  },
  totalAmount: {
    marginTop: spacing.xs,
    fontSize: 28,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  emptyBody: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  footer: {
    marginTop: spacing.sm,
  },
  leaveButton: {
    marginTop: spacing.sm,
  },
  headerButton: {
    paddingHorizontal: spacing.sm,
  },
  headerButtonText: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 16,
  },
});

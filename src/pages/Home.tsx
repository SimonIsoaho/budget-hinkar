import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdjustModal } from '../components/AdjustModal';
import { BucketCard } from '../components/BucketCard';
import { Button } from '../components/Button';
import { CenterMessage, Layout } from '../components/Layout';
import { TextModal } from '../components/TextModal';
import {
  adjustBucketBalance,
  createBucket,
  deleteBucket,
  fetchBuckets,
  subscribeToBuckets,
} from '../lib/buckets';
import { formatAmount } from '../lib/format';
import { getHousehold } from '../lib/household';
import { shareCode } from '../lib/share';
import { clearStoredHouseholdId, getStoredHouseholdId } from '../lib/storage';
import type { Bucket, Household } from '../lib/types';
import styles from './Home.module.css';

export function HomePage() {
  const navigate = useNavigate();
  const [household, setHousehold] = useState<Household | null>(null);
  const [buckets, setBuckets] = useState<Bucket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBucket, setSelectedBucket] = useState<Bucket | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addingBucket, setAddingBucket] = useState(false);

  const loadData = useCallback(async () => {
    const householdId = getStoredHouseholdId();
    if (!householdId) {
      navigate('/setup', { replace: true });
      return;
    }

    const [householdData, bucketData] = await Promise.all([
      getHousehold(householdId),
      fetchBuckets(householdId),
    ]);

    if (!householdData) {
      clearStoredHouseholdId();
      navigate('/setup', { replace: true });
      return;
    }

    setHousehold(householdData);
    setBuckets(bucketData);
    setLoading(false);
  }, [navigate]);

  useEffect(() => {
    loadData().catch((err) => {
      setError(err instanceof Error ? err.message : 'Försök igen.');
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

  const handleShareCode = async () => {
    if (!household) return;
    try {
      await shareCode(household.code);
    } catch {
      // User cancelled share sheet
    }
  };

  const handleAddBucket = async (name: string) => {
    if (!household) return;

    setAddingBucket(true);
    try {
      const bucket = await createBucket(household.id, name);
      setBuckets((current) => [...current, bucket]);
      setShowAddModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Försök igen.');
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
    const confirmed = window.confirm(
      'Du loggas ut från detta hushåll på den här enheten. Dina hinkar finns kvar för andra.',
    );
    if (!confirmed) return;

    clearStoredHouseholdId();
    navigate('/setup', { replace: true });
  };

  const totalBalance = buckets.reduce((sum, bucket) => sum + bucket.balance, 0);

  if (loading) {
    return (
      <Layout title="Budgethinkar">
        <CenterMessage title="">
          <span className="spinner" style={{ color: 'var(--color-primary)' }} />
        </CenterMessage>
      </Layout>
    );
  }

  if (error && buckets.length === 0) {
    return (
      <Layout title="Budgethinkar">
        <CenterMessage title="Något gick fel" body={error} />
      </Layout>
    );
  }

  return (
    <Layout
      title="Budgethinkar"
      headerAction={
        <button type="button" className={styles.headerAction} onClick={handleShareCode}>
          Dela kod
        </button>
      }
    >
      <div className={styles.list}>
        <div className={styles.summary}>
          <h2 className={styles.householdName}>{household?.name}</h2>
          <p className={styles.codeLabel}>Delningskod: {household?.code}</p>
          <div className={styles.totalCard}>
            <div className={styles.totalLabel}>Totalt i hinkarna</div>
            <div className={styles.totalAmount}>{formatAmount(totalBalance)}</div>
          </div>
        </div>

        {buckets.length === 0 ? (
          <div className={styles.empty}>
            <h3 className={styles.emptyTitle}>Inga hinkar ännu</h3>
            <p className={styles.emptyBody}>
              Lägg till er första budgethink, t.ex. &quot;Mat&quot; eller &quot;Semester&quot;.
            </p>
          </div>
        ) : (
          buckets.map((bucket) => (
            <BucketCard key={bucket.id} bucket={bucket} onPress={() => setSelectedBucket(bucket)} />
          ))
        )}

        <div className={styles.footer}>
          <Button title="Lägg till hink" onClick={() => setShowAddModal(true)} />
          <Button
            title="Lämna hushåll"
            variant="secondary"
            onClick={handleLeave}
            className={styles.leaveButton}
          />
        </div>
      </div>

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
    </Layout>
  );
}

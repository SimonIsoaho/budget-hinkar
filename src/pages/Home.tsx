import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdjustModal } from '../components/AdjustModal';
import { BucketCard } from '../components/BucketCard';
import { Button } from '../components/Button';
import { CenterMessage, Layout } from '../components/Layout';
import { TextModal } from '../components/TextModal';
import { TransferModal } from '../components/TransferModal';
import {
  adjustBucketBalance,
  createBucket,
  deleteBucket,
  fetchBuckets,
  subscribeToBuckets,
} from '../lib/buckets';
import { formatAmount, formatSignedAmount, formatTransactionDate } from '../lib/format';
import { getHousehold } from '../lib/household';
import {
  formatPeriodLabel,
  getCurrentPeriod,
  summarizePeriodCashflow,
} from '../lib/period';
import { shareCode } from '../lib/share';
import {
  clearStoredHouseholdId,
  getDisplayName,
  getStoredHouseholdId,
  setDisplayName,
} from '../lib/storage';
import {
  fetchHouseholdActivity,
  fetchHouseholdTransactionsInRange,
  subscribeToAllTransactions,
} from '../lib/transactions';
import type { ActivityItem, Bucket, Household } from '../lib/types';
import styles from './Home.module.css';

export function HomePage() {
  const navigate = useNavigate();
  const [household, setHousehold] = useState<Household | null>(null);
  const [buckets, setBuckets] = useState<Bucket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBucket, setSelectedBucket] = useState<Bucket | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showNameModal, setShowNameModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [addingBucket, setAddingBucket] = useState(false);
  const [displayName, setDisplayNameState] = useState<string | null>(() => getDisplayName());
  const [periodIn, setPeriodIn] = useState(0);
  const [periodOut, setPeriodOut] = useState(0);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [activityExpanded, setActivityExpanded] = useState(false);
  const period = getCurrentPeriod();
  const periodLabel = formatPeriodLabel(period);

  const refreshInsights = useCallback(async (householdId: string) => {
    const { start, end } = getCurrentPeriod();
    const [periodTx, recent] = await Promise.all([
      fetchHouseholdTransactionsInRange(householdId, start, end),
      fetchHouseholdActivity(householdId, start, end, 5),
    ]);
    const summary = summarizePeriodCashflow(periodTx);
    setPeriodIn(summary.incoming);
    setPeriodOut(summary.outgoing);
    setActivity(recent);
  }, []);

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
    await refreshInsights(householdData.id);
    setLoading(false);
  }, [navigate, refreshInsights]);

  useEffect(() => {
    loadData().catch((err) => {
      setError(err instanceof Error ? err.message : 'Försök igen.');
      setLoading(false);
    });
  }, [loadData]);

  useEffect(() => {
    if (!household) return undefined;

    const refresh = () => {
      fetchBuckets(household.id)
        .then(setBuckets)
        .catch(() => undefined);
      refreshInsights(household.id).catch(() => undefined);
    };

    const unsubBuckets = subscribeToBuckets(household.id, refresh);
    const unsubTx = subscribeToAllTransactions(refresh);

    return () => {
      unsubBuckets();
      unsubTx();
    };
  }, [household, refreshInsights]);

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

  const handleSaveDisplayName = async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setDisplayName(trimmed);
    setDisplayNameState(trimmed);
    setShowNameModal(false);
  };

  const handleAdjust = async (
    bucket: Bucket,
    delta: number,
    options: { description?: string; actorName: string },
  ): Promise<Bucket> => {
    const { bucket: updated } = await adjustBucketBalance(bucket, delta, options);
    setBuckets((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    setSelectedBucket(updated);
    setDisplayNameState(getDisplayName());
    if (household) refreshInsights(household.id).catch(() => undefined);
    return updated;
  };

  const handleBucketUpdated = (bucket: Bucket) => {
    setBuckets((current) => current.map((item) => (item.id === bucket.id ? bucket : item)));
    setSelectedBucket(bucket);
    if (household) refreshInsights(household.id).catch(() => undefined);
  };

  const handleTransferred = (from: Bucket, to: Bucket) => {
    setBuckets((current) =>
      current.map((item) => {
        if (item.id === from.id) return from;
        if (item.id === to.id) return to;
        return item;
      }),
    );
    setDisplayNameState(getDisplayName());
    if (household) refreshInsights(household.id).catch(() => undefined);
  };

  const handleDelete = async (bucket: Bucket) => {
    await deleteBucket(bucket.id);
    setBuckets((current) => current.filter((item) => item.id !== bucket.id));
    setSelectedBucket(null);
    if (household) refreshInsights(household.id).catch(() => undefined);
  };

  const handleLeave = () => {
    const confirmed = window.confirm(
      'Du loggas ut från detta hushåll på den här enheten. Dina hinkar finns kvar för andra.',
    );
    if (!confirmed) return;

    clearStoredHouseholdId();
    navigate('/setup', { replace: true });
  };

  const openActivityBucket = (item: ActivityItem) => {
    const bucket = buckets.find((b) => b.id === item.bucket_id);
    if (bucket) setSelectedBucket(bucket);
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
          <div className={styles.metaStrip}>
            <div className={styles.householdRow}>
              <h2 className={styles.householdName}>{household?.name}</h2>
              <p className={styles.codeLabel} aria-label={`Delningskod ${household?.code}`}>
                <span className={styles.codePrefix}>Kod</span>
                <span className={styles.codeValue}>{household?.code}</span>
              </p>
            </div>
            <button
              type="button"
              className={styles.nameButton}
              onClick={() => setShowNameModal(true)}
            >
              {displayName ? `Ditt namn: ${displayName}` : 'Ange ditt namn'}
            </button>
          </div>
          <div className={styles.totalCard}>
            <div className={styles.totalLabel}>Totalt i hinkarna</div>
            <div className={styles.totalAmount}>{formatAmount(totalBalance)}</div>
          </div>

          <div className={styles.periodCard}>
            <div className={styles.periodTitle}>Denna period</div>
            <div className={styles.periodRange}>{periodLabel}</div>
            <div className={styles.periodStats}>
              <div className={styles.periodStat}>
                <div className={styles.periodStatLabel}>In</div>
                <div className={styles.periodIn}>{formatAmount(periodIn)}</div>
              </div>
              <div className={styles.periodStat}>
                <div className={styles.periodStatLabel}>Ut</div>
                <div className={styles.periodOut}>{formatAmount(periodOut)}</div>
              </div>
            </div>
          </div>

          <section className={styles.activity}>
            <button
              type="button"
              className={styles.activityHeader}
              onClick={() => setActivityExpanded((open) => !open)}
              aria-expanded={activityExpanded}
            >
              <span className={styles.activityHeaderText}>
                Senaste
                {activity.length > 0 && (
                  <span className={styles.activityCount}> ({activity.length})</span>
                )}
              </span>
              <span
                className={[
                  styles.activityChevron,
                  activityExpanded ? styles.activityChevronOpen : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                aria-hidden="true"
              >
                ›
              </span>
            </button>
            {activityExpanded &&
              (activity.length === 0 ? (
                <p className={styles.activityEmpty}>Inga ändringar denna period</p>
              ) : (
                <ul className={styles.activityList}>
                  {activity.map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        className={styles.activityItem}
                        onClick={() => openActivityBucket(item)}
                      >
                        <span className={styles.activityMain}>
                          <span className={styles.activityActor}>{item.actor_name ?? 'Okänd'}</span>
                          <span
                            className={[
                              styles.activityAmount,
                              item.direction === 'add' ? styles.periodIn : styles.periodOut,
                            ].join(' ')}
                          >
                            {formatSignedAmount(item.amount, item.direction)}
                          </span>
                          <span className={styles.activityBucket}>{item.bucket_name}</span>
                        </span>
                        <span className={styles.activityDate}>
                          {formatTransactionDate(item.created_at)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ))}
          </section>
        </div>

        {buckets.length === 0 ? (
          <div className={styles.empty}>
            <h3 className={styles.emptyTitle}>Inga hinkar ännu</h3>
            <p className={styles.emptyBody}>
              Lägg till er första budgethink, t.ex. &quot;Mat&quot; eller &quot;Semester&quot;.
            </p>
          </div>
        ) : (
          <>
            <h3 className={styles.sectionTitle}>Hinkar</h3>
            {buckets.map((bucket, index) => (
              <BucketCard
                key={bucket.id}
                bucket={bucket}
                index={index}
                onPress={() => setSelectedBucket(bucket)}
              />
            ))}
          </>
        )}

        <div className={styles.footer}>
          <Button title="Lägg till hink" onClick={() => setShowAddModal(true)} />
          <Button
            title="Flytta mellan hinkar"
            variant="secondary"
            onClick={() => setShowTransferModal(true)}
            disabled={buckets.length < 2}
            className={styles.leaveButton}
          />
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

      <TextModal
        visible={showNameModal}
        title="Ditt namn"
        placeholder="T.ex. Simon"
        confirmLabel="Spara"
        onClose={() => setShowNameModal(false)}
        onConfirm={handleSaveDisplayName}
      />

      <TransferModal
        visible={showTransferModal}
        buckets={buckets}
        onClose={() => setShowTransferModal(false)}
        onTransferred={handleTransferred}
      />

      <AdjustModal
        visible={selectedBucket !== null}
        bucket={selectedBucket}
        onClose={() => setSelectedBucket(null)}
        onAdjust={handleAdjust}
        onBucketUpdated={handleBucketUpdated}
        onDelete={handleDelete}
      />
    </Layout>
  );
}

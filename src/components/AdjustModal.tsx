import { useEffect, useState } from 'react';
import {
  HistorySaveError,
  insertBucketTransaction,
  undoTransaction,
} from '../lib/buckets';
import {
  formatAmount,
  formatSignedAmount,
  formatTransactionDate,
  parseAmount,
} from '../lib/format';
import { useOnline } from '../lib/online';
import { getCurrentPeriod } from '../lib/period';
import { getDisplayName, setDisplayName } from '../lib/storage';
import {
  fetchBucketTransactions,
  getUndoableTransaction,
  hasBucketTransactionsBefore,
  subscribeToBucketTransactions,
} from '../lib/transactions';
import type { Bucket, BucketTransaction, HistoryInsertPayload } from '../lib/types';
import { Button } from './Button';
import styles from './Modal.module.css';

type AdjustModalProps = {
  visible: boolean;
  bucket: Bucket | null;
  onClose: () => void;
  onAdjust: (
    bucket: Bucket,
    delta: number,
    options: { description?: string; actorName: string },
  ) => Promise<Bucket>;
  onBucketUpdated: (bucket: Bucket) => void;
  onDelete: (bucket: Bucket) => Promise<void>;
};

export function AdjustModal({
  visible,
  bucket,
  onClose,
  onAdjust,
  onBucketUpdated,
  onDelete,
}: AdjustModalProps) {
  const online = useOnline();
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [actorNameDraft, setActorNameDraft] = useState('');
  const [displayName, setDisplayNameState] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingHistory, setPendingHistory] = useState<HistoryInsertPayload | null>(null);
  const [transactions, setTransactions] = useState<BucketTransaction[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [hasOlderTransactions, setHasOlderTransactions] = useState(false);

  useEffect(() => {
    if (!visible) {
      setAmount('');
      setDescription('');
      setError(null);
      setPendingHistory(null);
      setTransactions([]);
      setShowAllHistory(false);
      setHasOlderTransactions(false);
      return;
    }

    const stored = getDisplayName();
    setDisplayNameState(stored);
    setActorNameDraft(stored ?? '');
  }, [visible]);

  useEffect(() => {
    if (!visible || !bucket) return undefined;

    let cancelled = false;
    setHistoryLoading(true);

    const load = async () => {
      try {
        const period = getCurrentPeriod();
        const range = showAllHistory ? 'all' : period;
        const rows = await fetchBucketTransactions(bucket.id, range);
        if (cancelled) return;

        setTransactions(rows);

        if (!showAllHistory) {
          const older = await hasBucketTransactionsBefore(bucket.id, period.start);
          if (!cancelled) setHasOlderTransactions(older);
        } else if (!cancelled) {
          setHasOlderTransactions(false);
        }
      } catch {
        if (!cancelled) {
          setTransactions([]);
          setHasOlderTransactions(false);
        }
      } finally {
        if (!cancelled) setHistoryLoading(false);
      }
    };

    load();
    const unsubscribe = subscribeToBucketTransactions(bucket.id, () => {
      load().catch(() => undefined);
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [visible, bucket, showAllHistory]);

  const handleClose = () => {
    setAmount('');
    setDescription('');
    setError(null);
    setPendingHistory(null);
    setShowAllHistory(false);
    onClose();
  };

  const ensureActorName = (): string | null => {
    const name = (displayName ?? actorNameDraft).trim();
    if (!name) {
      setError('Ange ditt namn så att ni ser vem som gjorde ändringen.');
      return null;
    }
    setDisplayName(name);
    setDisplayNameState(name);
    setActorNameDraft(name);
    return name;
  };

  const refreshHistory = async (bucketId: string) => {
    const period = getCurrentPeriod();
    const range = showAllHistory ? 'all' : period;
    const rows = await fetchBucketTransactions(bucketId, range);
    setTransactions(rows);

    if (!showAllHistory) {
      setHasOlderTransactions(await hasBucketTransactionsBefore(bucketId, period.start));
    }
  };

  const applyDelta = async (sign: 1 | -1) => {
    if (!bucket || !online) return;

    const parsed = parseAmount(amount);
    if (parsed === null) {
      setError('Ange ett positivt tal, t.ex. 500 eller 49,90.');
      return;
    }

    const actorName = ensureActorName();
    if (!actorName) return;

    setLoading(true);
    setError(null);
    setPendingHistory(null);
    try {
      await onAdjust(bucket, sign * parsed, { description, actorName });
      setAmount('');
      setDescription('');
      await refreshHistory(bucket.id);
    } catch (err) {
      if (err instanceof HistorySaveError) {
        onBucketUpdated(err.bucket);
        setPendingHistory(err.pendingHistory);
        setError(err.message);
        setAmount('');
        setDescription('');
      } else {
        setError(err instanceof Error ? err.message : 'Försök igen.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRetryHistory = async () => {
    if (!pendingHistory || !bucket) return;

    setLoading(true);
    setError(null);
    try {
      await insertBucketTransaction(pendingHistory);
      setPendingHistory(null);
      await refreshHistory(bucket.id);
    } catch (err) {
      setError(
        err instanceof Error
          ? `Historiken misslyckades igen: ${err.message}`
          : 'Historiken misslyckades igen.',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleUndo = async (tx: BucketTransaction) => {
    if (!bucket || !online) return;

    const confirmed = window.confirm('Ångra denna ändring?');
    if (!confirmed) return;

    const actorName = ensureActorName();
    if (!actorName) return;

    setLoading(true);
    setError(null);
    setPendingHistory(null);
    try {
      const { bucket: updated } = await undoTransaction(bucket, tx, actorName);
      onBucketUpdated(updated);
      await refreshHistory(bucket.id);
    } catch (err) {
      if (err instanceof HistorySaveError) {
        onBucketUpdated(err.bucket);
        setPendingHistory(err.pendingHistory);
        setError(err.message);
      } else {
        setError(err instanceof Error ? err.message : 'Försök igen.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!bucket) return;

    const confirmed = window.confirm(
      `Vill du ta bort "${bucket.name}"? Detta går inte att ångra.`,
    );
    if (!confirmed) return;

    setLoading(true);
    setError(null);
    try {
      await onDelete(bucket);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Försök igen.');
    } finally {
      setLoading(false);
    }
  };

  if (!visible || !bucket) return null;

  const undoable = getUndoableTransaction(transactions);
  const needsName = !displayName;

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="adjust-modal-title">
      <button type="button" className={styles.backdrop} onClick={handleClose} aria-label="Stäng" />
      <div className={styles.sheet}>
        <h2 id="adjust-modal-title" className={styles.title}>
          {bucket.name}
        </h2>
        <p className={styles.balance}>Saldo: {formatAmount(bucket.balance)}</p>

        {needsName && (
          <div className={styles.namePrompt}>
            <label className={styles.nameLabel} htmlFor="actor-name">
              Vad heter du?
            </label>
            <input
              id="actor-name"
              value={actorNameDraft}
              onChange={(event) => {
                setActorNameDraft(event.target.value);
                setError(null);
              }}
              placeholder="T.ex. Simon"
              className={styles.input}
            />
          </div>
        )}

        <input
          autoFocus={!needsName}
          value={amount}
          onChange={(event) => {
            setAmount(event.target.value);
            setError(null);
          }}
          placeholder="Belopp"
          inputMode="decimal"
          className={styles.amountInput}
          disabled={!online}
        />

        <input
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Beskrivning (valfritt)"
          className={styles.input}
          disabled={!online}
        />

        {error && <p className={styles.error}>{error}</p>}

        {pendingHistory && (
          <Button
            title="Försök spara historik igen"
            variant="secondary"
            onClick={handleRetryHistory}
            loading={loading}
            className={styles.retryButton}
          />
        )}

        {!online && (
          <p className={styles.offlineHint}>Du är offline — justeringar är inaktiverade.</p>
        )}

        <div className={styles.actions}>
          <Button
            title="Lägg till"
            onClick={() => applyDelta(1)}
            loading={loading}
            disabled={!online}
            className={styles.action}
          />
          <Button
            title="Ta bort"
            variant="secondary"
            onClick={() => applyDelta(-1)}
            loading={loading}
            disabled={!online}
            className={styles.action}
          />
        </div>

        <section className={styles.history}>
          <h3 className={styles.historyTitle}>Historik</h3>
          {historyLoading && transactions.length === 0 ? (
            <p className={styles.historyEmpty}>Laddar…</p>
          ) : transactions.length === 0 ? (
            <p className={styles.historyEmpty}>
              {showAllHistory ? 'Inga ändringar ännu' : 'Inga ändringar denna period'}
            </p>
          ) : (
            <ul className={styles.historyList}>
              {transactions.map((tx) => (
                <li key={tx.id} className={styles.historyItem}>
                  <div className={styles.historyMain}>
                    <span
                      className={[
                        styles.historyAmount,
                        tx.direction === 'add' ? styles.historyAdd : styles.historyRemove,
                      ].join(' ')}
                    >
                      {formatSignedAmount(tx.amount, tx.direction)}
                    </span>
                    <span className={styles.historyDate}>{formatTransactionDate(tx.created_at)}</span>
                  </div>
                  <p className={styles.historyMeta}>
                    {tx.actor_name ?? 'Okänd'}
                    {tx.reverses_id ? ' · ångrade en ändring' : ''}
                  </p>
                  {tx.description && (
                    <p className={styles.historyDescription}>{tx.description}</p>
                  )}
                  {undoable?.id === tx.id && (
                    <button
                      type="button"
                      className={styles.undoLink}
                      disabled={!online || loading}
                      onClick={() => handleUndo(tx)}
                    >
                      Ångra
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
          {!showAllHistory && hasOlderTransactions && (
            <button
              type="button"
              className={styles.historyToggle}
              onClick={() => setShowAllHistory(true)}
            >
              Visa äldre transaktioner
            </button>
          )}
          {showAllHistory && (
            <button
              type="button"
              className={styles.historyToggle}
              onClick={() => setShowAllHistory(false)}
            >
              Visa endast denna period
            </button>
          )}
        </section>

        <button type="button" onClick={handleDelete} className={styles.deleteLink}>
          Radera hinken
        </button>
      </div>
    </div>
  );
}

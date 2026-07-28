import { useEffect, useState } from 'react';
import {
  formatAmount,
  formatSignedAmount,
  formatTransactionDate,
  parseAmount,
} from '../lib/format';
import {
  fetchBucketTransactions,
  subscribeToBucketTransactions,
} from '../lib/transactions';
import type { Bucket, BucketTransaction } from '../lib/types';
import { Button } from './Button';
import styles from './Modal.module.css';

type AdjustModalProps = {
  visible: boolean;
  bucket: Bucket | null;
  onClose: () => void;
  onAdjust: (bucket: Bucket, delta: number, description?: string) => Promise<Bucket>;
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
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<BucketTransaction[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    if (!visible) {
      setAmount('');
      setDescription('');
      setError(null);
      setTransactions([]);
    }
  }, [visible]);

  useEffect(() => {
    if (!visible || !bucket) return undefined;

    let cancelled = false;
    setHistoryLoading(true);

    const load = () => {
      fetchBucketTransactions(bucket.id)
        .then((rows) => {
          if (!cancelled) setTransactions(rows);
        })
        .catch(() => {
          if (!cancelled) setTransactions([]);
        })
        .finally(() => {
          if (!cancelled) setHistoryLoading(false);
        });
    };

    load();
    const unsubscribe = subscribeToBucketTransactions(bucket.id, load);

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [visible, bucket]);

  const handleClose = () => {
    setAmount('');
    setDescription('');
    setError(null);
    onClose();
  };

  const applyDelta = async (sign: 1 | -1) => {
    if (!bucket) return;

    const parsed = parseAmount(amount);
    if (parsed === null) {
      setError('Ange ett positivt tal, t.ex. 500 eller 49,90.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await onAdjust(bucket, sign * parsed, description);
      setAmount('');
      setDescription('');
      const rows = await fetchBucketTransactions(bucket.id);
      setTransactions(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Försök igen.');
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

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="adjust-modal-title">
      <button type="button" className={styles.backdrop} onClick={handleClose} aria-label="Stäng" />
      <div className={styles.sheet}>
        <h2 id="adjust-modal-title" className={styles.title}>
          {bucket.name}
        </h2>
        <p className={styles.balance}>Saldo: {formatAmount(bucket.balance)}</p>

        <input
          autoFocus
          value={amount}
          onChange={(event) => {
            setAmount(event.target.value);
            setError(null);
          }}
          placeholder="Belopp"
          inputMode="decimal"
          className={styles.amountInput}
        />

        <input
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Beskrivning (valfritt)"
          className={styles.input}
        />

        {error && <p className={styles.error}>{error}</p>}

        <div className={styles.actions}>
          <Button
            title="Lägg till"
            onClick={() => applyDelta(1)}
            loading={loading}
            className={styles.action}
          />
          <Button
            title="Ta bort"
            variant="secondary"
            onClick={() => applyDelta(-1)}
            loading={loading}
            className={styles.action}
          />
        </div>

        <section className={styles.history}>
          <h3 className={styles.historyTitle}>Historik</h3>
          {historyLoading && transactions.length === 0 ? (
            <p className={styles.historyEmpty}>Laddar…</p>
          ) : transactions.length === 0 ? (
            <p className={styles.historyEmpty}>Inga ändringar ännu</p>
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
                  {tx.description && (
                    <p className={styles.historyDescription}>{tx.description}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <button type="button" onClick={handleDelete} className={styles.deleteLink}>
          Radera hinken
        </button>
      </div>
    </div>
  );
}

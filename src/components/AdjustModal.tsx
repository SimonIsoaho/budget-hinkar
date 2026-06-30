import { useEffect, useState } from 'react';
import { formatAmount, parseAmount } from '../lib/format';
import type { Bucket } from '../lib/types';
import { Button } from './Button';
import styles from './Modal.module.css';

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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) {
      setAmount('');
      setError(null);
    }
  }, [visible]);

  const handleClose = () => {
    setAmount('');
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
      await onAdjust(bucket, sign * parsed);
      handleClose();
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
        <p style={{ margin: '0 0 var(--spacing-lg)', color: 'var(--color-text-secondary)' }}>
          Saldo: {formatAmount(bucket.balance)}
        </p>

        <input
          autoFocus
          value={amount}
          onChange={(event) => {
            setAmount(event.target.value);
            setError(null);
          }}
          placeholder="Belopp"
          inputMode="decimal"
          className={styles.input}
          style={{ fontSize: 24, fontWeight: 600, textAlign: 'center' }}
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

        <button
          type="button"
          onClick={handleDelete}
          style={{
            marginTop: 'var(--spacing-lg)',
            width: '100%',
            background: 'none',
            border: 'none',
            color: 'var(--color-danger)',
            fontSize: 15,
            fontWeight: 500,
            padding: 'var(--spacing-sm)',
          }}
        >
          Radera hinken
        </button>
      </div>
    </div>
  );
}

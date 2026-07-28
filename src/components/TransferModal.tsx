import { useEffect, useState } from 'react';
import {
  insertBucketTransaction,
  TransferHistoryError,
  transferBetweenBuckets,
} from '../lib/buckets';
import { parseAmount } from '../lib/format';
import { useOnline } from '../lib/online';
import { getDisplayName, setDisplayName } from '../lib/storage';
import type { Bucket, HistoryInsertPayload } from '../lib/types';
import { Button } from './Button';
import styles from './Modal.module.css';

type TransferModalProps = {
  visible: boolean;
  buckets: Bucket[];
  onClose: () => void;
  onTransferred: (from: Bucket, to: Bucket) => void;
};

export function TransferModal({
  visible,
  buckets,
  onClose,
  onTransferred,
}: TransferModalProps) {
  const online = useOnline();
  const [fromId, setFromId] = useState('');
  const [toId, setToId] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [actorNameDraft, setActorNameDraft] = useState('');
  const [displayName, setDisplayNameState] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingHistory, setPendingHistory] = useState<HistoryInsertPayload[] | null>(null);

  useEffect(() => {
    if (!visible) {
      setAmount('');
      setDescription('');
      setError(null);
      setPendingHistory(null);
      return;
    }

    const stored = getDisplayName();
    setDisplayNameState(stored);
    setActorNameDraft(stored ?? '');
    setFromId(buckets[0]?.id ?? '');
    setToId(buckets[1]?.id ?? buckets[0]?.id ?? '');
  }, [visible, buckets]);

  const ensureActorName = (): string | null => {
    const name = (displayName ?? actorNameDraft).trim();
    if (!name) {
      setError('Ange ditt namn så att ni ser vem som gjorde flytten.');
      return null;
    }
    setDisplayName(name);
    setDisplayNameState(name);
    setActorNameDraft(name);
    return name;
  };

  const handleClose = () => {
    setError(null);
    setPendingHistory(null);
    onClose();
  };

  const handleTransfer = async () => {
    if (!online) return;

    const from = buckets.find((b) => b.id === fromId);
    const to = buckets.find((b) => b.id === toId);
    if (!from || !to) {
      setError('Välj två hinkar.');
      return;
    }

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
      const result = await transferBetweenBuckets(from, to, parsed, {
        description,
        actorName,
      });
      onTransferred(result.from, result.to);
      handleClose();
    } catch (err) {
      if (err instanceof TransferHistoryError) {
        onTransferred(err.buckets[0], err.buckets[1]);
        setPendingHistory(err.pendingHistory);
        setError(err.message);
      } else {
        setError(err instanceof Error ? err.message : 'Försök igen.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRetryHistory = async () => {
    if (!pendingHistory) return;

    setLoading(true);
    setError(null);
    try {
      for (const payload of pendingHistory) {
        await insertBucketTransaction(payload);
      }
      setPendingHistory(null);
      handleClose();
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

  if (!visible) return null;

  const needsName = !displayName;

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="transfer-title">
      <button type="button" className={styles.backdrop} onClick={handleClose} aria-label="Stäng" />
      <div className={styles.sheet}>
        <h2 id="transfer-title" className={styles.title}>
          Flytta mellan hinkar
        </h2>

        {needsName && (
          <div className={styles.namePrompt}>
            <label className={styles.nameLabel} htmlFor="transfer-actor-name">
              Vad heter du?
            </label>
            <input
              id="transfer-actor-name"
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

        <label className={styles.nameLabel} htmlFor="transfer-from">
          Från
        </label>
        <select
          id="transfer-from"
          className={styles.select}
          value={fromId}
          onChange={(event) => setFromId(event.target.value)}
          disabled={!online}
        >
          {buckets.map((bucket) => (
            <option key={bucket.id} value={bucket.id}>
              {bucket.name}
            </option>
          ))}
        </select>

        <label className={styles.nameLabel} htmlFor="transfer-to">
          Till
        </label>
        <select
          id="transfer-to"
          className={styles.select}
          value={toId}
          onChange={(event) => setToId(event.target.value)}
          disabled={!online}
        >
          {buckets.map((bucket) => (
            <option key={bucket.id} value={bucket.id}>
              {bucket.name}
            </option>
          ))}
        </select>

        <input
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
          <p className={styles.offlineHint}>Du är offline — flyttar är inaktiverade.</p>
        )}

        <div className={styles.actions}>
          <Button title="Avbryt" variant="secondary" onClick={handleClose} className={styles.action} />
          <Button
            title="Flytta"
            onClick={handleTransfer}
            loading={loading}
            disabled={!online || buckets.length < 2}
            className={styles.action}
          />
        </div>
      </div>
    </div>
  );
}

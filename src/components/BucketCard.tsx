import { formatAmount } from '../lib/format';
import type { Bucket } from '../lib/types';
import styles from './BucketCard.module.css';

type BucketCardProps = {
  bucket: Bucket;
  onPress: () => void;
};

export function BucketCard({ bucket, onPress }: BucketCardProps) {
  const isNegative = bucket.balance < 0;

  return (
    <button type="button" className={styles.card} onClick={onPress}>
      <div className={styles.content}>
        <span className={styles.name}>{bucket.name}</span>
        <span className={[styles.amount, isNegative ? styles.negative : ''].filter(Boolean).join(' ')}>
          {formatAmount(bucket.balance)}
        </span>
      </div>
      <div className={styles.hint}>Tryck för att justera</div>
    </button>
  );
}

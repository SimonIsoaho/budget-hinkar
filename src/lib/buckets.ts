import { supabase } from './supabase';
import { normalizeDescription } from './format';
import type {
  Bucket,
  BucketTransaction,
  HistoryInsertPayload,
  TransactionDirection,
} from './types';

export class HistorySaveError extends Error {
  bucket: Bucket;
  pendingHistory: HistoryInsertPayload;

  constructor(bucket: Bucket, pendingHistory: HistoryInsertPayload, cause?: unknown) {
    super('Saldo uppdaterades men historiken misslyckades');
    this.name = 'HistorySaveError';
    this.bucket = bucket;
    this.pendingHistory = pendingHistory;
    if (cause instanceof Error) {
      this.cause = cause;
    }
  }
}

export async function fetchBuckets(householdId: string): Promise<Bucket[]> {
  const { data, error } = await supabase
    .from('buckets')
    .select('*')
    .eq('household_id', householdId)
    .order('created_at', { ascending: true });

  if (error) throw error;

  return (data ?? []).map((row) => ({
    ...row,
    balance: Number(row.balance),
  })) as Bucket[];
}

export async function createBucket(
  householdId: string,
  name: string,
): Promise<Bucket> {
  const { data, error } = await supabase
    .from('buckets')
    .insert({
      household_id: householdId,
      name: name.trim(),
      balance: 0,
    })
    .select()
    .single();

  if (error) throw error;

  return {
    ...(data as Bucket),
    balance: Number(data.balance),
  };
}

export async function deleteBucket(bucketId: string): Promise<void> {
  const { error } = await supabase.from('buckets').delete().eq('id', bucketId);
  if (error) throw error;
}

export async function insertBucketTransaction(
  payload: HistoryInsertPayload,
): Promise<BucketTransaction> {
  const { data, error } = await supabase
    .from('bucket_transactions')
    .insert({
      bucket_id: payload.bucket_id,
      amount: payload.amount,
      direction: payload.direction,
      description: payload.description,
      actor_name: payload.actor_name,
      reverses_id: payload.reverses_id ?? null,
      transfer_id: payload.transfer_id ?? null,
    })
    .select()
    .single();

  if (error) throw error;

  return mapTransactionRow(data as Record<string, unknown>);
}

function mapTransactionRow(row: Record<string, unknown>): BucketTransaction {
  return {
    id: row.id as string,
    bucket_id: row.bucket_id as string,
    amount: Number(row.amount),
    direction: row.direction as TransactionDirection,
    description: (row.description as string | null) ?? null,
    actor_name: (row.actor_name as string | null) ?? null,
    reverses_id: (row.reverses_id as string | null) ?? null,
    transfer_id: (row.transfer_id as string | null) ?? null,
    created_at: row.created_at as string,
  };
}

async function updateBucketBalance(bucket: Bucket, delta: number): Promise<Bucket> {
  const nextBalance = Math.round((bucket.balance + delta) * 100) / 100;

  const { data, error } = await supabase
    .from('buckets')
    .update({
      balance: nextBalance,
      updated_at: new Date().toISOString(),
    })
    .eq('id', bucket.id)
    .select()
    .single();

  if (error) throw error;

  return {
    ...(data as Bucket),
    balance: Number(data.balance),
  };
}

export async function adjustBucketBalance(
  bucket: Bucket,
  delta: number,
  options: { description?: string; actorName: string },
): Promise<{ bucket: Bucket; transaction: BucketTransaction }> {
  const direction: TransactionDirection = delta >= 0 ? 'add' : 'remove';
  const amount = Math.abs(delta);
  const pendingHistory: HistoryInsertPayload = {
    bucket_id: bucket.id,
    amount,
    direction,
    description: normalizeDescription(options.description),
    actor_name: options.actorName.trim() || null,
  };

  const updatedBucket = await updateBucketBalance(bucket, delta);

  try {
    const transaction = await insertBucketTransaction(pendingHistory);
    return { bucket: updatedBucket, transaction };
  } catch (error) {
    throw new HistorySaveError(updatedBucket, pendingHistory, error);
  }
}

export async function undoTransaction(
  bucket: Bucket,
  original: BucketTransaction,
  actorName: string,
): Promise<{ bucket: Bucket; transaction: BucketTransaction }> {
  const delta = original.direction === 'add' ? -original.amount : original.amount;
  const direction: TransactionDirection = delta >= 0 ? 'add' : 'remove';
  const undoDescription = original.description
    ? `Ångrade: ${original.description}`
    : 'Ångrade';

  const pendingHistory: HistoryInsertPayload = {
    bucket_id: bucket.id,
    amount: Math.abs(delta),
    direction,
    description: undoDescription,
    actor_name: actorName.trim() || null,
    reverses_id: original.id,
  };

  const updatedBucket = await updateBucketBalance(bucket, delta);

  try {
    const transaction = await insertBucketTransaction(pendingHistory);
    return { bucket: updatedBucket, transaction };
  } catch (error) {
    throw new HistorySaveError(updatedBucket, pendingHistory, error);
  }
}

export class TransferHistoryError extends Error {
  buckets: Bucket[];
  pendingHistory: HistoryInsertPayload[];

  constructor(
    buckets: Bucket[],
    pendingHistory: HistoryInsertPayload[],
    cause?: unknown,
  ) {
    super('Saldo uppdaterades men historiken misslyckades');
    this.name = 'TransferHistoryError';
    this.buckets = buckets;
    this.pendingHistory = pendingHistory;
    if (cause instanceof Error) {
      this.cause = cause;
    }
  }
}

export async function transferBetweenBuckets(
  from: Bucket,
  to: Bucket,
  amount: number,
  options: { description?: string; actorName: string },
): Promise<{ from: Bucket; to: Bucket }> {
  if (from.id === to.id) {
    throw new Error('Välj två olika hinkar.');
  }

  const transferId = crypto.randomUUID();
  const custom = normalizeDescription(options.description);
  const actorName = options.actorName.trim() || null;

  const fromPayload: HistoryInsertPayload = {
    bucket_id: from.id,
    amount,
    direction: 'remove',
    description: custom ?? `Flytt till ${to.name}`,
    actor_name: actorName,
    transfer_id: transferId,
  };

  const toPayload: HistoryInsertPayload = {
    bucket_id: to.id,
    amount,
    direction: 'add',
    description: custom ?? `Flytt från ${from.name}`,
    actor_name: actorName,
    transfer_id: transferId,
  };

  const updatedFrom = await updateBucketBalance(from, -amount);
  const updatedTo = await updateBucketBalance(to, amount);

  try {
    await insertBucketTransaction(fromPayload);
    await insertBucketTransaction(toPayload);
    return { from: updatedFrom, to: updatedTo };
  } catch (error) {
    throw new TransferHistoryError([updatedFrom, updatedTo], [fromPayload, toPayload], error);
  }
}

export function subscribeToBuckets(
  householdId: string,
  onChange: () => void,
): () => void {
  const channel = supabase
    .channel(`buckets:${householdId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'buckets',
        filter: `household_id=eq.${householdId}`,
      },
      () => onChange(),
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

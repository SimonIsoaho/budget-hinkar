import { supabase } from './supabase';
import type { ActivityItem, BucketTransaction } from './types';

function mapTransaction(row: Record<string, unknown>): BucketTransaction {
  return {
    id: row.id as string,
    bucket_id: row.bucket_id as string,
    amount: Number(row.amount),
    direction: row.direction as BucketTransaction['direction'],
    description: (row.description as string | null) ?? null,
    actor_name: (row.actor_name as string | null) ?? null,
    reverses_id: (row.reverses_id as string | null) ?? null,
    transfer_id: (row.transfer_id as string | null) ?? null,
    created_at: row.created_at as string,
  };
}

type TransactionRange = { start: Date; end: Date } | 'all';

export async function fetchBucketTransactions(
  bucketId: string,
  range: TransactionRange = 'all',
): Promise<BucketTransaction[]> {
  let query = supabase.from('bucket_transactions').select('*').eq('bucket_id', bucketId);

  if (range !== 'all') {
    query = query
      .gte('created_at', range.start.toISOString())
      .lte('created_at', range.end.toISOString());
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row) => mapTransaction(row as Record<string, unknown>));
}

export async function hasBucketTransactionsBefore(
  bucketId: string,
  before: Date,
): Promise<boolean> {
  const { count, error } = await supabase
    .from('bucket_transactions')
    .select('id', { count: 'exact', head: true })
    .eq('bucket_id', bucketId)
    .lt('created_at', before.toISOString());

  if (error) throw error;

  return (count ?? 0) > 0;
}

export async function fetchHouseholdTransactionsInRange(
  householdId: string,
  start: Date,
  end: Date,
): Promise<BucketTransaction[]> {
  const { data, error } = await supabase
    .from('bucket_transactions')
    .select('*, buckets!inner(household_id)')
    .eq('buckets.household_id', householdId)
    .gte('created_at', start.toISOString())
    .lte('created_at', end.toISOString())
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row) => mapTransaction(row as Record<string, unknown>));
}

export async function fetchHouseholdActivity(
  householdId: string,
  start: Date,
  end: Date,
  limit = 5,
): Promise<ActivityItem[]> {
  const { data, error } = await supabase
    .from('bucket_transactions')
    .select('*, buckets!inner(name, household_id)')
    .eq('buckets.household_id', householdId)
    .gte('created_at', start.toISOString())
    .lte('created_at', end.toISOString())
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;

  return (data ?? []).map((row) => {
    const record = row as Record<string, unknown>;
    const buckets = record.buckets as { name: string } | { name: string }[] | null;
    const bucketName = Array.isArray(buckets)
      ? buckets[0]?.name
      : buckets?.name;

    return {
      ...mapTransaction(record),
      bucket_name: bucketName ?? 'Hink',
    };
  });
}

export function getUndoableTransaction(
  transactions: BucketTransaction[],
): BucketTransaction | null {
  const reversedIds = new Set(
    transactions
      .map((tx) => tx.reverses_id)
      .filter((id): id is string => typeof id === 'string' && id.length > 0),
  );

  for (const tx of transactions) {
    if (tx.reverses_id) continue;
    if (reversedIds.has(tx.id)) continue;
    return tx;
  }

  return null;
}

export function subscribeToBucketTransactions(
  bucketId: string,
  onChange: () => void,
): () => void {
  const channel = supabase
    .channel(`bucket_transactions:${bucketId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'bucket_transactions',
        filter: `bucket_id=eq.${bucketId}`,
      },
      () => onChange(),
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export function subscribeToAllTransactions(onChange: () => void): () => void {
  const channel = supabase
    .channel('bucket_transactions:household')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'bucket_transactions',
      },
      () => onChange(),
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

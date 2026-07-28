import { supabase } from './supabase';
import type { BucketTransaction } from './types';

function mapTransaction(row: Record<string, unknown>): BucketTransaction {
  return {
    id: row.id as string,
    bucket_id: row.bucket_id as string,
    amount: Number(row.amount),
    direction: row.direction as BucketTransaction['direction'],
    description: (row.description as string | null) ?? null,
    created_at: row.created_at as string,
  };
}

export async function fetchBucketTransactions(
  bucketId: string,
): Promise<BucketTransaction[]> {
  const { data, error } = await supabase
    .from('bucket_transactions')
    .select('*')
    .eq('bucket_id', bucketId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row) => mapTransaction(row as Record<string, unknown>));
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

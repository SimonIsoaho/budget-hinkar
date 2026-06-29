import { supabase } from './supabase';
import type { Bucket } from './types';

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

export async function adjustBucketBalance(
  bucket: Bucket,
  delta: number,
): Promise<Bucket> {
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

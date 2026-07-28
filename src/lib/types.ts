export type Household = {
  id: string;
  code: string;
  name: string;
  created_at: string;
};

export type Bucket = {
  id: string;
  household_id: string;
  name: string;
  balance: number;
  created_at: string;
  updated_at: string;
};

export type TransactionDirection = 'add' | 'remove';

export type BucketTransaction = {
  id: string;
  bucket_id: string;
  amount: number;
  direction: TransactionDirection;
  description: string | null;
  created_at: string;
};

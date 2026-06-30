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

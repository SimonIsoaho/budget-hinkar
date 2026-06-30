import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { CenterMessage, Layout } from '../components/Layout';
import { getStoredHouseholdId } from '../lib/storage';
import { isSupabaseConfigured } from '../lib/supabase';

export function IndexPage() {
  const [householdId, setHouseholdId] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    setHouseholdId(getStoredHouseholdId());
  }, []);

  if (!isSupabaseConfigured) {
    return (
      <Layout>
        <CenterMessage
          title="Supabase saknas"
          body="Skapa en .env-fil med VITE_SUPABASE_URL och VITE_SUPABASE_ANON_KEY. Se README.md för instruktioner."
        />
      </Layout>
    );
  }

  if (householdId === undefined) {
    return (
      <Layout>
        <CenterMessage title="">
          <span className="spinner" style={{ color: 'var(--color-primary)' }} />
        </CenterMessage>
      </Layout>
    );
  }

  if (householdId) {
    return <Navigate to="/home" replace />;
  }

  return <Navigate to="/setup" replace />;
}

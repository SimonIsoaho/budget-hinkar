import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { Layout } from '../components/Layout';
import { createHousehold, joinHousehold } from '../lib/household';
import { setStoredHouseholdId } from '../lib/storage';
import styles from './Setup.module.css';

type Mode = 'choose' | 'create' | 'join';

export function SetupPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('choose');
  const [householdName, setHouseholdName] = useState('Vårt hushåll');
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const finishSetup = (householdId: string) => {
    setStoredHouseholdId(householdId);
    navigate('/home', { replace: true });
  };

  const handleCreate = async () => {
    setLoading(true);
    setError(null);
    try {
      const household = await createHousehold(householdName);
      finishSetup(household.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Försök igen.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!joinCode.trim()) {
      setError('Skriv in delningskoden du fått av din sambo.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const household = await joinHousehold(joinCode);
      finishSetup(household.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Försök igen.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout title="Kom igång">
      <div className={styles.content}>
        <div className={styles.hero}>
          <span className={styles.emoji} aria-hidden="true">
            🪣
          </span>
          <h2 className={styles.title}>Budgethinkar</h2>
          <p className={styles.subtitle}>
            Håll koll på gemensamma spar-hinkar tillsammans. Skapa ett hushåll och dela koden med
            din sambo.
          </p>
        </div>

        {mode === 'choose' && (
          <div className={styles.section}>
            <Button title="Skapa nytt hushåll" onClick={() => setMode('create')} />
            <Button
              title="Gå med med kod"
              variant="secondary"
              onClick={() => setMode('join')}
              className={styles.spaced}
            />
          </div>
        )}

        {mode === 'create' && (
          <div className={styles.section}>
            <label className={styles.label} htmlFor="household-name">
              Namn på hushållet
            </label>
            <input
              id="household-name"
              value={householdName}
              onChange={(event) => setHouseholdName(event.target.value)}
              placeholder="T.ex. Simon & Partner"
              className={styles.input}
            />
            {error && <p className={styles.error}>{error}</p>}
            <Button title="Skapa hushåll" onClick={handleCreate} loading={loading} />
            <Button
              title="Tillbaka"
              variant="secondary"
              onClick={() => {
                setMode('choose');
                setError(null);
              }}
              className={styles.spaced}
            />
          </div>
        )}

        {mode === 'join' && (
          <div className={styles.section}>
            <label className={styles.label} htmlFor="join-code">
              Delningskod
            </label>
            <input
              id="join-code"
              value={joinCode}
              onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
              placeholder="ABC12345"
              autoCapitalize="characters"
              autoCorrect="off"
              className={[styles.input, styles.codeInput].join(' ')}
            />
            {error && <p className={styles.error}>{error}</p>}
            <Button title="Gå med" onClick={handleJoin} loading={loading} />
            <Button
              title="Tillbaka"
              variant="secondary"
              onClick={() => {
                setMode('choose');
                setError(null);
              }}
              className={styles.spaced}
            />
          </div>
        )}
      </div>
    </Layout>
  );
}

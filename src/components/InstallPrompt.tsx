import { useEffect, useState } from 'react';
import { dismissInstallPrompt, isInstallPromptDismissed } from '../lib/storage';
import styles from './Banners.module.css';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
  );
}

function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosTip, setShowIosTip] = useState(false);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    if (isInstallPromptDismissed() || isStandalone()) {
      setHidden(true);
      return undefined;
    }

    setHidden(false);

    if (isIos()) {
      setShowIosTip(true);
      return undefined;
    }

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstall);
  }, []);

  const dismiss = () => {
    dismissInstallPrompt();
    setHidden(true);
    setDeferred(null);
    setShowIosTip(false);
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    dismiss();
  };

  if (hidden) return null;
  if (!deferred && !showIosTip) return null;

  return (
    <div className={styles.install} role="region" aria-label="Installera app">
      <span className={styles.installText}>
        {showIosTip
          ? 'På iPhone: Dela → Lägg till på hemskärmen'
          : 'Installera Budgethinkar på hemskärmen'}
      </span>
      <div className={styles.installActions}>
        {deferred && (
          <button type="button" className={styles.installBtn} onClick={install}>
            Installera
          </button>
        )}
        <button type="button" className={styles.dismissBtn} onClick={dismiss}>
          {showIosTip ? 'Stäng' : 'Inte nu'}
        </button>
      </div>
    </div>
  );
}

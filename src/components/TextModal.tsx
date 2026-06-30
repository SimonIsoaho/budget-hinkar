import { useEffect, useState } from 'react';
import { Button } from './Button';
import styles from './Modal.module.css';

type TextModalProps = {
  visible: boolean;
  title: string;
  placeholder: string;
  confirmLabel: string;
  onClose: () => void;
  onConfirm: (value: string) => void | Promise<void>;
  loading?: boolean;
};

export function TextModal({
  visible,
  title,
  placeholder,
  confirmLabel,
  onClose,
  onConfirm,
  loading = false,
}: TextModalProps) {
  const [value, setValue] = useState('');

  useEffect(() => {
    if (!visible) setValue('');
  }, [visible]);

  const handleClose = () => {
    setValue('');
    onClose();
  };

  const handleConfirm = async () => {
    await onConfirm(value);
    setValue('');
  };

  if (!visible) return null;

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="text-modal-title">
      <button type="button" className={styles.backdrop} onClick={handleClose} aria-label="Stäng" />
      <div className={styles.sheet}>
        <h2 id="text-modal-title" className={styles.title}>
          {title}
        </h2>
        <input
          autoFocus
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={placeholder}
          className={styles.input}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && value.trim()) handleConfirm();
          }}
        />
        <div className={styles.actions}>
          <Button title="Avbryt" variant="secondary" onClick={handleClose} className={styles.action} />
          <Button
            title={confirmLabel}
            onClick={handleConfirm}
            loading={loading}
            disabled={!value.trim()}
            className={styles.action}
          />
        </div>
      </div>
    </div>
  );
}

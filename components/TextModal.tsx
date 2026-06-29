import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Button } from './Button';
import { colors, radius, spacing } from '../constants/theme';

type TextModalProps = {
  visible: boolean;
  title: string;
  placeholder: string;
  confirmLabel: string;
  onClose: () => void;
  onConfirm: (value: string) => void | Promise<void>;
  loading?: boolean;
  keyboardType?: 'default' | 'decimal-pad';
};

export function TextModal({
  visible,
  title,
  placeholder,
  confirmLabel,
  onClose,
  onConfirm,
  loading = false,
  keyboardType = 'default',
}: TextModalProps) {
  const [value, setValue] = useState('');

  const handleClose = () => {
    setValue('');
    onClose();
  };

  const handleConfirm = async () => {
    await onConfirm(value);
    setValue('');
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <Pressable style={styles.backdrop} onPress={handleClose} />
        <View style={styles.sheet}>
          <Text style={styles.title}>{title}</Text>
          <TextInput
            autoFocus
            value={value}
            onChangeText={setValue}
            placeholder={placeholder}
            placeholderTextColor={colors.textSecondary}
            keyboardType={keyboardType}
            style={styles.input}
            returnKeyType="done"
            onSubmitEditing={handleConfirm}
          />
          <View style={styles.actions}>
            <Button title="Avbryt" variant="secondary" onPress={handleClose} style={styles.action} />
            <Button
              title={confirmLabel}
              onPress={handleConfirm}
              loading={loading}
              disabled={!value.trim()}
              style={styles.action}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.md,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 18,
    color: colors.text,
    backgroundColor: colors.background,
    marginBottom: spacing.lg,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  action: {
    flex: 1,
  },
});

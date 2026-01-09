/**
 * Input Component
 *
 * M3-compliant text input using React Native Paper.
 */

import React, { forwardRef } from 'react';
import { StyleSheet, ViewStyle, TextStyle, TextInput } from 'react-native';
import { TextInput as PaperTextInput } from 'react-native-paper';
import { useAppTheme } from '@/lib/theme';

type InputMode = 'flat' | 'outlined';

interface InputProps {
  /** Input value */
  value?: string;
  /** Default value (uncontrolled) */
  defaultValue?: string;
  /** Change handler */
  onChangeText?: (text: string) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Label text (appears above input in M3 style) */
  label?: string;
  /** Input mode style */
  mode?: InputMode;
  /** Error state */
  error?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Editable state */
  editable?: boolean;
  /** Multiline input */
  multiline?: boolean;
  /** Number of lines for multiline */
  numberOfLines?: number;
  /** Secure text entry (password) */
  secureTextEntry?: boolean;
  /** Keyboard type */
  keyboardType?:
    | 'default'
    | 'email-address'
    | 'numeric'
    | 'phone-pad'
    | 'url'
    | 'number-pad'
    | 'decimal-pad';
  /** Auto-capitalize behavior */
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  /** Auto-correct behavior */
  autoCorrect?: boolean;
  /** Auto-focus on mount */
  autoFocus?: boolean;
  /** Max length */
  maxLength?: number;
  /** Return key type */
  returnKeyType?: 'done' | 'go' | 'next' | 'search' | 'send';
  /** Submit editing handler */
  onSubmitEditing?: () => void;
  /** Focus handler */
  onFocus?: () => void;
  /** Blur handler */
  onBlur?: () => void;
  /** Left icon */
  left?: React.ReactNode;
  /** Right icon */
  right?: React.ReactNode;
  /** Additional container style */
  style?: ViewStyle;
  /** Content/input style */
  contentStyle?: TextStyle;
  /** Accessibility label */
  accessibilityLabel?: string;
  /** Test ID */
  testID?: string;
}

export const Input = forwardRef<TextInput, InputProps>(function Input(
  {
    value,
    defaultValue,
    onChangeText,
    placeholder,
    label,
    mode = 'outlined',
    error = false,
    disabled = false,
    editable = true,
    multiline = false,
    numberOfLines,
    secureTextEntry = false,
    keyboardType = 'default',
    autoCapitalize = 'sentences',
    autoCorrect = true,
    autoFocus = false,
    maxLength,
    returnKeyType,
    onSubmitEditing,
    onFocus,
    onBlur,
    left,
    right,
    style,
    contentStyle,
    accessibilityLabel,
    testID,
  },
  ref
) {
  const { colors } = useAppTheme();

  return (
    <PaperTextInput
      ref={ref}
      value={value}
      defaultValue={defaultValue}
      onChangeText={onChangeText}
      placeholder={placeholder}
      label={label}
      mode={mode}
      error={error}
      disabled={disabled}
      editable={editable}
      multiline={multiline}
      numberOfLines={numberOfLines}
      secureTextEntry={secureTextEntry}
      keyboardType={keyboardType}
      autoCapitalize={autoCapitalize}
      autoCorrect={autoCorrect}
      autoFocus={autoFocus}
      maxLength={maxLength}
      returnKeyType={returnKeyType}
      onSubmitEditing={onSubmitEditing}
      onFocus={onFocus}
      onBlur={onBlur}
      left={left}
      right={right}
      style={[styles.input, style]}
      contentStyle={contentStyle}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      placeholderTextColor={colors.onSurfaceVariant}
      underlineColor={colors.outline}
      activeUnderlineColor={colors.primary}
      outlineColor={colors.outline}
      activeOutlineColor={colors.primary}
      textColor={colors.onSurface}
    />
  );
});

const styles = StyleSheet.create({
  input: {
    width: '100%',
  },
});

export type { InputProps, InputMode };

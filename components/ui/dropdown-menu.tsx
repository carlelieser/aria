/**
 * DropdownMenu Component
 *
 * M3-compliant menu using React Native Paper.
 */

import React, { useState } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Menu, Divider, Text } from 'react-native-paper';
import { Icon } from '@/components/ui/icon';
import { Check } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useAppTheme } from '@/lib/theme';

interface MenuItemProps {
  /** Item title */
  title: string;
  /** Optional leading icon */
  leadingIcon?: LucideIcon;
  /** Optional trailing icon */
  trailingIcon?: LucideIcon;
  /** Press handler */
  onPress?: () => void;
  /** Disabled state */
  disabled?: boolean;
  /** Destructive variant */
  variant?: 'default' | 'destructive';
}

interface MenuCheckboxItemProps extends Omit<MenuItemProps, 'trailingIcon'> {
  /** Checked state */
  checked: boolean;
  /** Change handler */
  onCheckedChange?: (checked: boolean) => void;
}

interface MenuRadioItemProps extends Omit<MenuItemProps, 'trailingIcon'> {
  /** Selected state */
  selected: boolean;
}

interface DropdownMenuProps {
  /** The trigger element that opens the menu */
  trigger: React.ReactNode;
  /** Menu items */
  children: React.ReactNode;
  /** Anchor position */
  anchor?: { x: number; y: number };
  /** Container style */
  style?: ViewStyle;
}

interface DropdownMenuContextValue {
  visible: boolean;
  closeMenu: () => void;
  colors: ReturnType<typeof useAppTheme>['colors'];
}

const DropdownMenuContext = React.createContext<DropdownMenuContextValue | null>(null);

function useDropdownMenuContext() {
  const context = React.useContext(DropdownMenuContext);
  if (!context) {
    throw new Error('DropdownMenu components must be used within DropdownMenu');
  }
  return context;
}

export function DropdownMenu({
  trigger,
  children,
  style,
}: DropdownMenuProps) {
  const [visible, setVisible] = useState(false);
  const { colors } = useAppTheme();

  const openMenu = () => setVisible(true);
  const closeMenu = () => setVisible(false);

  return (
    <DropdownMenuContext.Provider value={{ visible, closeMenu, colors }}>
      <Menu
        visible={visible}
        onDismiss={closeMenu}
        anchor={
          <View onTouchEnd={openMenu}>
            {trigger}
          </View>
        }
        contentStyle={[styles.menuContent, { backgroundColor: colors.surfaceContainer }]}
        style={style}
      >
        {children}
      </Menu>
    </DropdownMenuContext.Provider>
  );
}

export function DropdownMenuTrigger({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function DropdownMenuItem({
  title,
  leadingIcon,
  trailingIcon,
  onPress,
  disabled = false,
  variant = 'default',
}: MenuItemProps) {
  const { closeMenu, colors } = useDropdownMenuContext();

  const handlePress = () => {
    onPress?.();
    closeMenu();
  };

  const textColor = variant === 'destructive' ? colors.error : colors.onSurface;
  const iconColor = variant === 'destructive' ? colors.error : colors.onSurfaceVariant;

  return (
    <Menu.Item
      onPress={handlePress}
      disabled={disabled}
      title={title}
      titleStyle={{ color: textColor }}
      leadingIcon={
        leadingIcon
          ? () => <Icon as={leadingIcon} size={20} color={iconColor} />
          : undefined
      }
      trailingIcon={
        trailingIcon
          ? () => <Icon as={trailingIcon} size={20} color={iconColor} />
          : undefined
      }
    />
  );
}

export function DropdownMenuCheckboxItem({
  title,
  leadingIcon,
  checked,
  onCheckedChange,
  onPress,
  disabled = false,
}: MenuCheckboxItemProps) {
  const { closeMenu, colors } = useDropdownMenuContext();

  const handlePress = () => {
    onCheckedChange?.(!checked);
    onPress?.();
    closeMenu();
  };

  return (
    <Menu.Item
      onPress={handlePress}
      disabled={disabled}
      title={title}
      leadingIcon={
        leadingIcon
          ? () => <Icon as={leadingIcon} size={20} color={colors.onSurfaceVariant} />
          : undefined
      }
      trailingIcon={
        checked
          ? () => <Icon as={Check} size={20} color={colors.primary} />
          : undefined
      }
    />
  );
}

export function DropdownMenuRadioItem({
  title,
  leadingIcon,
  selected,
  onPress,
  disabled = false,
}: MenuRadioItemProps) {
  const { closeMenu, colors } = useDropdownMenuContext();

  const handlePress = () => {
    onPress?.();
    closeMenu();
  };

  return (
    <Menu.Item
      onPress={handlePress}
      disabled={disabled}
      title={title}
      leadingIcon={
        leadingIcon
          ? () => <Icon as={leadingIcon} size={20} color={colors.onSurfaceVariant} />
          : undefined
      }
      trailingIcon={
        selected
          ? () => (
              <View style={[styles.radioIndicator, { backgroundColor: colors.primary }]} />
            )
          : undefined
      }
    />
  );
}

export function DropdownMenuLabel({ children }: { children: string }) {
  const { colors } = useDropdownMenuContext();

  return (
    <View style={styles.label}>
      <Text variant="labelMedium" style={{ color: colors.onSurfaceVariant }}>
        {children}
      </Text>
    </View>
  );
}

export function DropdownMenuSeparator() {
  return <Divider style={styles.separator} />;
}

export function DropdownMenuGroup({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function DropdownMenuContent({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

const styles = StyleSheet.create({
  menuContent: {
    borderRadius: 12,
    minWidth: 180,
  },
  label: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  separator: {
    marginVertical: 4,
  },
  radioIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});

export type {
  DropdownMenuProps,
  MenuItemProps,
  MenuCheckboxItemProps,
  MenuRadioItemProps,
};

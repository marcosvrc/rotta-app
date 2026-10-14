import Ionicons from '@expo/vector-icons/Ionicons';
import { TabList, TabSlot, TabTrigger, TabTriggerSlotProps, Tabs } from 'expo-router/ui';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconName, Txt } from '@/components/ui';
import { usePalette } from '@/state/rotta';
import { colors } from '@/theme';

/** Barra inferior flutuante: a aba ativa vira uma pílula com ícone e nome. */
export default function TabLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs>
      <TabSlot />
      <TabList style={[styles.bar, { bottom: insets.bottom + 12 }]}>
        <TabTrigger name="index" href="/" asChild>
          <PillButton icon="home" label="Viagens" />
        </TabTrigger>
        <TabTrigger name="roteiro" href="/roteiro" asChild>
          <PillButton icon="calendar" label="Roteiro" />
        </TabTrigger>
        <TabTrigger name="custos" href="/custos" asChild>
          <PillButton icon="wallet" label="Custos" />
        </TabTrigger>
        <TabTrigger name="ajustes" href="/ajustes" asChild>
          <PillButton icon="settings" label="Ajustes" />
        </TabTrigger>
      </TabList>
    </Tabs>
  );
}

function PillButton({ isFocused, icon, label, ...props }: TabTriggerSlotProps & { icon: IconName; label: string }) {
  const p = usePalette();
  if (isFocused) {
    return (
      <Pressable
        {...props}
        accessibilityRole="tab"
        accessibilityState={{ selected: true }}
        style={[styles.active, { backgroundColor: p.accent }]}
      >
        <Ionicons name={icon} size={20} color="#FFFFFF" />
        <Txt weight="semibold" color="#FFFFFF">
          {label}
        </Txt>
      </Pressable>
    );
  }
  return (
    <Pressable {...props} accessibilityRole="tab" accessibilityLabel={label} style={styles.idle}>
      <View>
        <Ionicons name={icon} size={20} color={colors.body} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 16,
    right: 16,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.card,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    shadowColor: '#1B2230',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  active: {
    height: 48,
    borderRadius: 24,
    paddingLeft: 14,
    paddingRight: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  idle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

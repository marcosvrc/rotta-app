import Ionicons from '@expo/vector-icons/Ionicons';
import { TabList, TabSlot, TabTrigger, TabTriggerSlotProps, Tabs } from 'expo-router/ui';
import { Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconName, Txt, tapFeedback } from '@/components/ui';
import { usePalette } from '@/state/rotta';
import { colors } from '@/theme';

/** Barra de abas flutuante no estilo do iOS 26: cápsula translúcida, ícone e nome em cada aba. */
export default function TabLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs>
      <TabSlot />
      {/* A TabList precisa ser filha direta de Tabs: é dela que o expo-router lê as abas. */}
      <TabList style={[styles.bar, { bottom: Math.max(insets.bottom, 12) }]}>
          <TabTrigger name="index" href="/" asChild>
            <TabButton icon="airplane" label="Viagens" />
          </TabTrigger>
          <TabTrigger name="roteiro" href="/roteiro" asChild>
            <TabButton icon="calendar" label="Roteiro" />
          </TabTrigger>
          <TabTrigger name="custos" href="/custos" asChild>
            <TabButton icon="wallet" label="Custos" />
          </TabTrigger>
          <TabTrigger name="ajustes" href="/ajustes" asChild>
            <TabButton icon="settings" label="Ajustes" />
          </TabTrigger>
      </TabList>
    </Tabs>
  );
}

function TabButton({ isFocused, icon, label, onPress, ...props }: TabTriggerSlotProps & { icon: IconName; label: string }) {
  const p = usePalette();
  const color = isFocused ? p.accent : colors.ink;
  return (
    <Pressable
      {...props}
      onPress={(e) => {
        if (!isFocused) tapFeedback();
        onPress?.(e);
      }}
      accessibilityRole="tab"
      accessibilityState={{ selected: !!isFocused }}
      accessibilityLabel={label}
      style={[styles.tab, isFocused && styles.tabActive]}
    >
      <Ionicons name={isFocused ? icon : (`${icon}-outline` as IconName)} size={22} color={color} />
      <Txt size={10} weight={isFocused ? 'semibold' : 'medium'} color={color} style={{ lineHeight: 12 }}>
        {label}
      </Txt>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: '4%',
    right: '4%',
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(250,250,252,0.98)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    shadowColor: '#000000',
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  tab: {
    flex: 1,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  tabActive: { backgroundColor: 'rgba(118,118,128,0.14)' },
});

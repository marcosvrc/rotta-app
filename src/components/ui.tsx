import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { ComponentProps, ReactNode, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TextProps,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { usePalette } from '@/state/rotta';
import { FontWeightName, colors, fonts } from '@/theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];

/** Texto com a fonte do app. Em RN, cada peso da Outfit é uma família própria. */
export function Txt({
  weight = 'regular',
  size = 14,
  color = colors.ink,
  style,
  ...props
}: TextProps & { weight?: FontWeightName; size?: number; color?: string }) {
  return (
    <Text
      {...props}
      style={[{ fontFamily: fonts[weight], fontSize: size, color, lineHeight: Math.round(size * 1.35) }, style]}
    />
  );
}

export function Card({
  children,
  onPress,
  padding = 16,
  borderColor = colors.line,
  style,
  accessibilityLabel,
}: {
  children: ReactNode;
  onPress?: () => void;
  padding?: number;
  borderColor?: string;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  const base = [styles.card, { padding, borderColor }, style];
  if (!onPress) return <View style={base}>{children}</View>;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [...base, pressed && { opacity: 0.85 }]}
    >
      {children}
    </Pressable>
  );
}

export function ScreenHeader({
  title,
  subtitle,
  back,
  right,
}: {
  title: string;
  subtitle?: string;
  back?: boolean;
  right?: ReactNode;
}) {
  return (
    <View style={[styles.header, back && { paddingLeft: 8 }]}>
      {back && (
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          accessibilityRole="button"
          accessibilityLabel="Voltar"
          style={styles.iconButton}
          hitSlop={4}
        >
          <Ionicons name="arrow-back" size={24} color={colors.ink} />
        </Pressable>
      )}
      <View style={{ flex: 1 }}>
        <Txt weight="medium" size={24}>
          {title}
        </Txt>
        {subtitle ? (
          <Txt size={13} color={colors.muted}>
            {subtitle}
          </Txt>
        ) : null}
      </View>
      {right}
    </View>
  );
}

export function SectionTitle({ children }: { children: string }) {
  return (
    <Txt weight="semibold" size={12} color={colors.muted} style={styles.sectionTitle}>
      {children.toUpperCase()}
    </Txt>
  );
}

export function Badge({ label, bg, fg, style }: { label: string; bg: string; fg: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.badge, { backgroundColor: bg }, style]}>
      <Txt weight="semibold" size={12} color={fg}>
        {label}
      </Txt>
    </View>
  );
}

/** Chip que liga e desliga (ex.: interesses). */
export function ToggleChip({ label, checked, onToggle }: { label: string; checked: boolean; onToggle: () => void }) {
  const p = usePalette();
  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      style={[styles.chip, { backgroundColor: checked ? p.accent : colors.card, borderColor: checked ? p.accent : colors.line }]}
    >
      <Txt weight="medium" color={checked ? '#FFFFFF' : colors.ink}>
        {label}
      </Txt>
    </Pressable>
  );
}

/** Escolha de uma entre poucas opções. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={styles.segmented} accessibilityRole="radiogroup">
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            style={[styles.segment, selected && styles.segmentSelected]}
          >
            <Txt weight={selected ? 'semibold' : 'regular'} color={selected ? colors.ink : colors.body} numberOfLines={1}>
              {o.label}
            </Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Stepper({
  value,
  min,
  max,
  onChange,
  unit,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  unit: string;
}) {
  return (
    <View style={styles.row}>
      <StepButton icon="remove" label={`Menos ${unit}`} disabled={value <= min} onPress={() => onChange(value - 1)} />
      <Txt weight="semibold" size={18} style={{ width: 40, textAlign: 'center' }} accessibilityLiveRegion="polite">
        {String(value)}
      </Txt>
      <StepButton icon="add" label={`Mais ${unit}`} disabled={value >= max} onPress={() => onChange(value + 1)} />
    </View>
  );
}

function StepButton({ icon, label, disabled, onPress }: { icon: IconName; label: string; disabled: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={styles.stepButton}
    >
      <Ionicons name={icon} size={22} color={disabled ? colors.line : colors.ink} />
    </Pressable>
  );
}

/** Linha de lista com ícone, título, subtítulo e seta. */
export function ListRow({
  title,
  subtitle,
  icon,
  onPress,
}: {
  title: string;
  subtitle?: string;
  icon: IconName;
  onPress?: () => void;
}) {
  const p = usePalette();
  return (
    <Pressable onPress={onPress} disabled={!onPress} accessibilityRole="button" style={styles.listRow}>
      <View style={[styles.listIcon, { backgroundColor: p.tint }]}>
        <Ionicons name={icon} size={20} color={p.ink} />
      </View>
      <View style={{ flex: 1 }}>
        <Txt weight="semibold" size={15}>
          {title}
        </Txt>
        {subtitle ? (
          <Txt size={13} color={colors.muted}>
            {subtitle}
          </Txt>
        ) : null}
      </View>
      {onPress ? <Ionicons name="chevron-forward" size={20} color={colors.muted} /> : null}
    </Pressable>
  );
}

export function PrimaryButton({
  label,
  onPress,
  filled = true,
  style,
}: {
  label: string;
  onPress: () => void;
  filled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const p = usePalette();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: filled ? p.accent : colors.card, borderColor: filled ? p.accent : colors.line },
        pressed && { opacity: 0.85 },
        style,
      ]}
    >
      <Txt weight="semibold" size={15} color={filled ? '#FFFFFF' : colors.ink}>
        {label}
      </Txt>
    </Pressable>
  );
}

export function Divider() {
  return <View style={{ height: 1, backgroundColor: colors.divider }} />;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 22,
    borderWidth: 1,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
    gap: 4,
  },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    letterSpacing: 0.6,
    marginTop: 20,
    marginBottom: 8,
    marginLeft: 4,
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  chip: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 22,
    borderWidth: 1,
    justifyContent: 'center',
  },
  segmented: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: 14,
    padding: 4,
    gap: 4,
  },
  segment: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  segmentSelected: {
    backgroundColor: colors.card,
    shadowColor: '#1B2230',
    shadowOpacity: 0.12,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepButton: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 64,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  listIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    minHeight: 50,
    borderRadius: 14,
    backgroundColor: colors.card,
    paddingHorizontal: 14,
    fontFamily: fonts.regular,
    fontSize: 16,
    color: colors.ink,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  errorBox: {
    backgroundColor: colors.criticalBg,
    borderRadius: 14,
    padding: 12,
    gap: 4,
  },
  formFooter: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  button: {
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

/** Campo de texto com rótulo e dica opcional. */
export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  hint,
  keyboardType,
  autoFocus,
  multiline,
  secureTextEntry,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  hint?: string;
  keyboardType?: TextInputProps['keyboardType'];
  autoFocus?: boolean;
  multiline?: boolean;
  secureTextEntry?: boolean;
}) {
  const p = usePalette();
  const [focused, setFocused] = useState(false);
  const plain = secureTextEntry || keyboardType === 'email-address';
  return (
    <View style={{ gap: 6 }}>
      <Txt weight="semibold" size={13} color={colors.muted}>
        {label}
      </Txt>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#8A93A1"
        keyboardType={keyboardType}
        autoFocus={autoFocus}
        multiline={multiline}
        secureTextEntry={secureTextEntry}
        autoCapitalize={plain ? 'none' : undefined}
        autoCorrect={plain ? false : undefined}
        autoComplete={secureTextEntry ? 'password' : keyboardType === 'email-address' ? 'email' : undefined}
        accessibilityLabel={label}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[
          styles.input,
          multiline && { minHeight: 88, paddingTop: 12, textAlignVertical: 'top' },
          { borderColor: focused ? p.accent : colors.line, borderWidth: focused ? 1.5 : 1 },
        ]}
      />
      {hint ? (
        <Txt size={12} color={colors.muted}>
          {hint}
        </Txt>
      ) : null}
    </View>
  );
}

/** Escolha de uma opção entre várias, em chips que quebram linha. */
export function ChoiceChips<T extends string | number>({
  label,
  options,
  value,
  onChange,
}: {
  label?: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const p = usePalette();
  return (
    <View style={{ gap: 6 }}>
      {label ? (
        <Txt weight="semibold" size={13} color={colors.muted}>
          {label}
        </Txt>
      ) : null}
      <View style={styles.chipsWrap} accessibilityRole="radiogroup">
        {options.map((o) => {
          const selected = o.value === value;
          return (
            <Pressable
              key={String(o.value)}
              onPress={() => onChange(o.value)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              style={[
                styles.chip,
                { backgroundColor: selected ? p.accent : colors.card, borderColor: selected ? p.accent : colors.line },
              ]}
            >
              <Txt weight="medium" color={selected ? '#FFFFFF' : colors.ink}>
                {o.label}
              </Txt>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function ErrorBox({ errors }: { errors: string[] }) {
  if (errors.length === 0) return null;
  return (
    <View style={styles.errorBox} accessibilityLiveRegion="polite" accessibilityRole="alert">
      {errors.map((e) => (
        <Txt key={e} size={13} color={colors.criticalInk}>
          {e}
        </Txt>
      ))}
    </View>
  );
}

/** Pede confirmação antes de uma ação que não dá para desfazer. */
export function confirmAction(title: string, message: string, confirmLabel: string, onConfirm: () => void) {
  if (Platform.OS === 'web') {
    if (globalThis.confirm?.(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Cancelar', style: 'cancel' },
    { text: confirmLabel, style: 'destructive', onPress: onConfirm },
  ]);
}

/** Tela de formulário: cabeçalho, campos com rolagem e botão de salvar fixo embaixo. */
export function FormScreen({
  title,
  subtitle,
  children,
  saveLabel = 'Salvar',
  onSave,
  footerExtra,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  saveLabel?: string;
  onSave: () => void;
  footerExtra?: ReactNode;
}) {
  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader back title={title} subtitle={subtitle} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: 20, gap: 18 }} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
        <View style={styles.formFooter}>
          {footerExtra}
          <PrimaryButton label={saveLabel} onPress={onSave} style={{ flex: 1 }} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { ComponentProps, ReactNode, useEffect, useState } from 'react';
import {
  Alert,
  Animated,
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

/** Toque leve de confirmação, como nos controles do iOS. Na web não faz nada. */
export function tapFeedback() {
  if (Platform.OS === 'web') return;
  Haptics.selectionAsync().catch(() => undefined);
}

/** Texto com a fonte do app. Em RN, cada peso da Inter é uma família própria. */
export function Txt({
  weight = 'regular',
  size = 15,
  color = colors.ink,
  style,
  ...props
}: TextProps & { weight?: FontWeightName; size?: number; color?: string }) {
  return (
    <Text
      {...props}
      style={[
        {
          fontFamily: fonts[weight],
          fontSize: size,
          color,
          lineHeight: Math.round(size * 1.3),
          // A Inter fica levemente mais apertada em títulos grandes, como a SF Pro Display.
          letterSpacing: size >= 22 ? -0.4 : size >= 17 ? -0.2 : 0,
        },
        style,
      ]}
    />
  );
}

/** Bloco branco arredondado sobre o fundo cinza (lista agrupada do iOS). */
export function Card({
  children,
  onPress,
  padding = 16,
  borderColor,
  style,
  accessibilityLabel,
}: {
  children: ReactNode;
  onPress?: () => void;
  padding?: number;
  /** Só para destacar (ex.: parada com alerta). Sem ela, o bloco não tem borda, como no iOS. */
  borderColor?: string;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  const highlighted = borderColor && borderColor !== colors.line;
  const base = [styles.card, { padding }, highlighted ? { borderWidth: 1.5, borderColor } : null, style];
  if (!onPress) return <View style={base}>{children}</View>;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [...base, pressed && { backgroundColor: '#F7F7F9' }]}
    >
      {children}
    </Pressable>
  );
}

/**
 * Cabeçalho no estilo iOS.
 * Telas das abas: título grande (Large Title) à esquerda.
 * Telas empilhadas (back): barra de navegação com "‹ Voltar" e título central.
 */
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
  const p = usePalette();
  if (back) {
    return (
      <View style={styles.navBar}>
        <View style={styles.navSide}>
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
            accessibilityRole="button"
            accessibilityLabel="Voltar"
            hitSlop={8}
            style={styles.navBack}
          >
            <Ionicons name="chevron-back" size={26} color={p.accent} style={{ marginLeft: -6 }} />
            <Txt size={17} color={p.accent}>
              Voltar
            </Txt>
          </Pressable>
        </View>
        <View style={styles.navCenter} accessibilityRole="header">
          <Txt weight="semibold" size={17} numberOfLines={1} style={{ textAlign: 'center' }}>
            {title}
          </Txt>
          {subtitle ? (
            <Txt size={12} color={colors.muted} numberOfLines={1} style={{ textAlign: 'center' }}>
              {subtitle}
            </Txt>
          ) : null}
        </View>
        <View style={[styles.navSide, { alignItems: 'flex-end' }]}>{right}</View>
      </View>
    );
  }
  return (
    <View style={styles.largeHeader}>
      <View style={{ flex: 1 }} accessibilityRole="header">
        <Txt weight="bold" size={34} numberOfLines={1}>
          {title}
        </Txt>
        {subtitle ? (
          <Txt size={15} color={colors.muted} numberOfLines={1}>
            {subtitle}
          </Txt>
        ) : null}
      </View>
      {right ? <View style={{ marginTop: 6 }}>{right}</View> : null}
    </View>
  );
}

/** Título de seção de lista agrupada: pequeno, em maiúsculas, cinza. */
export function SectionTitle({ children }: { children: string }) {
  return (
    <Txt size={13} color={colors.muted} style={styles.sectionTitle}>
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

/** Chip em cápsula que liga e desliga (ex.: interesses). */
export function ToggleChip({ label, checked, onToggle }: { label: string; checked: boolean; onToggle: () => void }) {
  const p = usePalette();
  return (
    <Pressable
      onPress={() => {
        tapFeedback();
        onToggle();
      }}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      style={[styles.chip, { backgroundColor: checked ? p.accent : colors.fill }]}
    >
      <Txt weight={checked ? 'semibold' : 'medium'} color={checked ? '#FFFFFF' : colors.ink}>
        {label}
      </Txt>
    </Pressable>
  );
}

/** Controle segmentado do iOS: trilho cinza e a opção escolhida em branco. */
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
            onPress={() => {
              if (!selected) tapFeedback();
              onChange(o.value);
            }}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            style={[styles.segment, selected && styles.segmentSelected]}
          >
            <Txt weight={selected ? 'semibold' : 'medium'} size={14} color={colors.ink} numberOfLines={1}>
              {o.label}
            </Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Stepper do iOS: uma cápsula cinza com − e +. O número fica ao lado. */
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
      <Txt weight="semibold" size={17} style={{ minWidth: 32, textAlign: 'right', marginRight: 10 }} accessibilityLiveRegion="polite">
        {String(value)}
      </Txt>
      <View style={styles.stepper}>
        <StepButton icon="remove" label={`Menos ${unit}`} disabled={value <= min} onPress={() => onChange(value - 1)} />
        <View style={styles.stepperDivider} />
        <StepButton icon="add" label={`Mais ${unit}`} disabled={value >= max} onPress={() => onChange(value + 1)} />
      </View>
    </View>
  );
}

function StepButton({ icon, label, disabled, onPress }: { icon: IconName; label: string; disabled: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={() => {
        tapFeedback();
        onPress();
      }}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      hitSlop={{ top: 6, bottom: 6 }}
      style={({ pressed }) => [styles.stepButton, pressed && { backgroundColor: '#D8D8DC' }]}
    >
      <Ionicons name={icon} size={20} color={disabled ? colors.chevron : colors.ink} />
    </Pressable>
  );
}

/** Interruptor do iOS (verde ligado), igual nos dois sistemas. */
export function Toggle({ value, onValueChange, accessibilityLabel }: { value: boolean; onValueChange: (v: boolean) => void; accessibilityLabel: string }) {
  const [anim] = useState(() => new Animated.Value(value ? 1 : 0));
  useEffect(() => {
    Animated.timing(anim, { toValue: value ? 1 : 0, duration: 180, useNativeDriver: false }).start();
  }, [value, anim]);
  const translateX = anim.interpolate({ inputRange: [0, 1], outputRange: [2, 22] });
  const backgroundColor = anim.interpolate({ inputRange: [0, 1], outputRange: [colors.fill, colors.switchOn] });
  return (
    <Pressable
      onPress={() => {
        tapFeedback();
        onValueChange(!value);
      }}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={accessibilityLabel}
      hitSlop={8}
    >
      <Animated.View style={[styles.switchTrack, { backgroundColor }]}>
        <Animated.View style={[styles.switchKnob, { transform: [{ translateX }] }]} />
      </Animated.View>
    </Pressable>
  );
}

/** Linha de lista no estilo Ajustes do iOS: ícone em quadrado colorido, título, subtítulo e seta. */
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
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.listRow, pressed && onPress ? { backgroundColor: '#E5E5EA' } : null]}
    >
      <View style={[styles.listIcon, { backgroundColor: p.accent }]}>
        <Ionicons name={icon} size={18} color="#FFFFFF" />
      </View>
      <View style={{ flex: 1 }}>
        <Txt size={17}>{title}</Txt>
        {subtitle ? (
          <Txt size={13} color={colors.muted}>
            {subtitle}
          </Txt>
        ) : null}
      </View>
      {onPress ? <Ionicons name="chevron-forward" size={18} color={colors.chevron} /> : null}
    </Pressable>
  );
}

/** Botão em cápsula. Cheio: ação principal. Vazio: fundo na cor clara do destaque, como o botão "tinted" do iOS. */
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
        { backgroundColor: filled ? p.accent : p.tint },
        pressed && { opacity: 0.75 },
        style,
      ]}
    >
      <Txt weight="semibold" size={17} color={filled ? '#FFFFFF' : p.ink} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
        {label}
      </Txt>
    </Pressable>
  );
}

/** Separador fino. Por padrão começa recuado, alinhado ao texto das linhas, como no iOS. */
export function Divider({ inset = 16 }: { inset?: number }) {
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.divider, marginLeft: inset }} />;
}

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
      <Txt size={13} color={colors.muted} style={{ marginLeft: 4 }}>
        {label}
      </Txt>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#A0A0A6"
        keyboardType={keyboardType}
        autoFocus={autoFocus}
        multiline={multiline}
        secureTextEntry={secureTextEntry}
        autoCapitalize={plain ? 'none' : undefined}
        autoCorrect={plain ? false : undefined}
        autoComplete={secureTextEntry ? 'password' : keyboardType === 'email-address' ? 'email' : undefined}
        accessibilityLabel={label}
        selectionColor={p.accent}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[
          styles.input,
          multiline && { minHeight: 96, paddingTop: 13, textAlignVertical: 'top' },
          { borderColor: focused ? p.accent : 'transparent' },
        ]}
      />
      {hint ? (
        <Txt size={13} color={colors.muted} style={{ marginLeft: 4 }}>
          {hint}
        </Txt>
      ) : null}
    </View>
  );
}

/** Escolha de uma opção entre várias, em cápsulas que quebram linha. */
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
        <Txt size={13} color={colors.muted} style={{ marginLeft: 4 }}>
          {label}
        </Txt>
      ) : null}
      <View style={styles.chipsWrap} accessibilityRole="radiogroup">
        {options.map((o) => {
          const selected = o.value === value;
          return (
            <Pressable
              key={String(o.value)}
              onPress={() => {
                if (!selected) tapFeedback();
                onChange(o.value);
              }}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              style={[styles.chip, { backgroundColor: selected ? p.accent : colors.card }]}
            >
              <Txt weight={selected ? 'semibold' : 'medium'} color={selected ? '#FFFFFF' : colors.ink}>
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
        <View key={e} style={{ flexDirection: 'row', gap: 8 }}>
          <Ionicons name="alert-circle" size={18} color={colors.criticalInk} />
          <Txt size={14} color={colors.criticalInk} style={{ flex: 1 }}>
            {e}
          </Txt>
        </View>
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

/** Tela de formulário: barra de navegação, campos com rolagem e botão de salvar embaixo. */
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
        <ScrollView contentContainerStyle={{ padding: 16, gap: 20 }} keyboardShouldPersistTaps="handled">
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

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 20,
    overflow: 'hidden',
  },
  largeHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 6,
    gap: 8,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    paddingHorizontal: 8,
  },
  navSide: { width: 96, justifyContent: 'center' },
  navBack: { flexDirection: 'row', alignItems: 'center', minHeight: 44, paddingRight: 8 },
  navCenter: { flex: 1, alignItems: 'center' },
  sectionTitle: {
    marginTop: 24,
    marginBottom: 7,
    marginLeft: 16,
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  chip: {
    minHeight: 40,
    paddingHorizontal: 16,
    borderRadius: 20,
    justifyContent: 'center',
  },
  segmented: {
    flexDirection: 'row',
    backgroundColor: colors.fill,
    borderRadius: 100,
    padding: 3,
    gap: 2,
  },
  segment: {
    flex: 1,
    minHeight: 40,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  segmentSelected: {
    backgroundColor: colors.card,
    shadowColor: '#000000',
    shadowOpacity: 0.12,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.fill,
    borderRadius: 100,
    overflow: 'hidden',
  },
  stepperDivider: { width: StyleSheet.hairlineWidth, height: 18, backgroundColor: colors.chevron },
  stepButton: {
    width: 50,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchTrack: { width: 51, height: 31, borderRadius: 16, justifyContent: 'center' },
  switchKnob: {
    width: 27,
    height: 27,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOpacity: 0.2,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 52,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  listIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    backgroundColor: colors.card,
    paddingHorizontal: 14,
    fontFamily: fonts.regular,
    fontSize: 17,
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
    gap: 6,
  },
  formFooter: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
    backgroundColor: colors.background,
  },
  button: {
    minHeight: 50,
    borderRadius: 100,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

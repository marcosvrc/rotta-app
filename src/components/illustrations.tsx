import { StyleProp, View, ViewStyle } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { Txt } from '@/components/ui';
import { usePalette } from '@/state/rotta';
import { colors } from '@/theme';

/** Ilustração provisória da cidade, na cor de destaque. A foto real virá da Places API. */
export function CityIllustration({ height = 150, style }: { height?: number; style?: StyleProp<ViewStyle> }) {
  const p = usePalette();
  const w = 400;
  const h = 150;
  const heights = [0.22, 0.34, 0.18, 0.4, 0.26, 0.3, 0.16, 0.36, 0.24, 0.2, 0.32, 0.18, 0.28, 0.22];
  let city = `M0 ${h}`;
  heights.forEach((f, i) => {
    const x0 = (w / heights.length) * i;
    const x1 = (w / heights.length) * (i + 1);
    const y = h - h * f;
    city += ` L${x0} ${y} L${x1} ${y}`;
  });
  city += ` L${w} ${h} Z`;
  return (
    <View style={[{ height, backgroundColor: p.ink, overflow: 'hidden' }, style]} accessible={false}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMax slice">
        <Rect x={0} y={0} width={w} height={h} fill={p.ink} />
        <Circle cx={w * 0.78} cy={h * 0.32} r={h * 0.16} fill="#F2B880" />
        <Path
          d={`M0 ${h * 0.72} L${w * 0.12} ${h * 0.58} L${w * 0.26} ${h * 0.66} L${w * 0.42} ${h * 0.48} L${w * 0.58} ${h * 0.62} L${w * 0.74} ${h * 0.5} L${w} ${h * 0.6} L${w} ${h} L0 ${h} Z`}
          fill={p.accent}
        />
        <Path d={city} fill={p.deep} />
      </Svg>
    </View>
  );
}

const AVATAR_COLORS = ['#C9DCEB', '#E9DCC6', '#D8E6CF', '#F2D3B3', '#E5CFE0', '#F5E3A8', '#D7E3EE'];

/** Miniatura provisória do lugar; a foto real virá da Places API. */
export function PlaceAvatar({ name, seed, size = 48 }: { name: string; seed: number; size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: 14,
        backgroundColor: AVATAR_COLORS[seed % AVATAR_COLORS.length],
        alignItems: 'center',
        justifyContent: 'center',
      }}
      accessible={false}
    >
      <Txt weight="semibold" size={Math.round(size / 2.6)} color={colors.ink}>
        {name.charAt(0).toUpperCase()}
      </Txt>
    </View>
  );
}

/** Anel com a nota do roteiro. */
export function ScoreRing({ score, color, size = 68 }: { score: number; color: string; size?: number }) {
  const stroke = 6;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <View
      style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}
      accessible
      accessibilityLabel={`Nota do roteiro: ${score} de 100`}
    >
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke="#39445A" strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${(c * score) / 100} ${c}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <Txt weight="semibold" size={22} color="#FFFFFF">
        {String(score)}
      </Txt>
    </View>
  );
}

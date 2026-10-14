/** Ex.: 15410 -> "R$ 15.410". */
export function formatBrl(value: number): string {
  const abs = Math.abs(Math.round(value));
  const digits = String(abs).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${value < 0 ? '-R$ ' : 'R$ '}${digits}`;
}

/** Ex.: 6.5 -> "6,5 km"; 0.92 -> "900 m". */
export function formatDistance(km: number): string {
  if (km < 1) {
    const meters = Math.round((km * 1000) / 50) * 50;
    return `${Math.max(meters, 50)} m`;
  }
  const tenths = Math.round(km * 10);
  const whole = Math.floor(tenths / 10);
  const decimal = tenths % 10;
  return decimal === 0 ? `${whole} km` : `${whole},${decimal} km`;
}

/** Ex.: 45 -> "45 min"; 120 -> "2h"; 511 -> "8h31". */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, '0')}`;
}

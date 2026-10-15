import { TripRecord } from './appdata';
import { shortDateLabel, timeLabel } from './calendar';
import { formatDuration } from './format';
import { sortStops, stopEnd, tripRangeLabel } from './model';
import { RESERVATION_TYPE_LABEL, sortReservations } from './reservations';
import { weatherOn } from './weather';

export interface ShareOptions {
  /** Incluir reservas com código (só para quem vai junto). */
  reservations: boolean;
}

function header(record: TripRecord): string {
  const t = record.trip;
  const place = t.country ? `${t.destination}, ${t.country}` : t.destination;
  return `${place} · ${tripRangeLabel(t)} · ${t.days.length} ${t.days.length === 1 ? 'dia' : 'dias'}`;
}

/** Roteiro em texto simples, pronto para colar no WhatsApp. */
export function itineraryText(record: TripRecord, options: ShareOptions): string {
  const t = record.trip;
  const lines: string[] = [`*${header(record)}*`, ''];
  t.days.forEach((day, i) => {
    const w = weatherOn(record.weather, day.date);
    const weather = w ? ` (${w.maxC}°/${w.minC}°${day.rainExpected ? ', chuva' : ''})` : day.rainExpected ? ' (chuva prevista)' : '';
    lines.push(`*Dia ${i + 1} · ${shortDateLabel(day.date)}* · ${day.title}${weather}`);
    const stops = sortStops(day.stops);
    if (stops.length === 0) lines.push('  Livre');
    for (const s of stops) {
      const p = t.places.find((x) => x.id === s.placeId);
      lines.push(`  ${timeLabel(s.start)}–${timeLabel(stopEnd(s))} ${p?.name ?? 'Parada'}`);
    }
    lines.push('');
  });
  if (options.reservations && record.reservations.length > 0) {
    lines.push('*Reservas*');
    for (const r of sortReservations(record.reservations)) {
      const parts = [shortDateLabel(r.date), r.time !== undefined ? timeLabel(r.time) : null, RESERVATION_TYPE_LABEL[r.type], r.title, r.code ? `código ${r.code}` : null];
      lines.push(`  ${parts.filter(Boolean).join(' · ')}`);
    }
    lines.push('');
  }
  lines.push('Planejado no Rotta');
  return lines.join('\n');
}

function esc(text: string): string {
  return text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

/** Roteiro em HTML para gerar o PDF (uma página por dia não é necessária: o texto flui). */
export function itineraryHtml(record: TripRecord, options: ShareOptions): string {
  const t = record.trip;
  const days = t.days
    .map((day, i) => {
      const w = weatherOn(record.weather, day.date);
      const weather = w ? `${w.maxC}° / ${w.minC}°${day.rainExpected ? ' · chuva' : ''}` : day.rainExpected ? 'chuva prevista' : '';
      const stops = sortStops(day.stops)
        .map((s) => {
          const p = t.places.find((x) => x.id === s.placeId);
          const meta = [p?.kind, formatDuration(s.durationMinutes), p?.neighborhood].filter(Boolean).join(' · ');
          return `<tr><td class="time">${timeLabel(s.start)}</td><td><b>${esc(p?.name ?? 'Parada')}</b><br><span class="meta">${esc(meta)}</span></td></tr>`;
        })
        .join('');
      return `<section><h2>Dia ${i + 1} · ${esc(shortDateLabel(day.date))} <span class="title">${esc(day.title)}</span></h2>${
        weather ? `<p class="weather">${esc(weather)}</p>` : ''
      }${stops ? `<table>${stops}</table>` : '<p class="meta">Dia livre</p>'}</section>`;
    })
    .join('');
  const reservations =
    options.reservations && record.reservations.length > 0
      ? `<section><h2>Reservas</h2><table>${sortReservations(record.reservations)
          .map(
            (r) =>
              `<tr><td class="time">${esc(shortDateLabel(r.date))}${r.time !== undefined ? `<br>${timeLabel(r.time)}` : ''}</td><td><b>${esc(r.title)}</b><br><span class="meta">${esc(
                [RESERVATION_TYPE_LABEL[r.type], r.code ? `código ${r.code}` : null].filter(Boolean).join(' · '),
              )}</span></td></tr>`,
          )
          .join('')}</table></section>`
      : '';
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${esc(t.destination)}</title><style>
body{font-family:-apple-system,Roboto,Helvetica,Arial,sans-serif;color:#1B2230;margin:32px;font-size:13px}
h1{font-size:24px;margin:0}.sub{color:#5F6775;margin:4px 0 20px}
section{break-inside:avoid;margin-bottom:18px}h2{font-size:15px;margin:0 0 6px;border-bottom:1px solid #E4E9F0;padding-bottom:4px}
.title{font-weight:normal;color:#5F6775}.weather{color:#1F3B63;margin:0 0 6px}
table{border-collapse:collapse;width:100%}td{padding:4px 0;vertical-align:top}.time{width:72px;font-weight:600}
.meta{color:#5F6775;font-size:12px}footer{color:#8A93A1;font-size:11px;margin-top:24px}
</style></head><body><h1>${esc(t.country ? `${t.destination}, ${t.country}` : t.destination)}</h1><p class="sub">${esc(
    `${tripRangeLabel(t)} · ${t.days.length} dias · ${t.travelers} ${t.travelers === 1 ? 'viajante' : 'viajantes'}`,
  )}</p>${days}${reservations}<footer>Planejado no Rotta</footer></body></html>`;
}

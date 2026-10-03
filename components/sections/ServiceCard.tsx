import { memo, type CSSProperties } from 'react';
import { Icon } from '@/components/ui/FeatureIcon';
import type { IconName } from '@/content/icons';
import { SYMBOL_POINTS, SYMBOL_VIEWBOX } from '@/lib/fx';

/**
 * Karty služeb (stůl služeb + přechodová scéna) — jeden vzhled pro obě místa.
 * Rub: tmavé sklo s neonovou „trubicí" po hraně, velké číslo a obrys šipky
 * ELEVATE přesahující přes okraj. Líc: světlejší sklo s gradientním
 * rámem, rozsvícená ikona a název služby, šipka „výš" v rohu.
 */
type Item = { num: string; icon: IconName };

function Watermark({ className = '' }: { className?: string }) {
  return (
    <svg viewBox={SYMBOL_VIEWBOX} aria-hidden className={`pointer-events-none absolute ${className}`}>
      <polygon points={SYMBOL_POINTS} fill="none" stroke="currentColor" strokeWidth={10} strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Zkratka služby na rubu karty (vedle ikony): 10 px s prostrkáním, nebo méně
 * a těsněji, když by se nejdelší zkratka sady nevešla (RU „Приложения").
 * Stejné písmo pro celou sadu; cqw = šířka karty.
 */
export function cardLabelStyle(labels: string[]): CSSProperties {
  const longest = Math.max(1, ...labels.map((label) => label.length));
  // šířka znaku vůči velikosti písma včetně prostrkání 0,16em (cyrilice je širší)
  const wide = labels.some((label) => /[\u0400-\u04ff]/.test(label)) ? 1.12 : 0.99;
  // místo vedle ikony na kartě široké 150 px
  if (80 / (longest * wide) >= 10) return {};
  const tight = wide - 0.12;
  return { letterSpacing: '0.04em', fontSize: `min(10px, calc((100cqw - 68px) / ${(longest * tight).toFixed(2)}))` };
}

export const ServiceCardBack = memo(function ServiceCardBack({
  item,
  label,
  labelStyle,
  className = '',
}: {
  item: Item;
  label: string;
  /** společný styl zkratky pro celou sadu karet (cardLabelStyle) */
  labelStyle?: CSSProperties;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={`absolute inset-0 overflow-hidden rounded-2xl border border-[rgba(80,120,255,0.28)] ${className}`}
      style={{ containerType: 'inline-size', background: 'linear-gradient(170deg,#0c1638 0%,#070b1c 58%,#0a1330 100%)' }}
    >
      {/* neonová trubice po levé hraně */}
      <span
        aria-hidden
        className="absolute bottom-5 left-0 top-5 w-[2px] rounded-full bg-[#9fc0ff]"
        style={{ boxShadow: '0 0 8px 1px rgba(61,123,255,0.9), 0 0 22px 3px rgba(31,91,255,0.55)' }}
      />
      <Watermark className="-bottom-8 -right-10 h-40 w-32 text-[rgba(61,123,255,0.22)]" />
      <span
        aria-hidden
        className="absolute inset-0"
        style={{ background: 'radial-gradient(120% 60% at 0% 0%, rgba(61,123,255,0.18), transparent 60%)' }}
      />
      <span className="absolute left-4 top-3.5 font-display text-[28px] font-bold leading-none text-transparent [-webkit-text-stroke:1px_rgba(143,178,255,0.75)]">
        {item.num}
      </span>
      <span className="absolute bottom-4 left-4 right-4 flex items-center gap-2.5">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[rgba(61,123,255,0.6)] bg-[rgba(31,91,255,0.14)] text-[var(--blue-bright)] shadow-[0_0_16px_rgba(31,91,255,0.45)]">
          <Icon name={item.icon} className="h-4 w-4" />
        </span>
        <span className="whitespace-nowrap font-display text-[10px] uppercase leading-tight tracking-[0.16em] text-muted" style={labelStyle ?? cardLabelStyle([label])}>
          {label}
        </span>
      </span>
    </span>
  );
});

/** Šířka jednoho znaku verzálkového názvu vůči velikosti písma (Unbounded Bold, s rezervou pro cyrilici). */
const TITLE_CHAR = 0.96;

/**
 * Název na kartě: poslední slovo stojí vždy samo na posledním řádku (vedle
 * něj je v rohu šipka), zbytek nad ním. Dlouhé slovo se spojovníkem
 * („Интернет-магазины") se dělí za spojovníkem, krátké („E-shopy") ne.
 */
function splitTitle(title: string) {
  const words = title.trim().split(/\s+/);
  let tail = words.pop() ?? '';
  const hyphen = tail.lastIndexOf('-');
  if (tail.length > 10 && hyphen > 0 && hyphen < tail.length - 1) {
    words.push(tail.slice(0, hyphen + 1));
    tail = tail.slice(hyphen + 1);
  }
  return { head: words, tail };
}

/**
 * Velikost názvu: 15 px, nebo méně, když by se nejdelší slovo nevešlo —
 * řádky nad posledním mají celou šířku karty, poslední končí před šipkou.
 * Jednotka cqw = šířka vnitřku karty, takže platí pro stůl služeb, mobilní
 * řadu i letící klony. Počítá se pro celou sadu, ať mají karty stejné písmo.
 */
export function cardTitleSize(titles: string[]) {
  let inner = 1;
  let last = 1;
  for (const title of titles) {
    const { head, tail } = splitTitle(title);
    last = Math.max(last, tail.length);
    for (const word of head) inner = Math.max(inner, word.length);
  }
  return `min(15px, calc(100cqw / ${(inner * TITLE_CHAR).toFixed(2)}), calc((100cqw - 16px) / ${(last * TITLE_CHAR).toFixed(2)}))`;
}

export const ServiceCardFront = memo(function ServiceCardFront({
  item,
  title,
  titleSize,
  className = '',
}: {
  item: Item;
  title: string;
  /** společná velikost názvu pro celou sadu karet (cardTitleSize) */
  titleSize?: string;
  className?: string;
}) {
  const { head, tail } = splitTitle(title);
  return (
    <span className={`absolute inset-0 overflow-hidden rounded-2xl p-px ${className}`} style={{ background: 'linear-gradient(160deg,#8fb2ff,#1f5bff 45%,#00c2ff)' }}>
      <span
        className="relative flex h-full w-full flex-col rounded-[15px] p-4 text-left"
        style={{ containerType: 'inline-size', background: 'linear-gradient(170deg,rgba(22,38,92,0.98),rgba(7,11,26,0.98) 70%)', boxShadow: 'inset 0 -40px 60px -30px rgba(31,91,255,0.55)' }}
      >
        <Watermark className="-right-6 -top-6 h-32 w-24 text-[rgba(143,178,255,0.16)]" />
        <span aria-hidden className="font-display text-xs tracking-[0.22em] text-[#9fc0ff]">{item.num}</span>
        <span className="mt-auto grid h-12 w-12 place-items-center rounded-2xl bg-[linear-gradient(135deg,var(--blue),var(--blue-bright))] text-white shadow-[0_0_26px_rgba(31,91,255,0.7)]">
          <Icon name={item.icon} className="h-6 w-6" />
        </span>
        <span className="mt-3 font-display text-[15px] font-bold uppercase leading-[1.1] text-ink" style={{ fontSize: titleSize ?? cardTitleSize([title]) }}>
          {head.length ? (
            <>
              {head.join(' ')}
              <br />
            </>
          ) : null}
          {tail}
        </span>
        <svg viewBox={SYMBOL_VIEWBOX} aria-hidden className="absolute bottom-4 right-4 h-4 w-3 text-[var(--blue-bright)]">
          <polygon points={SYMBOL_POINTS} fill="currentColor" />
        </svg>
      </span>
    </span>
  );
});

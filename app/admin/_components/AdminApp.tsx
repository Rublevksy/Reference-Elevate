'use client';

import { createBrowserClient } from '@supabase/ssr';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import type { ProjectRow } from '@/lib/content/projects';
import {
  createUpload,
  deleteInquiry,
  getMailStatus,
  sendTestMail,
  type MailStatus,
  listInquiries,
  setInquiryStatus,
  setMaintenance,
  type Inquiry,
  type InquiryStatus,
  deleteProject,
  reorderProjects,
  savePricing,
  saveProject,
  saveSettings,
  saveTexts,
  type SettingsInput,
  setPassword,
  setPublished,
  signOut,
  type ProjectInput,
} from '../actions';
import { Btn, Card, Field, inputClass, SaveBar, SaveStatus, SearchInput, useSave } from './ui';
import { EDIT_SECTIONS, type EditField, type EditSection } from '@/lib/content/editable';
import { HintLightbox, HintMini, HintThumb, SerpPreview, hintFor, type Hint } from './hints';
import { site } from '@/content/site';
import { PLATFORMS, detectPlatform, resolveSocial, type SocialInput } from '@/lib/social';
import { SocialIcon } from '@/components/ui/SocialIcon';
import type { GalleryItem, Industry } from '@/lib/content/gallery';
import { GalleryTab } from './GalleryTab';
import { INQUIRY_PARAM, INQUIRY_STORE, isInquiryKey } from '@/lib/inquiryLink';

const SITE_URL = site.url;

/* ------------------------------------------------------------------ */
/*  Obrázky: zmenšení v prohlížeči + nahrání přes podepsanou adresu     */
/* ------------------------------------------------------------------ */

/** Šířky jako u stávajících projektů (notebook 1152 px, telefon 585 px). */
const IMAGE_SPEC = {
  desktop: { width: 1152, maxHeight: 12000, label: 'Desktop', hint: 'Screenshot celé stránky, ideálně 1440 px na šířku' },
  mobile: { width: 585, maxHeight: 16000, label: 'Mobil', hint: 'Screenshot celé stránky, ideálně 390 px na šířku' },
} as const;

async function prepareImage(file: File, kind: 'desktop' | 'mobile') {
  const spec = IMAGE_SPEC[kind];
  const bitmap = await createImageBitmap(file);
  const width = Math.min(spec.width, bitmap.width);
  const scale = width / bitmap.width;
  const height = Math.min(spec.maxHeight, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Prohlížeč neumí zpracovat obrázek.');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, 0, 0, bitmap.width, height / scale, 0, 0, width, height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.8));
  if (!blob) throw new Error('Obrázek se nepodařilo převést.');
  return { blob, width, height };
}

type ImageValue = { url: string; width: number; height: number };

function ImageField({ kind, value, onChange }: { kind: 'desktop' | 'mobile'; value: ImageValue; onChange: (v: ImageValue) => void }) {
  const [stage, setStage] = useState<'' | 'resize' | 'upload'>('');
  const [error, setError] = useState('');
  const supabase = useMemo(
    () => createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!),
    [],
  );

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setError('');
    try {
      setStage('resize');
      const [img, slot] = await Promise.all([prepareImage(file, kind), createUpload(kind)]);
      if (!slot.ok) throw new Error(slot.error);
      setStage('upload');
      const { error: upErr } = await supabase.storage.from('media').uploadToSignedUrl(slot.path, slot.token, img.blob, { contentType: 'image/jpeg' });
      if (upErr) throw upErr;
      onChange({ url: slot.publicUrl, width: img.width, height: img.height });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setStage('');
    }
  };

  const spec = IMAGE_SPEC[kind];
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[rgba(170,185,220,0.85)]">{spec.label}</p>
      <p className="mt-1 text-xs text-muted">{spec.hint}</p>
      <div
        className={`relative mt-3 overflow-y-auto rounded-xl border border-[var(--line)] bg-black/40 ${kind === 'desktop' ? 'aspect-[16/10] w-full' : 'mx-auto aspect-[390/844] w-[62%]'}`}
      >
        {value.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value.url} alt="" className="w-full" />
        ) : (
          <div className="grid h-full place-items-center p-4 text-center text-xs text-muted">Zatím bez obrázku</div>
        )}
        {stage ? (
          <div className="absolute inset-0 grid place-items-center bg-[rgba(4,6,11,0.72)] text-sm">
            <span className="inline-flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-[rgba(160,190,255,0.3)] border-t-[var(--blue-bright)]" />
              {stage === 'resize' ? 'Zmenšuji…' : 'Nahrávám…'}
            </span>
          </div>
        ) : null}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <label className={`inline-flex h-9 cursor-pointer items-center rounded-btn border border-[var(--line)] bg-white/[0.04] px-3.5 font-display text-[10px] uppercase tracking-[0.12em] transition-colors hover:border-[rgba(80,120,255,0.55)] ${stage ? 'pointer-events-none opacity-45' : ''}`}>
          {value.url ? 'Vyměnit' : 'Nahrát obrázek'}
          <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
        </label>
        {value.url ? <span className="text-xs text-muted">{value.width} × {value.height} px</span> : null}
      </div>
      {error ? <p className="mt-2 text-sm text-[#ffb3be]">{error}</p> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Projekty                                                           */
/* ------------------------------------------------------------------ */

const emptyProject = (): ProjectInput => ({
  name: '',
  kind: '',
  url: '',
  accent: '#1f5bff',
  tags: ['Web od nuly', 'Návrh', 'Vývoj'],
  desktop_image: '',
  desktop_width: 0,
  desktop_height: 0,
  mobile_image: '',
  mobile_width: 0,
  mobile_height: 0,
  published: true,
});

function ProjectEditor({ initial, onClose }: { initial: ProjectInput; onClose: () => void }) {
  const [p, setP] = useState<ProjectInput>(initial);
  const [tags, setTags] = useState(initial.tags.join(', '));
  const save = useSave();
  const set = <K extends keyof ProjectInput>(k: K, v: ProjectInput[K]) => setP((prev) => ({ ...prev, [k]: v }));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const submit = async () => {
    const ok = await save.run(() => saveProject({ ...p, tags: tags.split(',') }));
    if (ok) window.setTimeout(onClose, 700);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[rgba(2,4,9,0.82)] px-2 py-3 backdrop-blur-sm sm:px-4 sm:py-10" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="mx-auto max-w-4xl">
        <Card
          title={initial.id ? 'Upravit projekt' : 'Nový projekt'}
          subtitle="Na webu dostane stejnou animaci a rozvržení jako ostatní projekty."
          actions={<Btn size="sm" onClick={onClose}>Zavřít</Btn>}
        >
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Název">
              <input className={inputClass} value={p.name} onChange={(e) => set('name', e.target.value)} placeholder="EURO-MOTORS" autoFocus />
            </Field>
            <Field label="Obor / kategorie" hint="Pod názvem, např. „Autoservis, Praha 10“">
              <input className={inputClass} value={p.kind} onChange={(e) => set('kind', e.target.value)} />
            </Field>
            <Field label="Odkaz na web">
              <input className={inputClass} value={p.url} onChange={(e) => set('url', e.target.value)} placeholder="https://" />
            </Field>
            <Field label="Barva projektu" hint="Jemně přebarví pozadí sekce, když je projekt aktivní">
              <div className="flex items-center gap-3">
                <input type="color" value={p.accent} onChange={(e) => set('accent', e.target.value)} className="h-11 w-14 shrink-0 cursor-pointer rounded-xl border border-[var(--line)] bg-transparent p-1" />
                <input className={inputClass} value={p.accent} onChange={(e) => set('accent', e.target.value)} />
              </div>
            </Field>
            <Field label="Štítky" hint="Oddělené čárkou, nejvýš 6" className="md:col-span-2">
              <input className={inputClass} value={tags} onChange={(e) => setTags(e.target.value)} />
            </Field>
          </div>

          <div className="mt-7 grid gap-6 border-t border-[var(--line)] pt-6 md:grid-cols-[1.7fr_1fr]">
            <ImageField
              kind="desktop"
              value={{ url: p.desktop_image, width: p.desktop_width, height: p.desktop_height }}
              onChange={(v) => setP((prev) => ({ ...prev, desktop_image: v.url, desktop_width: v.width, desktop_height: v.height }))}
            />
            <ImageField
              kind="mobile"
              value={{ url: p.mobile_image, width: p.mobile_width, height: p.mobile_height }}
              onChange={(v) => setP((prev) => ({ ...prev, mobile_image: v.url, mobile_width: v.width, mobile_height: v.height }))}
            />
          </div>

          <div className="mt-7 flex flex-col gap-4 border-t border-[var(--line)] pt-6 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <label className="flex cursor-pointer items-center gap-3 text-sm">
              <Toggle checked={p.published} onChange={(v) => set('published', v)} />
              Zveřejněno na webu
            </label>
            <div className="flex flex-wrap items-center justify-end gap-3 sm:gap-4">
              <SaveStatus state={save.state} error={save.error} />
              <Btn onClick={onClose} className="flex-1 sm:flex-none">Zrušit</Btn>
              <Btn variant="primary" onClick={submit} disabled={save.busy} className="flex-1 sm:flex-none">
                Uložit projekt
              </Btn>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full border transition-colors duration-300 disabled:opacity-50 ${
        checked ? 'border-[rgba(61,123,255,0.7)] bg-[rgba(31,91,255,0.35)] shadow-[0_0_14px_rgba(31,91,255,0.45)]' : 'border-[var(--line)] bg-white/[0.05]'
      }`}
    >
      <span className={`absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-white transition-[left] duration-300 ${checked ? 'left-[22px]' : 'left-[3px]'}`} />
    </button>
  );
}

function ProjectsTab({ projects }: { projects: ProjectRow[] }) {
  // lokální kopie → pořadí a zveřejnění se změní hned, server doběhne na pozadí
  const [items, setItems] = useState(projects);
  useEffect(() => setItems(projects), [projects]);
  const [editing, setEditing] = useState<ProjectInput | null>(null);
  const save = useSave();

  const optimistic = async (next: ProjectRow[], fn: () => Promise<{ ok: boolean; error?: string }>) => {
    const prev = items;
    setItems(next);
    const ok = await save.run(fn);
    if (!ok) setItems(prev);
  };

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    optimistic(next, () => reorderProjects(next.map((p) => p.id)));
  };

  return (
    <div className="space-y-6">
      <Card
        title="Projekty v sekci „Práce“"
        subtitle="Pořadí odpovídá webu. První tři projekty se objeví i v animovaném přechodu ze sekce Proces."
        actions={
          <div className="flex items-center gap-4">
            <SaveStatus state={save.state} error={save.error} />
            <Btn variant="primary" onClick={() => setEditing(emptyProject())}>+ Přidat projekt</Btn>
          </div>
        }
      >
        <ul className="space-y-3">
          {items.map((p, i) => {
            const moveButtons = (
              <>
                <button type="button" aria-label="Posunout výš" disabled={i === 0} onClick={() => move(i, -1)} className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-white/5 hover:text-ink disabled:opacity-25 sm:h-6 sm:w-6 sm:rounded-md">↑</button>
                <button type="button" aria-label="Posunout níž" disabled={i === items.length - 1} onClick={() => move(i, 1)} className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-white/5 hover:text-ink disabled:opacity-25 sm:h-6 sm:w-6 sm:rounded-md">↓</button>
              </>
            );
            const publish = (
              <label className="flex items-center gap-2.5 text-xs text-muted">
                <Toggle
                  checked={p.published}
                  onChange={(v) => optimistic(items.map((x) => (x.id === p.id ? { ...x, published: v } : x)), () => setPublished(p.id, v))}
                />
                {p.published ? 'Na webu' : 'Skryto'}
              </label>
            );
            const actions = (
              <div className="flex gap-2">
                <Btn size="sm" onClick={() => setEditing({ ...p })}>Upravit</Btn>
                <Btn
                  size="sm"
                  variant="danger"
                  onClick={() => {
                    if (window.confirm(`Smazat projekt „${p.name}“ včetně nahraných obrázků? Nelze vrátit.`)) {
                      optimistic(items.filter((x) => x.id !== p.id), () => deleteProject(p.id));
                    }
                  }}
                >
                  Smazat
                </Btn>
              </div>
            );
            return (
              <li
                key={p.id}
                className={`rounded-2xl border border-[var(--line)] bg-white/[0.02] p-3 transition-colors hover:border-[rgba(80,120,255,0.4)] sm:pr-4 ${p.published ? '' : 'opacity-60'}`}
              >
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="hidden flex-col gap-1 sm:flex">{moveButtons}</div>
                  <div className="relative h-[60px] w-[96px] shrink-0 overflow-hidden rounded-xl border border-[var(--line)] bg-black/40 sm:h-[72px] sm:w-[124px]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.desktop_image} alt="" className="w-full" loading="lazy" />
                    <span className="absolute inset-x-0 bottom-0 h-1" style={{ background: p.accent }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-[10px] tracking-[0.2em] text-[rgba(160,185,235,0.7)]">№ {String(i + 1).padStart(2, '0')}</p>
                    <p className="mt-0.5 truncate font-display text-sm font-bold uppercase">{p.name}</p>
                    <p className="truncate text-sm text-muted">{p.kind || '—'}</p>
                  </div>
                  <div className="hidden items-center gap-4 sm:flex">
                    {publish}
                    {actions}
                  </div>
                </div>
                {/* telefon: ovládání pod náhledem, prsty se trefí */}
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] pt-3 sm:hidden">
                  <div className="flex items-center gap-1">{moveButtons}</div>
                  {publish}
                  {actions}
                </div>
              </li>
            );
          })}
        </ul>
      </Card>

      {editing ? <ProjectEditor initial={editing} onClose={() => setEditing(null)} /> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Ceník                                                              */
/* ------------------------------------------------------------------ */

type Plan = { name: string; price: string; tagline: string; features: string[]; extra: string; term: string; cta: string };
type PricingData = {
  eyebrow: string;
  title: string;
  titleAccent: string;
  lead: string;
  from: string;
  includes: string;
  extra: string;
  term: string;
  vat: string;
  plans: Record<string, Plan>;
  custom: { name: string; tagline: string; items: string[] };
  customPrice: string;
  customCta: string;
  faq: { q: string; a: string }[];
} & Record<string, unknown>;

const PLAN_ORDER = [
  ['web', '01', 'Weby'],
  ['seo', '02', 'SEO'],
  ['eshop', '03', 'E-shopy'],
  ['design', '04', 'Logo a design'],
  ['app', '05', 'Aplikace'],
] as const;

const lines = (v: string) => v.split('\n').map((s) => s.trim()).filter(Boolean);
const range = (n: number, fn: (i: number) => string) => Array.from({ length: n }, (_, i) => fn(i));

/** Malý výřez webu u pole; kliknutím zvětšit. */
function useHints() {
  const [lightbox, setLightbox] = useState<Lightbox>(null);
  const mini = (paths: string | string[], label: string) => {
    const hint = hintFor(paths);
    return hint ? <HintMini hint={hint} label={label} onOpen={() => setLightbox({ hint, label })} /> : undefined;
  };
  const box = lightbox ? <HintLightbox hint={lightbox.hint} label={lightbox.label} onClose={() => setLightbox(null)} /> : null;
  return { mini, box };
}

function PricingTab({ initial }: { initial: Record<string, unknown> }) {
  const [d, setD] = useState<PricingData>(() => JSON.parse(JSON.stringify(initial)) as PricingData);
  const [dirty, setDirty] = useState(false);
  const save = useSave();
  const { mini, box } = useHints();
  const update = (fn: (prev: PricingData) => PricingData) => {
    setD(fn);
    setDirty(true);
  };
  const setTop = (k: keyof PricingData, v: unknown) => update((prev) => ({ ...prev, [k]: v }));
  const setPlan = (id: string, k: keyof Plan, v: unknown) => update((prev) => ({ ...prev, plans: { ...prev.plans, [id]: { ...prev.plans[id], [k]: v } } }));
  const submit = async () => {
    if (await save.run(() => savePricing(d))) setDirty(false);
  };

  return (
    <div className="space-y-6 pb-28">
      <Card title="Záhlaví sekce" subtitle="Česká verze webu. Ostatní jazyky zůstávají zatím beze změny.">
        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Nadpis — bílá část" visual={mini('pricing.title', 'Nadpis — bílá část')}><input className={inputClass} value={d.title} onChange={(e) => setTop('title', e.target.value)} /></Field>
          <Field label="Nadpis — modrá část" visual={mini('pricing.titleAccent', 'Nadpis — modrá část')}><input className={inputClass} value={d.titleAccent} onChange={(e) => setTop('titleAccent', e.target.value)} /></Field>
          <Field label="Úvodní text" className="md:col-span-2" visual={mini('pricing.lead', 'Úvodní text')}><textarea className={`${inputClass} min-h-[72px]`} value={d.lead} onChange={(e) => setTop('lead', e.target.value)} /></Field>
          <Field label="Poznámka pod ceníkem" visual={mini('pricing.vat', 'Poznámka pod ceníkem')}><input className={inputClass} value={d.vat} onChange={(e) => setTop('vat', e.target.value)} /></Field>
          <Field label="Popisky na kartách" hint="„od“ · „V ceně“ · „Zvlášť“ · „Termín“" visual={mini(['pricing.from', 'pricing.includes'], 'Popisky na kartách')}>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <input className={inputClass} aria-label="od" value={d.from} onChange={(e) => setTop('from', e.target.value)} />
              <input className={inputClass} aria-label="V ceně" value={d.includes} onChange={(e) => setTop('includes', e.target.value)} />
              <input className={inputClass} aria-label="Zvlášť" value={d.extra} onChange={(e) => setTop('extra', e.target.value)} />
              <input className={inputClass} aria-label="Termín" value={d.term} onChange={(e) => setTop('term', e.target.value)} />
            </div>
          </Field>
        </div>
      </Card>

      {PLAN_ORDER.map(([id, num, label]) => {
        const plan = d.plans[id];
        if (!plan) return null;
        const at = (k: string) => `pricing.plans.${id}.${k}`;
        return (
          <Card key={id} title={<><span className="mr-2 font-mono text-[11px] text-[rgba(160,185,235,0.7)]">№ {num}</span>{label}</>}>
            <div className="grid gap-5 md:grid-cols-3">
              <Field label="Název" visual={mini(at('name'), `${label} — název`)}><input className={inputClass} value={plan.name} onChange={(e) => setPlan(id, 'name', e.target.value)} /></Field>
              <Field label="Cena" hint="Např. „5 000 Kč“" visual={mini(at('price'), `${label} — cena`)}><input className={inputClass} value={plan.price} onChange={(e) => setPlan(id, 'price', e.target.value)} /></Field>
              <Field label="Termín" visual={mini(at('term'), `${label} — termín`)}><input className={inputClass} value={plan.term} onChange={(e) => setPlan(id, 'term', e.target.value)} /></Field>
              <Field label="Pro koho / krátký popis" className="md:col-span-3" visual={mini(at('tagline'), `${label} — krátký popis`)}><input className={inputClass} value={plan.tagline} onChange={(e) => setPlan(id, 'tagline', e.target.value)} /></Field>
              <Field label="V ceně" hint="Každá položka na vlastní řádek" className="md:col-span-2" visual={mini(range(12, (i) => at(`features.${i}`)), `${label} — v ceně`)}>
                <textarea className={`${inputClass} min-h-[180px] leading-relaxed`} defaultValue={plan.features.join('\n')} onChange={(e) => setPlan(id, 'features', lines(e.target.value))} />
              </Field>
              <div className="space-y-5">
                <Field label="Zvlášť (platí se navíc)" visual={mini(at('extra'), `${label} — zvlášť`)}><textarea className={`${inputClass} min-h-[108px]`} value={plan.extra} onChange={(e) => setPlan(id, 'extra', e.target.value)} /></Field>
                <Field label="Text tlačítka" visual={mini(at('cta'), `${label} — tlačítko`)}><input className={inputClass} value={plan.cta} onChange={(e) => setPlan(id, 'cta', e.target.value)} /></Field>
              </div>
            </div>
          </Card>
        );
      })}

      <Card title="Pruh „Větší projekt?“">
        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Nadpis" visual={mini('pricing.custom.name', 'Větší projekt — nadpis')}><input className={inputClass} value={d.custom.name} onChange={(e) => setTop('custom', { ...d.custom, name: e.target.value })} /></Field>
          <Field label="Cena (text)" visual={mini('pricing.customPrice', 'Větší projekt — cena')}><input className={inputClass} value={d.customPrice} onChange={(e) => setTop('customPrice', e.target.value)} /></Field>
          <Field label="Popis" className="md:col-span-2" visual={mini('pricing.custom.tagline', 'Větší projekt — popis')}><input className={inputClass} value={d.custom.tagline} onChange={(e) => setTop('custom', { ...d.custom, tagline: e.target.value })} /></Field>
          <Field label="Štítky" hint="Každý na vlastní řádek" visual={mini(range(8, (i) => `pricing.custom.items.${i}`), 'Větší projekt — štítky')}>
            <textarea className={`${inputClass} min-h-[110px]`} defaultValue={d.custom.items.join('\n')} onChange={(e) => setTop('custom', { ...d.custom, items: lines(e.target.value) })} />
          </Field>
          <Field label="Text tlačítka" visual={mini('pricing.customCta', 'Větší projekt — tlačítko')}><input className={inputClass} value={d.customCta} onChange={(e) => setTop('customCta', e.target.value)} /></Field>
        </div>
      </Card>

      <Card title="Otázky pod ceníkem">
        <div className="space-y-5">
          {d.faq.map((item, i) => (
            <div key={i} className="grid gap-4 md:grid-cols-[1fr_1.6fr]">
              <Field label={`Otázka ${i + 1}`} visual={mini(`pricing.faq.${i}.q`, `Otázka ${i + 1}`)}>
                <input className={inputClass} value={item.q} onChange={(e) => setTop('faq', d.faq.map((f, k) => (k === i ? { ...f, q: e.target.value } : f)))} />
              </Field>
              <Field label="Odpověď" visual={mini(`pricing.faq.${i}.a`, `Odpověď ${i + 1}`)}>
                <input className={inputClass} value={item.a} onChange={(e) => setTop('faq', d.faq.map((f, k) => (k === i ? { ...f, a: e.target.value } : f)))} />
              </Field>
            </div>
          ))}
        </div>
      </Card>

      {box}

      <SaveBar dirtyText={dirty ? 'Neuložené změny' : ''} state={save.state} error={save.error}>
        <Btn variant="primary" onClick={submit} disabled={save.busy || (!dirty && save.state !== 'error')}>Uložit ceník</Btn>
      </SaveBar>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Kontakt a účet                                                     */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/*  Sítě a messengery (dynamický seznam)                               */
/* ------------------------------------------------------------------ */

const QUICK_SOCIALS = ['WhatsApp', 'Instagram', 'Facebook', 'TikTok', 'LinkedIn', 'YouTube', 'Telegram', 'Behance'];

function SocialEditor({ items, onChange, visual }: { items: SocialInput[]; onChange: (items: SocialInput[]) => void; visual?: React.ReactNode }) {
  const update = (i: number, patch: Partial<SocialInput>) => onChange(items.map((x, k) => (k === i ? { ...x, ...patch } : x)));
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  const add = (label = '') => onChange([...items, { label, value: '' }]);
  const used = new Set(items.map((x) => detectPlatform(x.label, x.value)?.id));

  return (
    <Card
      title="Sociální sítě a messengery"
      subtitle="Na webu se ukážou v kontaktech a v patičce v tomto pořadí. Messengery (WhatsApp, Telegram, Viber) jako kontakt s číslem, ostatní jako odkazy s ikonou."
      actions={visual}
    >
      {items.length === 0 ? (
        <p className="mb-4 rounded-xl border border-dashed border-[var(--line)] px-4 py-5 text-center text-sm text-muted">Zatím žádná síť — web je nezobrazuje. Přidejte první níže.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((item, i) => {
            const platform = detectPlatform(item.label, item.value);
            const check = item.label.trim() || item.value.trim() ? resolveSocial(item) : null;
            const placeholder = platform?.id === 'whatsapp' || platform?.id === 'viber' ? '+420 777 123 456' : platform?.id === 'telegram' ? '@uzivatel nebo +420…' : 'https://…';
            return (
              <li key={i} className="rounded-2xl border border-[rgba(110,150,255,0.18)] bg-white/[0.02] p-3 transition-colors focus-within:border-[rgba(97,150,255,0.55)]">
                <div className="grid grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-2.5 sm:grid-cols-[40px_minmax(0,0.8fr)_minmax(0,1.4fr)_auto] sm:gap-3">
                  <span
                    className={`grid h-10 w-10 place-items-center rounded-xl border transition-colors ${
                      platform ? 'border-[rgba(97,150,255,0.6)] bg-[rgba(31,91,255,0.14)] text-[#cfe0ff] shadow-[0_0_14px_rgba(31,91,255,0.35)]' : 'border-[var(--line)] text-muted'
                    }`}
                    title={platform?.name ?? 'Neznámá platforma'}
                  >
                    <SocialIcon brand={platform?.id ?? null} className="h-[18px] w-[18px]" />
                  </span>
                  <input
                    className={inputClass}
                    list="social-names"
                    aria-label="Název sítě"
                    placeholder="Název (např. WhatsApp)"
                    value={item.label}
                    onChange={(e) => update(i, { label: e.target.value })}
                  />
                  <input
                    className={`${inputClass} col-span-3 row-start-2 sm:col-span-1 sm:row-start-auto`}
                    aria-label="Odkaz nebo číslo"
                    placeholder={placeholder}
                    value={item.value}
                    inputMode={platform?.kind === 'messenger' ? 'tel' : 'url'}
                    onChange={(e) => update(i, { value: e.target.value })}
                  />
                  <div className="col-start-3 row-start-1 flex items-center gap-0.5 sm:col-start-auto sm:row-start-auto">
                    <button type="button" aria-label="Posunout výš" disabled={i === 0} onClick={() => move(i, -1)} className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-white/5 hover:text-ink disabled:opacity-25">↑</button>
                    <button type="button" aria-label="Posunout níž" disabled={i === items.length - 1} onClick={() => move(i, 1)} className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-white/5 hover:text-ink disabled:opacity-25">↓</button>
                    <button
                      type="button"
                      aria-label="Odebrat"
                      onClick={() => onChange(items.filter((_, k) => k !== i))}
                      className="grid h-8 w-8 place-items-center rounded-lg text-[#ffb3be] hover:bg-[rgba(255,90,110,0.12)]"
                    >
                      ×
                    </button>
                  </div>
                </div>
                {check ? (
                  <p className={`mt-2 truncate pl-1 text-xs ${check.ok ? 'text-muted' : 'text-[#ffb3be]'}`}>
                    {check.ok ? (
                      <>
                        {check.link.kind === 'messenger' ? 'Kontakt' : 'Odkaz'}:{' '}
                        <a href={check.link.href} target="_blank" rel="noreferrer" className="text-[#9fc0ff] hover:text-ink">
                          {check.link.href.replace(/^https?:\/\//, '')}
                        </a>
                      </>
                    ) : (
                      check.error
                    )}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
      <datalist id="social-names">
        {PLATFORMS.map((p) => (
          <option key={p.id} value={p.name} />
        ))}
      </datalist>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Btn size="sm" variant="primary" onClick={() => add()}>
          + Přidat sociální síť
        </Btn>
        {QUICK_SOCIALS.filter((name) => !used.has(detectPlatform(name)?.id)).map((name) => {
          const platform = detectPlatform(name);
          return (
            <button
              key={name}
              type="button"
              onClick={() => add(name)}
              className="inline-flex h-9 items-center gap-2 rounded-full border border-[var(--line)] px-3 text-xs text-muted transition-colors hover:border-[rgba(97,150,255,0.55)] hover:text-ink"
            >
              <SocialIcon brand={platform?.id ?? null} className="h-3.5 w-3.5" />
              {name}
            </button>
          );
        })}
      </div>
    </Card>
  );
}

/** Doručování poptávek e-mailem — kontrolní seznam nastavení Resend + zkušební e-mail. */
function MailCard() {
  const [status, setStatus] = useState<MailStatus | null>(null);
  const [loadError, setLoadError] = useState('');
  const test = useSave();
  const load = useCallback(async () => {
    const res = await getMailStatus();
    if (res.ok) setStatus(res.status);
    else setLoadError(res.error);
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const domain = status?.domains?.find((d) => d.name === status.fromDomain);
  const domainOk = domain ? domain.status === 'verified' : null;
  const rows: { ok: boolean | null; label: string; help: string }[] = status
    ? [
        { ok: status.hasKey, label: 'Klíč Resend (RESEND_API_KEY)', help: status.hasKey ? 'Nastavený ve Vercelu.' : 'Chybí — Resend → API Keys → Create, vložit do Vercelu a Redeploy.' },
        {
          ok: !status.usingTestSender,
          label: 'Odesílatel (CONTACT_FROM_EMAIL)',
          help: status.usingTestSender
            ? 'CONTACT_FROM_EMAIL míří na testovací onboarding@resend.dev — doručí jen na e-mail majitele účtu Resend. Nastavte adresu na ověřené doméně, např. ELEVATE <noreply@elevateit.cz>.'
            : status.fromSource === 'env'
              ? `${status.from} (z CONTACT_FROM_EMAIL)`
              : `${status.from} (výchozí — CONTACT_FROM_EMAIL v tomto nasazení není; po přidání ve Vercelu udělejte Redeploy)`,
        },
        {
          ok: status.usingTestSender ? false : domainOk,
          label: `Ověřená doména${status.fromDomain && !status.usingTestSender ? ` ${status.fromDomain}` : ''}`,
          help: status.usingTestSender
            ? 'Resend → Domains → Add domain, DNS záznamy vložit u správce DNS (Endora) a kliknout Verify.'
            : domain
              ? domain.status === 'verified'
                ? 'Ověřená.'
                : `Stav v Resend: ${domain.status} — zkontrolujte DNS záznamy a klikněte Verify.`
              : status.domains
                ? 'Doména v účtu Resend není — přidejte ji v Domains.'
                : 'Stav nejde načíst (klíč má jen oprávnění k odesílání) — ověří to zkušební e-mail.',
        },
        { ok: Boolean(status.to), label: 'Adresát', help: status.to || 'Vyplňte kontaktní e-mail výše a uložte.' },
      ]
    : [];

  return (
    <Card title="Doručování e-mailů" subtitle="Každá poptávka se uloží sem do administrace a zároveň přijde e-mailem.">
      {loadError ? <p className="text-sm text-red-300">{loadError}</p> : null}
      {!status && !loadError ? <p className="text-sm text-muted">Načítám…</p> : null}
      <ul className="space-y-2.5">
        {rows.map((row) => (
          <li key={row.label} className="flex gap-3 text-sm">
            <span
              aria-hidden
              className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
                row.ok === null ? 'bg-[rgba(160,185,235,0.5)]' : row.ok ? 'bg-[#3ddc97] shadow-[0_0_8px_rgba(61,220,151,0.8)]' : 'bg-[#ffc53d] shadow-[0_0_8px_rgba(255,197,61,0.7)]'
              }`}
            />
            <span className="min-w-0">
              <span className="text-ink">{row.label}</span>
              <span className="block break-words text-xs text-muted">{row.help}</span>
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Btn size="sm" disabled={test.busy || !status} onClick={() => test.run(sendTestMail)}>
          Odeslat zkušební e-mail
        </Btn>
        <SaveStatus state={test.state} error={test.error} savedText={`Odesláno na ${status?.to ?? ''} — zkontrolujte schránku (i spam)`} />
      </div>
    </Card>
  );
}

function CompanyTab({ initial }: { initial: SettingsInput }) {
  const [v, setV] = useState<SettingsInput>(initial);
  const [dirty, setDirty] = useState(false);
  const save = useSave();
  const { mini, box } = useHints();
  const set = (patch: Partial<SettingsInput>) => {
    setV((prev) => ({ ...prev, ...patch }));
    setDirty(true);
  };

  return (
    <div className="max-w-3xl space-y-6 pb-28">
      <Card title="Kontaktní e-mail" subtitle="Chodí na něj poptávky z formuláře.">
        <Field label="E-mail" hint="Bez vlastní ověřené domény v Resend doručuje formulář jen na e-mail, se kterým je účet Resend založený." visual={mini('settings.contactEmail', 'Kontaktní e-mail')}>
          <input className={inputClass} type="email" value={v.contactEmail} onChange={(e) => set({ contactEmail: e.target.value })} />
        </Field>
      </Card>
      <MailCard />
      <Card title="Firma">
        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Město" visual={mini('settings.city', 'Město')}><input className={inputClass} value={v.city} onChange={(e) => set({ city: e.target.value })} /></Field>
          <Field label="IČO" hint="8 číslic, nepovinné" visual={mini('settings.company', 'IČO')}><input className={inputClass} inputMode="numeric" value={v.ico} onChange={(e) => set({ ico: e.target.value })} /></Field>
          <Field label="Právní název" className="md:col-span-2" visual={mini('settings.company', 'Právní název')}><input className={inputClass} value={v.legalName} onChange={(e) => set({ legalName: e.target.value })} /></Field>
        </div>
      </Card>
      <SocialEditor items={v.social} onChange={(social) => set({ social })} visual={mini('settings.social', 'Sítě a messengery na webu')} />

      {box}

      <SaveBar dirtyText={dirty ? 'Neuložené změny' : ''} state={save.state} error={save.error}>
        <Btn variant="primary" disabled={save.busy || !dirty} onClick={async () => (await save.run(() => saveSettings(v))) && setDirty(false)}>
          Uložit
        </Btn>
      </SaveBar>
    </div>
  );
}

/** Kotva sekce na webu — odkaz „Zobrazit na webu" u sekce. */
const SECTION_ANCHOR: Record<string, string> = {
  hero: '',
  why: '#proc-animace',
  process: '#proces',
  cases: '#reference',
  services: '#detaily',
  contact: '#kontakt',
  mascot: '#kontakt',
  footer: '',
  seo: '',
};

type Lightbox = { hint: Hint; label: string } | null;

function autoRows(value: string, min = 2) {
  return Math.min(10, Math.max(min, Math.ceil(value.length / 70) + value.split('\n').length - 1));
}

function TextField({
  field,
  value,
  original,
  onChange,
  onShow,
}: {
  field: EditField;
  value: string;
  original: string;
  onChange: (v: string) => void;
  onShow: (lb: Lightbox) => void;
}) {
  const hint = hintFor(field.path);
  const long = field.long || original.length > 70;
  const changed = value !== original;
  const id = `t-${field.path}`;
  return (
    <div className={`grid gap-3 py-5 first:pt-1 last:pb-1 ${hint ? 'sm:grid-cols-[minmax(0,208px)_minmax(0,1fr)] sm:gap-5' : ''}`}>
      {hint ? (
        <div className="max-w-[420px] sm:max-w-none">
          <HintThumb hint={hint} label={field.label} onOpen={() => onShow({ hint, label: field.label })} />
        </div>
      ) : null}
      <div className="min-w-0">
        <div className="flex items-center justify-between gap-3">
          <label htmlFor={id} className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[rgba(170,185,220,0.9)]">
            {field.label}
          </label>
          {changed ? <span className="shrink-0 rounded-full bg-[rgba(255,197,61,0.14)] px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-[#ffe2a0]">Upraveno</span> : null}
        </div>
        <div className="mt-2">
          {long ? (
            <textarea id={id} rows={autoRows(value)} className={`${inputClass} resize-y leading-relaxed`} value={value} onChange={(e) => onChange(e.target.value)} />
          ) : (
            <input id={id} className={inputClass} value={value} placeholder={original === '' ? '(prázdné)' : undefined} onChange={(e) => onChange(e.target.value)} />
          )}
        </div>
        {field.note ? <p className="mt-1.5 text-xs leading-snug text-muted">{field.note}</p> : null}
        {changed ? (
          <div className="mt-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-xs text-muted">
            <span className="min-w-0 break-words">
              Původní: <span className="text-[rgba(200,210,235,0.85)]">{original || '(prázdné)'}</span>
            </span>
            <button type="button" className="shrink-0 text-[#9fc0ff] transition-colors hover:text-ink" onClick={() => onChange(original)}>
              Vrátit původní
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function TextsTab({ defaults, overrides }: { defaults: Record<string, string>; overrides: Record<string, string> }) {
  const [values, setValues] = useState<Record<string, string>>(() => ({ ...defaults, ...overrides }));
  const [saved, setSaved] = useState<Record<string, string>>(() => ({ ...defaults, ...overrides }));
  const [sectionId, setSectionId] = useState(EDIT_SECTIONS[0].id);
  const [query, setQuery] = useState('');
  const [lightbox, setLightbox] = useState<Lightbox>(null);
  const save = useSave();
  const topRef = useRef<HTMLDivElement>(null);

  // porovnávat bez ořezu — části nadpisů mají záměrné mezery na krajích
  const changedFromDefault = (path: string) => values[path] !== defaults[path];
  const dirtyCount = Object.keys(values).filter((p) => values[p] !== saved[p]).length;
  const q = query.trim().toLowerCase();

  const sections = q
    ? EDIT_SECTIONS.map((s) => ({
        ...s,
        groups: s.groups
          .map((g) => ({ ...g, fields: g.fields.filter((f) => f.label.toLowerCase().includes(q) || values[f.path].toLowerCase().includes(q) || defaults[f.path].toLowerCase().includes(q)) }))
          .filter((g) => g.fields.length),
      })).filter((s) => s.groups.length)
    : EDIT_SECTIONS.filter((s) => s.id === sectionId);

  const countChanged = (s: EditSection) => s.groups.reduce((n, g) => n + g.fields.filter((f) => changedFromDefault(f.path)).length, 0);
  const countFields = (s: EditSection) => s.groups.reduce((n, g) => n + g.fields.length, 0);

  const pick = (id: string) => {
    setQuery('');
    setSectionId(id);
    // na začátek obsahu (pod lištou administrace)
    const top = topRef.current?.getBoundingClientRect().top ?? 0;
    if (top < 0) window.scrollTo({ top: window.scrollY + top - 140, behavior: 'smooth' });
  };

  const jump = (groupId: string) => {
    const el = document.getElementById(`skupina-${groupId}`);
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 150, behavior: 'smooth' });
  };

  const set = (path: string, v: string) => setValues((prev) => ({ ...prev, [path]: v }));

  const submit = async () => {
    const changes = Object.fromEntries(Object.entries(values).filter(([p, v]) => v !== defaults[p] && v.trim()));
    if (await save.run(() => saveTexts(changes))) setSaved({ ...values });
  };

  return (
    <div ref={topRef} className="pb-28 lg:grid lg:grid-cols-[236px_minmax(0,1fr)] lg:gap-8">
      {/* desktop: sekce webu v pořadí shora dolů */}
      <aside className="hidden min-w-0 lg:sticky lg:top-[124px] lg:block lg:self-start">
        <SearchInput value={query} onChange={setQuery} />
        <nav className="mt-4 flex flex-col gap-0.5" aria-label="Sekce webu">
          {EDIT_SECTIONS.map((s, i) => {
            const changed = countChanged(s);
            const active = !q && sectionId === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => pick(s.id)}
                aria-current={active ? 'true' : undefined}
                className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${
                  active ? 'bg-[rgba(31,91,255,0.16)] text-ink shadow-[inset_0_0_0_1px_rgba(61,123,255,0.45)]' : 'text-muted hover:bg-white/[0.04] hover:text-ink'
                }`}
              >
                <span className={`w-5 shrink-0 font-mono text-[10px] ${active ? 'text-[var(--blue-bright)]' : 'text-[rgba(140,160,200,0.6)]'}`}>{String(i + 1).padStart(2, '0')}</span>
                <span className="min-w-0 flex-1 truncate">{s.title}</span>
                {changed ? <span className="rounded-full bg-[rgba(255,197,61,0.16)] px-1.5 text-[10px] text-[#ffe2a0]">{changed}</span> : null}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* mobil a tablet: výběr sekce + hledání, přilepené pod lištou */}
      <div className="sticky top-[97px] z-20 -mx-4 mb-5 border-b border-[var(--line)] bg-[rgba(4,6,11,0.94)] px-4 py-3 backdrop-blur sm:-mx-5 sm:px-5 lg:hidden">
        <div className="flex gap-2">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Sekce webu</span>
            <select
              value={q ? '' : sectionId}
              onChange={(e) => pick(e.target.value)}
              className={`${inputClass} appearance-none pr-9`}
            >
              {q ? <option value="">Výsledky hledání</option> : null}
              {EDIT_SECTIONS.map((s, i) => {
                const changed = countChanged(s);
                return (
                  <option key={s.id} value={s.id}>
                    {String(i + 1).padStart(2, '0')} · {s.title}
                    {changed ? ` (${changed} upraveno)` : ''}
                  </option>
                );
              })}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
          </label>
          <div className="w-[44%] max-w-[220px] shrink-0">
            <SearchInput value={query} onChange={setQuery} compact />
          </div>
        </div>
      </div>

      <div className="min-w-0 space-y-6">
        {sections.length === 0 ? <p className="text-sm text-muted">Nic nenalezeno.</p> : null}
        {sections.map((s) => {
          const changed = countChanged(s);
          const anchor = SECTION_ANCHOR[s.id];
          return (
            <section key={s.id} className="space-y-5">
              <header className="flex flex-wrap items-end justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-display text-lg font-bold uppercase leading-tight tracking-[0.04em] sm:text-xl">{s.title}</h2>
                  <p className="mt-1 text-xs text-muted">
                    {countFields(s)} textů{changed ? <> · <span className="text-[#ffe2a0]">{changed} upraveno</span></> : null}
                  </p>
                </div>
                {anchor !== undefined && s.id !== 'seo' ? (
                  <a href={`/cs${anchor}`} target="_blank" rel="noreferrer" className="text-xs text-[#9fc0ff] transition-colors hover:text-ink">
                    Otevřít na webu ↗
                  </a>
                ) : null}
              </header>

              {s.preview === 'serp' ? (
                <SerpPreview title={values['meta.home.title']} description={values['meta.home.description']} ogTitle={values['meta.ogTitle']} url={SITE_URL} />
              ) : null}

              {/* rychlé skoky mezi skupinami dlouhé sekce */}
              {!q && s.groups.length > 1 ? (
                <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
                  {s.groups.map((g) => {
                    const n = g.fields.filter((f) => changedFromDefault(f.path)).length;
                    return (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => jump(g.id)}
                        className="shrink-0 whitespace-nowrap rounded-full border border-[var(--line)] px-3.5 py-1.5 text-xs text-muted transition-colors hover:border-[rgba(80,120,255,0.55)] hover:text-ink"
                      >
                        {g.title}
                        {n ? <span className="ml-1.5 text-[#ffe2a0]">{n}</span> : null}
                      </button>
                    );
                  })}
                </div>
              ) : null}

              {s.groups.map((g) => (
                <div key={g.id} id={`skupina-${g.id}`} className="scroll-mt-40">
                  <Card title={q ? `${s.title} · ${g.title}` : g.title}>
                    <div className="divide-y divide-[rgba(110,150,255,0.12)]">
                      {g.fields.map((f) => (
                        <TextField key={f.path} field={f} value={values[f.path]} original={defaults[f.path]} onChange={(v) => set(f.path, v)} onShow={setLightbox} />
                      ))}
                    </div>
                  </Card>
                </div>
              ))}
            </section>
          );
        })}
      </div>

      {lightbox ? <HintLightbox hint={lightbox.hint} label={lightbox.label} onClose={() => setLightbox(null)} /> : null}

      <SaveBar dirtyText={dirtyCount ? `Neuložené změny: ${dirtyCount}` : ''} state={save.state} error={save.error}>
        <Btn variant="primary" onClick={submit} disabled={save.busy || (!dirtyCount && save.state !== 'error')}>
          Uložit texty
        </Btn>
      </SaveBar>
    </div>
  );
}

function AccountTab({ email }: { email: string }) {
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const save = useSave();
  const mismatch = pw2.length > 0 && pw !== pw2;
  return (
    <Card title="Heslo k administraci" subtitle={`Přihlášen: ${email}. Po nastavení se přihlásíte e-mailem a heslem.`} className="max-w-2xl">
      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Nové heslo" hint="Aspoň 10 znaků">
          <input className={inputClass} type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} />
        </Field>
        <Field label="Heslo znovu">
          <input className={inputClass} type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} />
        </Field>
      </div>
      {mismatch ? <p className="mt-3 text-sm text-[#ffb3be]">Hesla se neshodují.</p> : null}
      <div className="mt-6 flex items-center gap-4">
        <Btn
          variant="primary"
          disabled={save.busy || pw.length < 10 || pw !== pw2}
          onClick={async () => {
            if (await save.run(() => setPassword(pw))) {
              setPw('');
              setPw2('');
            }
          }}
        >
          Nastavit heslo
        </Btn>
        <SaveStatus state={save.state} error={save.error} savedText="Heslo nastaveno" />
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Poptávky z formuláře                                               */
/* ------------------------------------------------------------------ */

const STATUS: Record<InquiryStatus, { label: string; dot: string; chip: string }> = {
  new: { label: 'Nová', dot: 'bg-[var(--blue-bright)] shadow-[0_0_8px_2px_rgba(61,123,255,0.85)]', chip: 'border-[rgba(97,150,255,0.7)] bg-[rgba(31,91,255,0.18)] text-[#dbe8ff]' },
  progress: { label: 'V řešení', dot: 'bg-[#ffc53d] shadow-[0_0_8px_rgba(255,197,61,0.7)]', chip: 'border-[rgba(255,197,61,0.6)] bg-[rgba(255,197,61,0.1)] text-[#ffe2a0]' },
  done: { label: 'Vyřízeno', dot: 'bg-[#3ddc97]', chip: 'border-[rgba(61,220,151,0.5)] bg-[rgba(61,220,151,0.08)] text-[#9ff0c9]' },
};
const STATUS_ORDER: InquiryStatus[] = ['new', 'progress', 'done'];

const dateFmt = new Intl.DateTimeFormat('cs-CZ', { day: 'numeric', month: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
function when(iso: string) {
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 60000;
  if (diff < 1) return 'právě teď';
  if (diff < 60) return `před ${Math.round(diff)} min`;
  if (diff < 60 * 24) return `před ${Math.round(diff / 60)} h`;
  return dateFmt.format(d);
}

/** Odkazy v odpovědích (reference) jako klikací. */
function Linkified({ text }: { text: string }) {
  const parts = text.split(/(https?:\/\/[^\s]+)/g);
  return (
    <>
      {parts.map((part, i) =>
        /^https?:\/\//.test(part) ? (
          <a key={i} href={part} target="_blank" rel="noreferrer noopener" className="break-all text-[#9fc0ff] underline-offset-4 hover:underline">
            {part}
          </a>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

function InquiryDetail({
  item,
  onStatus,
  onDelete,
  onNote,
  onBack,
}: {
  item: Inquiry;
  onStatus: (s: InquiryStatus) => void;
  onDelete: () => void;
  onNote: (note: string) => Promise<boolean>;
  onBack: () => void;
}) {
  const [note, setNote] = useState(item.note ?? '');
  const noteSave = useSave();
  useEffect(() => setNote(item.note ?? ''), [item.id, item.note]);
  const tel = item.reach.match(/\+?[\d\s]{6,}/)?.[0]?.replace(/\s/g, '');
  const tg = item.reach.match(/@?[A-Za-z0-9_]{4,}$/)?.[0];

  return (
    <Card>
      <button type="button" onClick={onBack} className="mb-4 text-sm text-[#9fc0ff] lg:hidden">
        ← Zpět na seznam
      </button>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-mono text-[10px] tracking-[0.2em] text-[rgba(160,185,235,0.7)]">{dateFmt.format(new Date(item.created_at))} · {item.locale.toUpperCase()}</p>
          <h3 className="mt-1 break-words font-display text-lg font-bold uppercase leading-tight">{item.name}</h3>
          <p className="mt-1 text-sm text-muted">{item.headline}{item.budget ? ` · ${item.budget}` : ''}</p>
          {item.mail ? (
            <p className={`mt-2 inline-flex max-w-full items-start gap-2 rounded-lg border px-2.5 py-1.5 text-xs ${item.mail.delivered ? 'border-[rgba(61,220,151,0.35)] text-[#9ff0c9]' : 'border-[rgba(255,197,61,0.45)] bg-[rgba(255,197,61,0.06)] text-[#ffe2a0]'}`}>
              <span aria-hidden className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${item.mail.delivered ? 'bg-[#3ddc97]' : 'bg-[#ffc53d]'}`} />
              <span className="min-w-0 break-words">
                {item.mail.delivered ? `E-mail odeslán na ${item.mail.to ?? ''}` : `E-mail neodešel: ${item.mail.error ?? 'neznámá chyba'}`}
              </span>
            </p>
          ) : null}
        </div>
        <div className="flex rounded-full border border-[var(--line)] p-1" role="radiogroup" aria-label="Stav poptávky">
          {STATUS_ORDER.map((s) => (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={item.status === s}
              onClick={() => onStatus(s)}
              className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${item.status === s ? STATUS[s].chip : 'border-transparent text-muted hover:text-ink'}`}
            >
              {STATUS[s].label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <a href={`mailto:${item.email}?subject=${encodeURIComponent('Re: poptávka ELEVATE')}`} className="inline-flex h-9 items-center rounded-btn bg-[linear-gradient(120deg,var(--blue),var(--blue-bright))] px-3.5 font-display text-[10px] uppercase tracking-[0.12em] text-white shadow-[0_0_18px_var(--blue-glow)]">
          Odpovědět e-mailem
        </a>
        {item.reach.startsWith('WhatsApp') && tel ? (
          <a href={`https://wa.me/${tel.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-2 rounded-btn border border-[rgba(61,220,151,0.45)] bg-[rgba(61,220,151,0.08)] px-3.5 font-display text-[10px] uppercase tracking-[0.12em] text-[#9ff0c9] hover:border-[rgba(61,220,151,0.8)]">
            <SocialIcon brand="whatsapp" className="h-3.5 w-3.5" />
            Napsat na WhatsApp
          </a>
        ) : null}
        {tel ? (
          <a href={`tel:${tel}`} className="inline-flex h-9 items-center rounded-btn border border-[var(--line)] bg-white/[0.04] px-3.5 font-display text-[10px] uppercase tracking-[0.12em] text-ink hover:border-[rgba(80,120,255,0.55)]">
            Zavolat
          </a>
        ) : null}
        {item.reach.startsWith('Telegram') && tg ? (
          <a href={`https://t.me/${tg.replace(/^@/, '')}`} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center rounded-btn border border-[var(--line)] bg-white/[0.04] px-3.5 font-display text-[10px] uppercase tracking-[0.12em] text-ink hover:border-[rgba(80,120,255,0.55)]">
            Telegram
          </a>
        ) : null}
        <span className="ml-auto" />
        <Btn size="sm" variant="danger" onClick={onDelete}>Smazat</Btn>
      </div>

      <dl className="mt-6 space-y-6">
        {item.sections.map((section) => (
          <div key={section.title}>
            <dt className="font-display text-[10.5px] uppercase tracking-[0.16em] text-[#9fc0ff]">{section.title}</dt>
            <dd className="mt-2 divide-y divide-[rgba(110,150,255,0.1)] rounded-xl border border-[rgba(110,150,255,0.14)] bg-white/[0.015]">
              {section.rows.map(([label, value]) => (
                <div key={label} className="grid gap-1 px-3.5 py-2.5 text-sm sm:grid-cols-[150px_minmax(0,1fr)] sm:gap-4">
                  <span className="text-xs text-muted sm:text-sm">{label}</span>
                  <span className="min-w-0 whitespace-pre-line break-words text-ink">
                    <Linkified text={value} />
                  </span>
                </div>
              ))}
            </dd>
          </div>
        ))}
      </dl>

      {/* ukázky z galerie, které zákazník označil srdíčkem */}
      {item.likes?.length ? (
        <div className="mt-6">
          <p className="font-display text-[10.5px] uppercase tracking-[0.16em] text-[#9fc0ff]">Vybrané ukázky ({item.likes.length})</p>
          <ul className="mt-2 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {item.likes.map((like) => (
              <li key={like.id}>
                <a href={like.url} target="_blank" rel="noreferrer" className="group block overflow-hidden rounded-xl border border-[rgba(255,120,160,0.45)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={like.thumb} alt="" className="aspect-[16/10] w-full object-cover object-top transition-transform duration-300 group-hover:scale-[1.03]" />
                </a>
                {like.label ? <p className="mt-1 truncate text-xs text-muted">{like.label}</p> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-6">
        <Field label="Poznámka (vidíte jen vy)">
          <textarea className={`${inputClass} min-h-[72px]`} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Např. volal jsem 3. 10., pošlu nabídku do pátku" />
        </Field>
        <div className="mt-2 flex items-center justify-end gap-3">
          <SaveStatus state={noteSave.state} error={noteSave.error} />
          <Btn size="sm" disabled={noteSave.busy || note === (item.note ?? '')} onClick={() => noteSave.run(async () => ((await onNote(note)) ? { ok: true } : { ok: false, error: 'Poznámku se nepodařilo uložit.' }))}>
            Uložit poznámku
          </Btn>
        </div>
      </div>
    </Card>
  );
}

function InquiriesTab({ initial, onNewCount, focus }: { initial: Inquiry[]; onNewCount: (n: number) => void; focus?: string | null }) {
  const [items, setItems] = useState(initial);
  const [selected, setSelected] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);
  const [filter, setFilter] = useState<'all' | InquiryStatus>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [, tick] = useState(0);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    const res = await listInquiries();
    setRefreshing(false);
    if (res.ok) {
      setItems(res.items);
      setError('');
    } else setError(res.error);
  }, []);

  // nové poptávky bez obnovení stránky: každou minutu a při návratu do okna
  useEffect(() => {
    const id = window.setInterval(() => {
      void refresh();
      tick((n) => n + 1);
    }, 60000);
    const onFocus = () => void refresh();
    window.addEventListener('focus', onFocus);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('focus', onFocus);
    };
  }, [refresh]);

  const newCount = items.filter((i) => i.status === 'new').length;
  useEffect(() => onNewCount(newCount), [newCount, onNewCount]);

  // poptávka z odkazu v e-mailu: otevřít ji (když v načteném seznamu ještě není, načíst znovu)
  const itemsRef = useRef(items);
  itemsRef.current = items;
  useEffect(() => {
    if (!focus) return;
    let cancelled = false;
    void (async () => {
      let found = itemsRef.current.some((i) => i.id === focus);
      if (!found) {
        const res = await listInquiries();
        if (cancelled) return;
        if (res.ok) {
          setItems(res.items);
          found = res.items.some((i) => i.id === focus);
        }
      }
      if (!found) {
        setMissing(true);
        return;
      }
      setFilter('all');
      setSelected(focus);
      window.requestAnimationFrame(() => document.querySelector(`[data-inquiry="${focus}"]`)?.scrollIntoView({ block: 'nearest' }));
    })();
    return () => {
      cancelled = true;
    };
  }, [focus]);

  const update = async (id: string, patch: Partial<Inquiry>, run: () => Promise<{ ok: boolean; error?: string }>) => {
    const prev = items;
    setItems((list) => list.map((x) => (x.id === id ? { ...x, ...patch } : x)));
    const res = await run();
    if (!res.ok) {
      setItems(prev);
      setError(res.error ?? 'Změnu se nepodařilo uložit.');
      return false;
    }
    return true;
  };

  const visible = filter === 'all' ? items : items.filter((i) => i.status === filter);
  const current = items.find((i) => i.id === selected) ?? null;

  return (
    <div className="pb-10">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {(['all', ...STATUS_ORDER] as const).map((f) => {
            const n = f === 'all' ? items.length : items.filter((i) => i.status === f).length;
            return (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`rounded-full border px-3.5 py-1.5 text-xs transition-colors ${filter === f ? 'border-[rgba(97,150,255,0.7)] bg-[rgba(31,91,255,0.16)] text-ink' : 'border-[var(--line)] text-muted hover:text-ink'}`}
              >
                {f === 'all' ? 'Všechny' : STATUS[f].label} <span className="ml-1 text-muted">{n}</span>
              </button>
            );
          })}
        </div>
        <Btn size="sm" onClick={() => void refresh()} disabled={refreshing}>
          {refreshing ? 'Načítám…' : 'Obnovit'}
        </Btn>
      </div>
      {error ? <p className="mb-4 text-sm text-[#ffb3be]">{error}</p> : null}
      {missing ? <p className="mb-4 rounded-xl border border-[var(--line)] bg-white/[0.03] px-4 py-3 text-sm text-muted">Poptávka z odkazu v e-mailu už v administraci není — nejspíš byla smazaná.</p> : null}

      {items.length === 0 ? (
        <Card>
          <p className="text-sm text-muted">Zatím žádná poptávka. Jakmile někdo odešle formulář na webu, objeví se tady (a přijde i e-mailem, pokud je nastavený Resend).</p>
        </Card>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)] lg:items-start">
          <ul className={`space-y-2 ${current ? 'max-lg:hidden' : ''} lg:sticky lg:top-[124px] lg:max-h-[calc(100dvh-150px)] lg:overflow-y-auto lg:pr-1`}>
            {visible.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => setSelected(item.id)}
                  data-inquiry={item.id}
                  className={`w-full rounded-2xl border p-3.5 text-left transition-colors ${
                    selected === item.id ? 'border-[rgba(97,150,255,0.7)] bg-[rgba(31,91,255,0.12)]' : 'border-[var(--line)] bg-white/[0.02] hover:border-[rgba(80,120,255,0.45)]'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${STATUS[item.status].dot}`} aria-hidden />
                    <span className={`min-w-0 flex-1 truncate font-display text-[12px] uppercase tracking-[0.06em] ${item.status === 'new' ? 'text-ink' : 'text-[rgba(220,228,245,0.85)]'}`}>{item.name}</span>
                    <span className="shrink-0 text-[11px] text-muted">{when(item.created_at)}</span>
                  </span>
                  <span className="mt-1.5 block truncate pl-[18px] text-xs text-muted">
                    {item.headline}
                    {item.budget ? ` · ${item.budget}` : ''}
                  </span>
                  <span className="sr-only">Stav: {STATUS[item.status].label}</span>
                </button>
              </li>
            ))}
            {visible.length === 0 ? <li className="px-1 text-sm text-muted">V tomhle filtru nic není.</li> : null}
          </ul>

          <div className={current ? '' : 'max-lg:hidden'}>
            {current ? (
              <InquiryDetail
                item={current}
                onBack={() => setSelected(null)}
                onStatus={(status) => void update(current.id, { status }, () => setInquiryStatus(current.id, status))}
                onNote={(note) => update(current.id, { note }, () => setInquiryStatus(current.id, current.status, note))}
                onDelete={() => {
                  if (!window.confirm(`Smazat poptávku od „${current.name}“? Nelze vrátit.`)) return;
                  const id = current.id;
                  setSelected(null);
                  void (async () => {
                    const prev = items;
                    setItems((list) => list.filter((x) => x.id !== id));
                    const res = await deleteInquiry(id);
                    if (!res.ok) {
                      setItems(prev);
                      setError(res.error);
                    }
                  })();
                }}
              />
            ) : (
              <Card>
                <p className="text-sm text-muted">Vyberte poptávku vlevo.</p>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Režim údržby                                                       */
/* ------------------------------------------------------------------ */

function MaintenanceDialog({ on, onClose, onChanged }: { on: boolean; onClose: () => void; onChanged: (on: boolean) => void }) {
  const [sure, setSure] = useState(false);
  const save = useSave();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const submit = async () => {
    const next = !on;
    if (await save.run(() => setMaintenance(next))) {
      onChanged(next);
      window.setTimeout(onClose, 600);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-[rgba(2,4,9,0.82)] p-4 backdrop-blur-sm" onMouseDown={(e) => e.target === e.currentTarget && onClose()} role="dialog" aria-modal="true">
      <div className="w-full max-w-lg">
        <Card title={on ? 'Vypnout režim údržby?' : 'Zapnout režim údržby?'}>
          {on ? (
            <p className="text-sm leading-relaxed text-muted">Web se návštěvníkům znovu zobrazí během pár sekund.</p>
          ) : (
            <>
              <p className="text-sm leading-relaxed text-muted">
                Všichni návštěvníci místo webu uvidí obrazovku „Technické práce“ (čeština, angličtina, ruština, ukrajinština). Vyhledávače web po dobu údržby
                neindexují. Administrace funguje dál.
              </p>
              <a href="/cs?udrzba=nahled" target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm text-[#9fc0ff] hover:text-ink">
                Náhled obrazovky údržby ↗
              </a>
              <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border border-[rgba(255,197,61,0.35)] bg-[rgba(255,197,61,0.06)] p-3.5 text-sm text-[#ffe2a0]">
                <input type="checkbox" checked={sure} onChange={(e) => setSure(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#ffc53d]" />
                Rozumím — živý web bude pro návštěvníky nedostupný, dokud údržbu nevypnu.
              </label>
            </>
          )}
          <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
            <SaveStatus state={save.state} error={save.error} savedText={on ? 'Údržba vypnuta' : 'Údržba zapnuta'} />
            <Btn onClick={onClose}>Zrušit</Btn>
            <Btn variant={on ? 'primary' : 'danger'} disabled={save.busy || (!on && !sure)} onClick={submit}>
              {on ? 'Vypnout údržbu' : 'Zapnout údržbu'}
            </Btn>
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

const TABS = [
  ['inquiries', 'Poptávky'],
  ['projects', 'Projekty'],
  ['gallery', 'Galerie ukázek'],
  ['texts', 'Texty webu'],
  ['pricing', 'Ceník'],
  ['company', 'Kontakt a firma'],
  ['account', 'Účet'],
] as const;
type Tab = (typeof TABS)[number][0];

export function AdminApp({
  email,
  projects,
  pricing,
  settings,
  textDefaults,
  textOverrides,
  maintenance: initialMaintenance,
  inquiries,
  gallery,
  industries,
}: {
  email: string;
  projects: ProjectRow[];
  pricing: Record<string, unknown>;
  settings: SettingsInput;
  textDefaults: Record<string, string>;
  textOverrides: Record<string, string>;
  maintenance: boolean;
  inquiries: Inquiry[];
  gallery: GalleryItem[];
  industries: Industry[];
}) {
  const [tab, setTab] = useState<Tab>('inquiries');
  const [maintenance, setMaintenanceState] = useState(initialMaintenance);
  const [dialog, setDialog] = useState(false);
  const [newCount, setNewCount] = useState(() => inquiries.filter((i) => i.status === 'new').length);
  // záložka v adrese (#cenik…) — obnovení stránky zůstane na stejném místě
  useEffect(() => {
    const fromHash = TABS.find(([id]) => `#${id}` === window.location.hash)?.[0];
    if (fromHash) setTab(fromHash);
  }, []);
  // odkaz z e-mailu: /admin?inquiry=<klíč> → záložka Poptávky s otevřenou poptávkou
  // (po přihlášení se klíč vrací z úložiště prohlížeče, viz RememberInquiry)
  const [focusInquiry, setFocusInquiry] = useState<string | null>(null);
  useEffect(() => {
    let id = new URLSearchParams(window.location.search).get(INQUIRY_PARAM);
    try {
      const stored = JSON.parse(localStorage.getItem(INQUIRY_STORE) ?? 'null') as { id?: string; at?: number } | null;
      localStorage.removeItem(INQUIRY_STORE);
      if (!id && stored?.id && Date.now() - (stored.at ?? 0) < 2 * 60 * 60 * 1000) id = stored.id;
    } catch {
      /* úložiště není dostupné */
    }
    if (!isInquiryKey(id)) return;
    setTab('inquiries');
    setFocusInquiry(id);
    window.history.replaceState(null, '', '/admin#inquiries');
  }, []);
  const go = (id: Tab) => {
    setTab(id);
    window.history.replaceState(null, '', `#${id}`);
  };
  // na telefonu se záložky posouvají do strany — aktivní vždy do výhledu
  useEffect(() => {
    document.querySelector('header nav [aria-current="page"]')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [tab]);
  // nové poptávky i v názvu karty prohlížeče
  useEffect(() => {
    const title = `${newCount ? `(${newCount}) ` : ''}Administrace — ELEVATE`;
    document.title = title;
    // Next po hydrataci vrací <title> z metadat — nastavit ještě jednou
    const id = window.setTimeout(() => (document.title = title), 300);
    return () => window.clearTimeout(id);
  }, [newCount]);

  return (
    <div className="relative min-h-dvh">
      <div aria-hidden className="pointer-events-none fixed inset-0" style={{ background: 'radial-gradient(55% 40% at 50% -5%, rgba(31,91,255,0.2), transparent 70%)' }} />
      <header className="sticky top-0 z-30 border-b border-[var(--line)] bg-[rgba(4,6,11,0.86)] backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 pt-3.5 sm:px-5 sm:pt-4">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <Logo height={20} priority />
            <span className="hidden rounded-full border border-[var(--line)] px-2.5 py-1 font-display text-[9px] uppercase tracking-[0.2em] text-muted sm:inline">Admin</span>
          </div>
          <div className="flex items-center gap-2 text-sm sm:gap-3">
            {/* stav webu — jasně vidět, přepnutí jen přes potvrzovací dialog */}
            <button
              type="button"
              onClick={() => setDialog(true)}
              className={`inline-flex h-9 items-center gap-2 rounded-full border px-3 text-xs transition-colors ${
                maintenance
                  ? 'border-[rgba(255,197,61,0.6)] bg-[rgba(255,197,61,0.1)] text-[#ffe2a0]'
                  : 'border-[rgba(61,220,151,0.35)] bg-[rgba(61,220,151,0.06)] text-[#9ff0c9] hover:border-[rgba(61,220,151,0.6)]'
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${maintenance ? 'animate-pulse bg-[#ffc53d] shadow-[0_0_8px_#ffc53d]' : 'bg-[#3ddc97] shadow-[0_0_8px_rgba(61,220,151,0.8)]'}`} />
              {maintenance ? 'Údržba zapnuta' : 'Web běží'}
            </button>
            <a href="/cs" target="_blank" rel="noreferrer" className="hidden text-muted transition-colors hover:text-ink md:inline">Zobrazit web ↗</a>
            <form action={signOut}>
              <Btn type="submit" size="sm">Odhlásit</Btn>
            </form>
          </div>
        </div>
        <nav className="mx-auto mt-2.5 flex max-w-6xl gap-0.5 overflow-x-auto px-2 [mask-image:linear-gradient(90deg,#000_82%,transparent)] [scrollbar-width:none] sm:mt-3 sm:gap-1 sm:px-5 sm:[mask-image:none] [&::-webkit-scrollbar]:hidden" aria-label="Sekce administrace">
          {TABS.map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => go(id)}
              aria-current={tab === id ? 'page' : undefined}
              className={`relative shrink-0 whitespace-nowrap px-3 pb-3 pt-2 font-display text-[10px] uppercase tracking-[0.12em] transition-colors sm:px-4 sm:text-[11px] sm:tracking-[0.14em] ${tab === id ? 'text-ink' : 'text-muted hover:text-ink'}`}
            >
              {label}
              {id === 'inquiries' && newCount ? (
                <span className="ml-1.5 inline-grid h-4 min-w-4 place-items-center rounded-full bg-[var(--blue-bright)] px-1 font-sans text-[10px] font-semibold tracking-normal text-white shadow-[0_0_10px_rgba(61,123,255,0.8)]">
                  {newCount}
                </span>
              ) : null}
              <span
                aria-hidden
                className={`absolute inset-x-3 bottom-0 h-[2px] rounded-full bg-[var(--blue-bright)] shadow-[0_0_10px_rgba(61,123,255,0.9)] transition-opacity duration-300 ${tab === id ? 'opacity-100' : 'opacity-0'}`}
              />
            </button>
          ))}
        </nav>
        {maintenance ? (
          <div className="border-t border-[rgba(255,197,61,0.3)] bg-[rgba(255,197,61,0.08)]">
            <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-2 text-xs text-[#ffe2a0] sm:px-5">
              <span>Web je v režimu údržby — návštěvníci vidí obrazovku „Technické práce“.</span>
              <button type="button" onClick={() => setDialog(true)} className="font-semibold underline-offset-4 hover:underline">
                Vypnout údržbu
              </button>
            </div>
          </div>
        ) : null}
      </header>

      {/* záložky zůstávají připojené — přepnutí je okamžité a rozepsané změny se neztratí */}
      <main className="relative mx-auto max-w-6xl px-4 py-6 sm:px-5 sm:py-8">
        <div hidden={tab !== 'inquiries'}><InquiriesTab initial={inquiries} onNewCount={setNewCount} focus={focusInquiry} /></div>
        <div hidden={tab !== 'projects'}><ProjectsTab projects={projects} /></div>
        <div hidden={tab !== 'gallery'}><GalleryTab initialItems={gallery} initialIndustries={industries} projects={projects} /></div>
        <div hidden={tab !== 'texts'}><TextsTab defaults={textDefaults} overrides={textOverrides} /></div>
        <div hidden={tab !== 'pricing'}><PricingTab initial={pricing} /></div>
        <div hidden={tab !== 'company'}><CompanyTab initial={settings} /></div>
        <div hidden={tab !== 'account'}><AccountTab email={email} /></div>
      </main>

      {dialog ? <MaintenanceDialog on={maintenance} onClose={() => setDialog(false)} onChanged={setMaintenanceState} /> : null}
    </div>
  );
}

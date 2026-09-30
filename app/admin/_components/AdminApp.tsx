'use client';

import { createBrowserClient } from '@supabase/ssr';
import { useEffect, useMemo, useState } from 'react';
import { Logo } from '@/components/ui/Logo';
import type { ProjectRow } from '@/lib/content/projects';
import {
  createUpload,
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
import { Btn, Card, Field, inputClass, SaveStatus, useSave } from './ui';
import { EDIT_GROUPS } from '@/lib/content/editable';

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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[rgba(2,4,9,0.78)] px-4 py-10 backdrop-blur-sm" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
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

          <div className="mt-7 flex flex-wrap items-center justify-between gap-4 border-t border-[var(--line)] pt-6">
            <label className="flex cursor-pointer items-center gap-3 text-sm">
              <Toggle checked={p.published} onChange={(v) => set('published', v)} />
              Zveřejněno na webu
            </label>
            <div className="flex flex-wrap items-center gap-4">
              <SaveStatus state={save.state} error={save.error} />
              <Btn onClick={onClose}>Zrušit</Btn>
              <Btn variant="primary" onClick={submit} disabled={save.busy}>
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
          {items.map((p, i) => (
            <li
              key={p.id}
              className={`group flex flex-wrap items-center gap-4 rounded-2xl border border-[var(--line)] bg-white/[0.02] p-3 pr-4 transition-colors hover:border-[rgba(80,120,255,0.4)] ${p.published ? '' : 'opacity-60'}`}
            >
              <div className="flex flex-col gap-1">
                <button type="button" aria-label="Posunout výš" disabled={i === 0} onClick={() => move(i, -1)} className="grid h-6 w-6 place-items-center rounded-md text-muted hover:bg-white/5 hover:text-ink disabled:opacity-25">↑</button>
                <button type="button" aria-label="Posunout níž" disabled={i === items.length - 1} onClick={() => move(i, 1)} className="grid h-6 w-6 place-items-center rounded-md text-muted hover:bg-white/5 hover:text-ink disabled:opacity-25">↓</button>
              </div>
              <div className="relative h-[72px] w-[124px] shrink-0 overflow-hidden rounded-xl border border-[var(--line)] bg-black/40">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.desktop_image} alt="" className="w-full" loading="lazy" />
                <span className="absolute inset-x-0 bottom-0 h-1" style={{ background: p.accent }} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-mono text-[10px] tracking-[0.2em] text-[rgba(160,185,235,0.7)]">№ {String(i + 1).padStart(2, '0')}</p>
                <p className="mt-0.5 truncate font-display text-sm font-bold uppercase">{p.name}</p>
                <p className="truncate text-sm text-muted">{p.kind || '—'}</p>
              </div>
              <label className="flex items-center gap-2.5 text-xs text-muted">
                <Toggle
                  checked={p.published}
                  onChange={(v) => optimistic(items.map((x) => (x.id === p.id ? { ...x, published: v } : x)), () => setPublished(p.id, v))}
                />
                {p.published ? 'Na webu' : 'Skryto'}
              </label>
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
            </li>
          ))}
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

function PricingTab({ initial }: { initial: Record<string, unknown> }) {
  const [d, setD] = useState<PricingData>(() => JSON.parse(JSON.stringify(initial)) as PricingData);
  const [dirty, setDirty] = useState(false);
  const save = useSave();
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
    <div className="space-y-6 pb-24">
      <Card title="Záhlaví sekce" subtitle="Česká verze webu. Ostatní jazyky zůstávají zatím beze změny.">
        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Nadpis — bílá část"><input className={inputClass} value={d.title} onChange={(e) => setTop('title', e.target.value)} /></Field>
          <Field label="Nadpis — modrá část"><input className={inputClass} value={d.titleAccent} onChange={(e) => setTop('titleAccent', e.target.value)} /></Field>
          <Field label="Úvodní text" className="md:col-span-2"><textarea className={`${inputClass} min-h-[72px]`} value={d.lead} onChange={(e) => setTop('lead', e.target.value)} /></Field>
          <Field label="Poznámka pod ceníkem"><input className={inputClass} value={d.vat} onChange={(e) => setTop('vat', e.target.value)} /></Field>
          <Field label="Popisky na kartách" hint="„od“ · „V ceně“ · „Zvlášť“ · „Termín“">
            <div className="grid grid-cols-4 gap-2">
              <input className={inputClass} value={d.from} onChange={(e) => setTop('from', e.target.value)} />
              <input className={inputClass} value={d.includes} onChange={(e) => setTop('includes', e.target.value)} />
              <input className={inputClass} value={d.extra} onChange={(e) => setTop('extra', e.target.value)} />
              <input className={inputClass} value={d.term} onChange={(e) => setTop('term', e.target.value)} />
            </div>
          </Field>
        </div>
      </Card>

      {PLAN_ORDER.map(([id, num, label]) => {
        const plan = d.plans[id];
        if (!plan) return null;
        return (
          <Card key={id} title={<><span className="mr-2 font-mono text-[11px] text-[rgba(160,185,235,0.7)]">№ {num}</span>{label}</>}>
            <div className="grid gap-5 md:grid-cols-3">
              <Field label="Název"><input className={inputClass} value={plan.name} onChange={(e) => setPlan(id, 'name', e.target.value)} /></Field>
              <Field label="Cena" hint="Např. „5 000 Kč“"><input className={inputClass} value={plan.price} onChange={(e) => setPlan(id, 'price', e.target.value)} /></Field>
              <Field label="Termín"><input className={inputClass} value={plan.term} onChange={(e) => setPlan(id, 'term', e.target.value)} /></Field>
              <Field label="Pro koho / krátký popis" className="md:col-span-3"><input className={inputClass} value={plan.tagline} onChange={(e) => setPlan(id, 'tagline', e.target.value)} /></Field>
              <Field label="V ceně" hint="Každá položka na vlastní řádek" className="md:col-span-2">
                <textarea className={`${inputClass} min-h-[180px] leading-relaxed`} defaultValue={plan.features.join('\n')} onChange={(e) => setPlan(id, 'features', lines(e.target.value))} />
              </Field>
              <div className="space-y-5">
                <Field label="Zvlášť (platí se navíc)"><textarea className={`${inputClass} min-h-[108px]`} value={plan.extra} onChange={(e) => setPlan(id, 'extra', e.target.value)} /></Field>
                <Field label="Text tlačítka"><input className={inputClass} value={plan.cta} onChange={(e) => setPlan(id, 'cta', e.target.value)} /></Field>
              </div>
            </div>
          </Card>
        );
      })}

      <Card title="Pruh „Větší projekt?“">
        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Nadpis"><input className={inputClass} value={d.custom.name} onChange={(e) => setTop('custom', { ...d.custom, name: e.target.value })} /></Field>
          <Field label="Cena (text)"><input className={inputClass} value={d.customPrice} onChange={(e) => setTop('customPrice', e.target.value)} /></Field>
          <Field label="Popis" className="md:col-span-2"><input className={inputClass} value={d.custom.tagline} onChange={(e) => setTop('custom', { ...d.custom, tagline: e.target.value })} /></Field>
          <Field label="Štítky" hint="Každý na vlastní řádek">
            <textarea className={`${inputClass} min-h-[110px]`} defaultValue={d.custom.items.join('\n')} onChange={(e) => setTop('custom', { ...d.custom, items: lines(e.target.value) })} />
          </Field>
          <Field label="Text tlačítka"><input className={inputClass} value={d.customCta} onChange={(e) => setTop('customCta', e.target.value)} /></Field>
        </div>
      </Card>

      <Card title="Otázky pod ceníkem">
        <div className="space-y-3">
          {d.faq.map((item, i) => (
            <div key={i} className="grid gap-3 md:grid-cols-[1fr_2fr]">
              <input className={inputClass} value={item.q} onChange={(e) => setTop('faq', d.faq.map((f, k) => (k === i ? { ...f, q: e.target.value } : f)))} />
              <input className={inputClass} value={item.a} onChange={(e) => setTop('faq', d.faq.map((f, k) => (k === i ? { ...f, a: e.target.value } : f)))} />
            </div>
          ))}
        </div>
      </Card>

      {/* pevná lišta ukládání — vždy po ruce, i uprostřed dlouhého formuláře */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--line)] bg-[rgba(6,9,18,0.92)] backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-end gap-4 px-5 py-3">
          {save.state === 'idle' && dirty ? <span className="text-sm text-muted">Neuložené změny</span> : null}
          <SaveStatus state={save.state} error={save.error} />
          <Btn variant="primary" onClick={submit} disabled={save.busy || (!dirty && save.state !== 'error')}>Uložit ceník</Btn>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Kontakt a účet                                                     */
/* ------------------------------------------------------------------ */

function CompanyTab({ initial }: { initial: SettingsInput }) {
  const [v, setV] = useState<SettingsInput>(initial);
  const [dirty, setDirty] = useState(false);
  const save = useSave();
  const set = (patch: Partial<SettingsInput>) => {
    setV((prev) => ({ ...prev, ...patch }));
    setDirty(true);
  };
  const setSocial = (k: keyof SettingsInput['social'], url: string) => set({ social: { ...v.social, [k]: url } });

  return (
    <div className="space-y-6">
      <Card title="Kontaktní e-mail" subtitle="Zobrazuje se na webu a chodí na něj poptávky z formuláře." className="max-w-3xl">
        <Field label="E-mail" hint="Bez vlastní ověřené domény v Resend doručuje formulář jen na e-mail, se kterým je účet Resend založený.">
          <input className={inputClass} type="email" value={v.contactEmail} onChange={(e) => set({ contactEmail: e.target.value })} />
        </Field>
      </Card>
      <Card title="Firma" subtitle="Patička, kontaktní sekce, strukturovaná data pro Google a stránka Ochrana osobních údajů." className="max-w-3xl">
        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Město"><input className={inputClass} value={v.city} onChange={(e) => set({ city: e.target.value })} /></Field>
          <Field label="IČO" hint="8 číslic, nepovinné"><input className={inputClass} inputMode="numeric" value={v.ico} onChange={(e) => set({ ico: e.target.value })} /></Field>
          <Field label="Právní název" className="md:col-span-2"><input className={inputClass} value={v.legalName} onChange={(e) => set({ legalName: e.target.value })} /></Field>
        </div>
      </Card>
      <Card title="Sociální sítě" subtitle="Prázdný odkaz = síť se na webu nezobrazí." className="max-w-3xl">
        <div className="grid gap-5">
          {(['instagram', 'linkedin', 'behance'] as const).map((k) => (
            <Field key={k} label={k === 'linkedin' ? 'LinkedIn' : k === 'behance' ? 'Behance' : 'Instagram'}>
              <input className={inputClass} value={v.social[k]} placeholder="https://" onChange={(e) => setSocial(k, e.target.value)} />
            </Field>
          ))}
        </div>
      </Card>
      <div className="flex max-w-3xl items-center justify-end gap-4">
        {save.state === 'idle' && dirty ? <span className="text-sm text-muted">Neuložené změny</span> : null}
        <SaveStatus state={save.state} error={save.error} />
        <Btn variant="primary" disabled={save.busy || !dirty} onClick={async () => (await save.run(() => saveSettings(v))) && setDirty(false)}>
          Uložit
        </Btn>
      </div>
    </div>
  );
}

function TextsTab({ defaults, overrides }: { defaults: Record<string, string>; overrides: Record<string, string> }) {
  const [values, setValues] = useState<Record<string, string>>(() => ({ ...defaults, ...overrides }));
  const [saved, setSaved] = useState<Record<string, string>>(() => ({ ...defaults, ...overrides }));
  const [group, setGroup] = useState(EDIT_GROUPS[0].id);
  const [query, setQuery] = useState('');
  const save = useSave();

  // porovnávat bez ořezu — části nadpisů mají záměrné mezery na krajích
  const changedFromDefault = (path: string) => values[path] !== defaults[path];
  const dirtyCount = Object.keys(values).filter((p) => values[p] !== saved[p]).length;
  const q = query.trim().toLowerCase();
  const visibleGroups = q
    ? EDIT_GROUPS.map((g) => ({ ...g, fields: g.fields.filter((f) => f.label.toLowerCase().includes(q) || values[f.path].toLowerCase().includes(q)) })).filter((g) => g.fields.length)
    : EDIT_GROUPS.filter((g) => g.id === group);

  const submit = async () => {
    const changes = Object.fromEntries(Object.entries(values).filter(([p, v]) => v !== defaults[p] && v.trim()));
    if (await save.run(() => saveTexts(changes))) setSaved({ ...values });
  };

  return (
    <div className="grid gap-6 pb-24 md:grid-cols-[230px_1fr]">
      <aside className="min-w-0 md:sticky md:top-[132px] md:self-start">
        <input className={`${inputClass} mb-4`} placeholder="Hledat text…" value={query} onChange={(e) => setQuery(e.target.value)} />
        <nav className="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible" aria-label="Sekce webu">
          {EDIT_GROUPS.map((g) => {
            const changed = g.fields.filter((f) => changedFromDefault(f.path)).length;
            const active = !q && group === g.id;
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => {
                  setQuery('');
                  setGroup(g.id);
                }}
                className={`flex shrink-0 items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 text-left text-sm transition-colors ${
                  active ? 'bg-[rgba(31,91,255,0.16)] text-ink shadow-[inset_0_0_0_1px_rgba(61,123,255,0.45)]' : 'text-muted hover:bg-white/[0.04] hover:text-ink'
                }`}
              >
                {g.title}
                {changed ? <span className="rounded-full bg-[rgba(61,123,255,0.25)] px-1.5 text-[10px] text-[#cfe0ff]">{changed}</span> : null}
              </button>
            );
          })}
        </nav>
      </aside>

      <div className="min-w-0 space-y-6">
        {visibleGroups.length === 0 ? <p className="text-sm text-muted">Nic nenalezeno.</p> : null}
        {visibleGroups.map((g) => (
          <Card key={g.id} title={g.title} subtitle={g.subtitle}>
            <div className="grid gap-5 md:grid-cols-2">
              {g.fields.map((f) => {
                const long = f.long || defaults[f.path].length > 70;
                const changed = changedFromDefault(f.path);
                return (
                  <div key={f.path} className={long ? 'md:col-span-2' : ''}>
                    <Field label={f.label} hint={f.hint}>
                      {long ? (
                        <textarea
                          className={`${inputClass} min-h-[76px] leading-relaxed`}
                          value={values[f.path]}
                          onChange={(e) => setValues((prev) => ({ ...prev, [f.path]: e.target.value }))}
                        />
                      ) : (
                        <input className={inputClass} value={values[f.path]} onChange={(e) => setValues((prev) => ({ ...prev, [f.path]: e.target.value }))} />
                      )}
                    </Field>
                    {changed ? (
                      <div className="mt-1.5 flex items-start justify-between gap-3 text-xs text-muted">
                        <span className="min-w-0 truncate">Původní: {defaults[f.path]}</span>
                        <button type="button" className="shrink-0 text-[#9fc0ff] hover:text-ink" onClick={() => setValues((prev) => ({ ...prev, [f.path]: defaults[f.path] }))}>
                          Vrátit původní
                        </button>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </Card>
        ))}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--line)] bg-[rgba(6,9,18,0.92)] backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-end gap-4 px-5 py-3">
          {save.state === 'idle' && dirtyCount ? <span className="text-sm text-muted">Neuložené změny: {dirtyCount}</span> : null}
          <SaveStatus state={save.state} error={save.error} />
          <Btn variant="primary" onClick={submit} disabled={save.busy || (!dirtyCount && save.state !== 'error')}>Uložit texty</Btn>
        </div>
      </div>
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

const TABS = [
  ['projects', 'Projekty'],
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
}: {
  email: string;
  projects: ProjectRow[];
  pricing: Record<string, unknown>;
  settings: SettingsInput;
  textDefaults: Record<string, string>;
  textOverrides: Record<string, string>;
}) {
  const [tab, setTab] = useState<Tab>('projects');
  // záložka v adrese (#cenik…) — obnovení stránky zůstane na stejném místě
  useEffect(() => {
    const fromHash = TABS.find(([id]) => `#${id}` === window.location.hash)?.[0];
    if (fromHash) setTab(fromHash);
  }, []);
  const go = (id: Tab) => {
    setTab(id);
    window.history.replaceState(null, '', `#${id}`);
  };

  return (
    <div className="relative min-h-dvh">
      <div aria-hidden className="pointer-events-none fixed inset-0" style={{ background: 'radial-gradient(55% 40% at 50% -5%, rgba(31,91,255,0.2), transparent 70%)' }} />
      <header className="sticky top-0 z-30 border-b border-[var(--line)] bg-[rgba(4,6,11,0.86)] backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-5 pt-4">
          <div className="flex items-center gap-4">
            <Logo height={22} priority />
            <span className="rounded-full border border-[var(--line)] px-2.5 py-1 font-display text-[9px] uppercase tracking-[0.2em] text-muted">Admin</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <a href="/cs" target="_blank" rel="noreferrer" className="hidden text-muted transition-colors hover:text-ink sm:inline">Zobrazit web ↗</a>
            <form action={signOut}>
              <Btn type="submit" size="sm">Odhlásit</Btn>
            </form>
          </div>
        </div>
        <nav className="mx-auto mt-3 flex max-w-5xl gap-1 overflow-x-auto px-5" aria-label="Sekce administrace">
          {TABS.map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => go(id)}
              aria-current={tab === id ? 'page' : undefined}
              className={`relative shrink-0 whitespace-nowrap px-4 pb-3 pt-2 font-display text-[11px] uppercase tracking-[0.14em] transition-colors ${tab === id ? 'text-ink' : 'text-muted hover:text-ink'}`}
            >
              {label}
              <span
                aria-hidden
                className={`absolute inset-x-3 bottom-0 h-[2px] rounded-full bg-[var(--blue-bright)] shadow-[0_0_10px_rgba(61,123,255,0.9)] transition-opacity duration-300 ${tab === id ? 'opacity-100' : 'opacity-0'}`}
              />
            </button>
          ))}
        </nav>
      </header>

      {/* záložky zůstávají připojené — přepnutí je okamžité a rozepsané změny se neztratí */}
      <main className="relative mx-auto max-w-5xl px-5 py-8">
        <div hidden={tab !== 'projects'}><ProjectsTab projects={projects} /></div>
        <div hidden={tab !== 'texts'}><TextsTab defaults={textDefaults} overrides={textOverrides} /></div>
        <div hidden={tab !== 'pricing'}><PricingTab initial={pricing} /></div>
        <div hidden={tab !== 'company'}><CompanyTab initial={settings} /></div>
        <div hidden={tab !== 'account'}><AccountTab email={email} /></div>
      </main>
    </div>
  );
}

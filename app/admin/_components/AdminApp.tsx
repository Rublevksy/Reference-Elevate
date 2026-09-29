'use client';

import { createBrowserClient } from '@supabase/ssr';
import { useMemo, useState, useTransition, type ReactNode } from 'react';
import type { ProjectRow } from '@/lib/content/projects';
import {
  createUpload,
  deleteProject,
  reorderProjects,
  savePricing,
  saveProject,
  saveSettings,
  setPublished,
  signOut,
  type ProjectInput,
} from '../actions';

/* ------------------------------------------------------------------ */
/*  Drobné UI prvky                                                    */
/* ------------------------------------------------------------------ */

const input =
  'w-full rounded-xl border border-[var(--line)] bg-white/[0.04] px-3.5 py-2.5 text-sm text-ink outline-none transition-colors focus:border-[rgba(61,123,255,0.7)]';
const btn = 'rounded-xl px-4 py-2.5 font-display text-[11px] uppercase tracking-[0.12em] transition-colors disabled:opacity-50';
const btnPrimary = `${btn} bg-[var(--blue)] text-white hover:bg-[var(--blue-bright)]`;
const btnGhost = `${btn} border border-[var(--line)] text-ink hover:border-[rgba(61,123,255,0.6)]`;

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">{label}</span>
      <div className="mt-1.5">{children}</div>
      {hint ? <span className="mt-1 block text-xs text-muted">{hint}</span> : null}
    </label>
  );
}

type Toast = { kind: 'ok' | 'error'; text: string } | null;

/* ------------------------------------------------------------------ */
/*  Obrázky: zmenšení v prohlížeči + nahrání přes podepsanou adresu     */
/* ------------------------------------------------------------------ */

/** Šířky jako u stávajících projektů (notebook 1152 px, telefon 585 px). */
const IMAGE_SPEC = {
  desktop: { width: 1152, maxHeight: 12000, label: 'Desktop — celá stránka (screenshot ~1440 px na šířku)' },
  mobile: { width: 585, maxHeight: 16000, label: 'Mobil — celá stránka (screenshot ~390 px na šířku)' },
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
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.8));
  if (!blob) throw new Error('Obrázek se nepodařilo převést.');
  return { blob, width, height };
}

function ImageField({
  kind,
  value,
  onChange,
}: {
  kind: 'desktop' | 'mobile';
  value: { url: string; width: number; height: number };
  onChange: (v: { url: string; width: number; height: number }) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const supabase = useMemo(
    () => createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!),
    [],
  );

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      const img = await prepareImage(file, kind);
      const slot = await createUpload(kind);
      if (!slot.ok) throw new Error(slot.error);
      const { error: upErr } = await supabase.storage.from('media').uploadToSignedUrl(slot.path, slot.token, img.blob, { contentType: 'image/jpeg' });
      if (upErr) throw upErr;
      onChange({ url: slot.publicUrl, width: img.width, height: img.height });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const frame = kind === 'desktop' ? 'aspect-[16/10] w-full' : 'aspect-[390/844] w-[46%]';
  return (
    <div>
      <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">{IMAGE_SPEC[kind].label}</span>
      <div className="mt-2 flex items-start gap-4">
        <div className={`${frame} shrink-0 overflow-y-auto rounded-xl border border-[var(--line)] bg-black/40`}>
          {value.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value.url} alt="" className="w-full" />
          ) : (
            <div className="grid h-full place-items-center p-4 text-center text-xs text-muted">Zatím bez obrázku</div>
          )}
        </div>
      </div>
      <label className={`${btnGhost} mt-3 inline-block cursor-pointer`}>
        {busy ? 'Nahrávám…' : value.url ? 'Vyměnit obrázek' : 'Nahrát obrázek'}
        <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" disabled={busy} onChange={(e) => pick(e.target.files?.[0])} />
      </label>
      {value.url ? <span className="ml-3 text-xs text-muted">{value.width} × {value.height} px</span> : null}
      {error ? <p className="mt-2 text-sm text-red-300">{error}</p> : null}
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

function ProjectEditor({ initial, onClose, onSaved }: { initial: ProjectInput; onClose: () => void; onSaved: (msg: string) => void }) {
  const [p, setP] = useState<ProjectInput>(initial);
  const [tags, setTags] = useState(initial.tags.join(', '));
  const [error, setError] = useState('');
  const [pending, start] = useTransition();
  const set = <K extends keyof ProjectInput>(k: K, v: ProjectInput[K]) => setP((prev) => ({ ...prev, [k]: v }));

  const submit = () =>
    start(async () => {
      setError('');
      const res = await saveProject({ ...p, tags: tags.split(',') });
      if (!res.ok) setError(res.error);
      else onSaved(initial.id ? 'Projekt uložen — na webu se objeví během pár vteřin.' : 'Projekt přidán — na webu se objeví během pár vteřin.');
    });

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 px-4 py-10 backdrop-blur-sm">
      <div className="mx-auto max-w-3xl rounded-2xl border border-[var(--line)] bg-[#0a0f1e] p-6 md:p-8">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold uppercase">{initial.id ? 'Upravit projekt' : 'Nový projekt'}</h2>
          <button type="button" onClick={onClose} className="text-sm text-muted hover:text-ink">Zavřít</button>
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <Field label="Název">
            <input className={input} value={p.name} onChange={(e) => set('name', e.target.value)} placeholder="EURO-MOTORS" />
          </Field>
          <Field label="Obor / kategorie" hint="Zobrazí se pod názvem, např. „Autoservis, Praha 10“">
            <input className={input} value={p.kind} onChange={(e) => set('kind', e.target.value)} />
          </Field>
          <Field label="Odkaz na web">
            <input className={input} value={p.url} onChange={(e) => set('url', e.target.value)} placeholder="https://" />
          </Field>
          <Field label="Barva projektu" hint="Jemně přebarví pozadí sekce, když je projekt aktivní">
            <div className="flex items-center gap-3">
              <input type="color" value={p.accent} onChange={(e) => set('accent', e.target.value)} className="h-10 w-14 cursor-pointer rounded-lg border border-[var(--line)] bg-transparent" />
              <input className={input} value={p.accent} onChange={(e) => set('accent', e.target.value)} />
            </div>
          </Field>
          <div className="md:col-span-2">
            <Field label="Štítky" hint="Oddělené čárkou, nejvýš 6">
              <input className={input} value={tags} onChange={(e) => setTags(e.target.value)} />
            </Field>
          </div>
        </div>

        <div className="mt-7 grid gap-6 md:grid-cols-[1.6fr_1fr]">
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
        <p className="mt-3 text-xs text-muted">
          Nahrajte screenshoty celé stránky (full-page). Na webu se v notebooku a telefonu samy posouvají — stejná animace jako u ostatních projektů.
        </p>

        <label className="mt-6 flex items-center gap-3 text-sm">
          <input type="checkbox" checked={p.published} onChange={(e) => set('published', e.target.checked)} className="h-4 w-4 accent-[var(--blue)]" />
          Zveřejněno na webu
        </label>

        {error ? <p className="mt-4 rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p> : null}
        <div className="mt-6 flex gap-3">
          <button type="button" onClick={submit} disabled={pending} className={btnPrimary}>
            {pending ? 'Ukládám…' : 'Uložit'}
          </button>
          <button type="button" onClick={onClose} className={btnGhost}>Zrušit</button>
        </div>
      </div>
    </div>
  );
}

function ProjectsTab({ projects, notify }: { projects: ProjectRow[]; notify: (t: Toast) => void }) {
  const [editing, setEditing] = useState<ProjectInput | null>(null);
  const [pending, start] = useTransition();

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, okText: string) =>
    start(async () => {
      const res = await fn();
      notify(res.ok ? { kind: 'ok', text: okText } : { kind: 'error', text: res.error ?? 'Chyba' });
    });

  const move = (i: number, dir: -1 | 1) => {
    const ids = projects.map((p) => p.id);
    const j = i + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    run(() => reorderProjects(ids), 'Pořadí uloženo.');
  };

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-lg font-bold uppercase">Projekty v sekci „Práce“</h2>
          <p className="mt-1 text-sm text-muted">Pořadí odpovídá webu. První tři projekty se objeví i v animovaném přechodu ze sekce Proces.</p>
        </div>
        <button type="button" className={btnPrimary} onClick={() => setEditing(emptyProject())}>+ Přidat projekt</button>
      </div>

      <ul className={`mt-6 space-y-3 ${pending ? 'opacity-60' : ''}`}>
        {projects.map((p, i) => (
          <li key={p.id} className="flex flex-wrap items-center gap-4 rounded-2xl border border-[var(--line)] bg-white/[0.02] p-3">
            <div className="h-16 w-28 shrink-0 overflow-hidden rounded-lg border border-[var(--line)] bg-black/40">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.desktop_image} alt="" className="w-full" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-display text-sm font-bold uppercase">
                {String(i + 1).padStart(2, '0')} {p.name}
                {!p.published ? <span className="ml-2 rounded-full border border-[var(--line)] px-2 py-0.5 text-[10px] normal-case text-muted">skryto</span> : null}
              </p>
              <p className="truncate text-sm text-muted">{p.kind || '—'} · {p.url || 'bez odkazu'}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" className={btnGhost} disabled={i === 0 || pending} onClick={() => move(i, -1)} aria-label="Posunout výš">↑</button>
              <button type="button" className={btnGhost} disabled={i === projects.length - 1 || pending} onClick={() => move(i, 1)} aria-label="Posunout níž">↓</button>
              <button type="button" className={btnGhost} disabled={pending} onClick={() => run(() => setPublished(p.id, !p.published), p.published ? 'Projekt skryt.' : 'Projekt zveřejněn.')}>
                {p.published ? 'Skrýt' : 'Zveřejnit'}
              </button>
              <button type="button" className={btnGhost} onClick={() => setEditing({ ...p })}>Upravit</button>
              <button
                type="button"
                className={`${btn} border border-red-500/40 text-red-200 hover:bg-red-500/10`}
                disabled={pending}
                onClick={() => {
                  if (window.confirm(`Smazat projekt „${p.name}“ včetně nahraných obrázků? Nelze vrátit.`)) run(() => deleteProject(p.id), 'Projekt smazán.');
                }}
              >
                Smazat
              </button>
            </div>
          </li>
        ))}
      </ul>

      {editing ? (
        <ProjectEditor
          initial={editing}
          onClose={() => setEditing(null)}
          onSaved={(text) => {
            setEditing(null);
            notify({ kind: 'ok', text });
          }}
        />
      ) : null}
    </section>
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
  ['web', '01 Weby'],
  ['seo', '02 SEO'],
  ['eshop', '03 E-shopy'],
  ['design', '04 Logo a design'],
  ['app', '05 Aplikace'],
] as const;

function PricingTab({ initial, notify }: { initial: Record<string, unknown>; notify: (t: Toast) => void }) {
  const [d, setD] = useState<PricingData>(() => JSON.parse(JSON.stringify(initial)) as PricingData);
  const [pending, start] = useTransition();
  const setTop = (k: keyof PricingData, v: unknown) => setD((prev) => ({ ...prev, [k]: v }));
  const setPlan = (id: string, k: keyof Plan, v: unknown) => setD((prev) => ({ ...prev, plans: { ...prev.plans, [id]: { ...prev.plans[id], [k]: v } } }));

  const save = () =>
    start(async () => {
      const res = await savePricing(d);
      notify(res.ok ? { kind: 'ok', text: 'Ceník uložen — na webu se změní během pár vteřin.' } : { kind: 'error', text: res.error });
    });

  const lines = (v: string) => v.split('\n').map((s) => s.trim()).filter(Boolean);

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-lg font-bold uppercase">Texty sekce „Ceník“</h2>
          <p className="mt-1 text-sm text-muted">Česká verze webu. Ostatní jazyky zůstávají zatím beze změny.</p>
        </div>
        <button type="button" className={btnPrimary} disabled={pending} onClick={save}>{pending ? 'Ukládám…' : 'Uložit ceník'}</button>
      </div>

      <div className="mt-6 grid gap-5 rounded-2xl border border-[var(--line)] p-5 md:grid-cols-2">
        <Field label="Nadpis (bílá část)"><input className={input} value={d.title} onChange={(e) => setTop('title', e.target.value)} /></Field>
        <Field label="Nadpis (modrá část)"><input className={input} value={d.titleAccent} onChange={(e) => setTop('titleAccent', e.target.value)} /></Field>
        <div className="md:col-span-2">
          <Field label="Úvodní text"><textarea className={`${input} min-h-[70px]`} value={d.lead} onChange={(e) => setTop('lead', e.target.value)} /></Field>
        </div>
        <Field label="Poznámka pod ceníkem"><input className={input} value={d.vat} onChange={(e) => setTop('vat', e.target.value)} /></Field>
        <Field label="Popisky karet" hint="„od“ · „V ceně“ · „Zvlášť“ · „Termín“">
          <div className="grid grid-cols-4 gap-2">
            <input className={input} value={d.from} onChange={(e) => setTop('from', e.target.value)} />
            <input className={input} value={d.includes} onChange={(e) => setTop('includes', e.target.value)} />
            <input className={input} value={d.extra} onChange={(e) => setTop('extra', e.target.value)} />
            <input className={input} value={d.term} onChange={(e) => setTop('term', e.target.value)} />
          </div>
        </Field>
      </div>

      <div className="mt-6 space-y-5">
        {PLAN_ORDER.map(([id, label]) => {
          const plan = d.plans[id];
          if (!plan) return null;
          return (
            <div key={id} className="rounded-2xl border border-[var(--line)] p-5">
              <p className="font-display text-sm font-bold uppercase text-[var(--blue-bright)]">{label}</p>
              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <Field label="Název"><input className={input} value={plan.name} onChange={(e) => setPlan(id, 'name', e.target.value)} /></Field>
                <Field label="Cena" hint="Např. „5 000 Kč“"><input className={input} value={plan.price} onChange={(e) => setPlan(id, 'price', e.target.value)} /></Field>
                <Field label="Termín"><input className={input} value={plan.term} onChange={(e) => setPlan(id, 'term', e.target.value)} /></Field>
                <div className="md:col-span-3">
                  <Field label="Pro koho / krátký popis"><input className={input} value={plan.tagline} onChange={(e) => setPlan(id, 'tagline', e.target.value)} /></Field>
                </div>
                <div className="md:col-span-2">
                  <Field label="V ceně" hint="Každá položka na vlastní řádek">
                    <textarea
                      className={`${input} min-h-[170px]`}
                      defaultValue={plan.features.join('\n')}
                      onChange={(e) => setPlan(id, 'features', lines(e.target.value))}
                    />
                  </Field>
                </div>
                <div className="space-y-4">
                  <Field label="Zvlášť (co se platí navíc)"><textarea className={`${input} min-h-[100px]`} value={plan.extra} onChange={(e) => setPlan(id, 'extra', e.target.value)} /></Field>
                  <Field label="Text tlačítka"><input className={input} value={plan.cta} onChange={(e) => setPlan(id, 'cta', e.target.value)} /></Field>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 grid gap-5 rounded-2xl border border-[var(--line)] p-5 md:grid-cols-2">
        <p className="font-display text-sm font-bold uppercase text-[var(--blue-bright)] md:col-span-2">Pruh „Větší projekt?“</p>
        <Field label="Nadpis"><input className={input} value={d.custom.name} onChange={(e) => setTop('custom', { ...d.custom, name: e.target.value })} /></Field>
        <Field label="Cena (text)"><input className={input} value={d.customPrice} onChange={(e) => setTop('customPrice', e.target.value)} /></Field>
        <div className="md:col-span-2">
          <Field label="Popis"><input className={input} value={d.custom.tagline} onChange={(e) => setTop('custom', { ...d.custom, tagline: e.target.value })} /></Field>
        </div>
        <Field label="Štítky" hint="Každý na vlastní řádek">
          <textarea className={`${input} min-h-[100px]`} defaultValue={d.custom.items.join('\n')} onChange={(e) => setTop('custom', { ...d.custom, items: lines(e.target.value) })} />
        </Field>
        <Field label="Text tlačítka"><input className={input} value={d.customCta} onChange={(e) => setTop('customCta', e.target.value)} /></Field>
      </div>

      <div className="mt-6 rounded-2xl border border-[var(--line)] p-5">
        <p className="font-display text-sm font-bold uppercase text-[var(--blue-bright)]">Otázky pod ceníkem</p>
        <div className="mt-4 space-y-4">
          {d.faq.map((item, i) => (
            <div key={i} className="grid gap-3 md:grid-cols-[1fr_2fr]">
              <input className={input} value={item.q} onChange={(e) => setTop('faq', d.faq.map((f, k) => (k === i ? { ...f, q: e.target.value } : f)))} />
              <input className={input} value={item.a} onChange={(e) => setTop('faq', d.faq.map((f, k) => (k === i ? { ...f, a: e.target.value } : f)))} />
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6">
        <button type="button" className={btnPrimary} disabled={pending} onClick={save}>{pending ? 'Ukládám…' : 'Uložit ceník'}</button>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Kontakt                                                            */
/* ------------------------------------------------------------------ */

function ContactTab({ initial, notify }: { initial: string; notify: (t: Toast) => void }) {
  const [email, setEmail] = useState(initial);
  const [pending, start] = useTransition();
  return (
    <section className="max-w-xl">
      <h2 className="font-display text-lg font-bold uppercase">Kontakt</h2>
      <p className="mt-1 text-sm text-muted">E-mail zobrazený na webu. Na tuto adresu chodí i poptávky z formuláře.</p>
      <div className="mt-6">
        <Field
          label="Kontaktní e-mail"
          hint="Bez vlastní ověřené domény v Resend doručuje formulář jen na e-mail, se kterým je účet Resend založený."
        >
          <input className={input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
      </div>
      <button
        type="button"
        className={`${btnPrimary} mt-5`}
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await saveSettings({ contactEmail: email });
            notify(res.ok ? { kind: 'ok', text: 'Kontakt uložen.' } : { kind: 'error', text: res.error });
          })
        }
      >
        {pending ? 'Ukládám…' : 'Uložit'}
      </button>
    </section>
  );
}

/* ------------------------------------------------------------------ */

const TABS = [
  ['projects', 'Projekty'],
  ['pricing', 'Ceník'],
  ['contact', 'Kontakt'],
] as const;

export function AdminApp({
  email,
  projects,
  pricing,
  contactEmail,
}: {
  email: string;
  projects: ProjectRow[];
  pricing: Record<string, unknown>;
  contactEmail: string;
}) {
  const [tab, setTab] = useState<(typeof TABS)[number][0]>('projects');
  const [toast, setToast] = useState<Toast>(null);
  const notify = (t: Toast) => {
    setToast(t);
    window.setTimeout(() => setToast(null), 5000);
  };

  return (
    <div className="min-h-dvh">
      <header className="border-b border-[var(--line)]">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-5 py-4">
          <div className="flex items-center gap-4">
            <span className="font-display text-sm tracking-[0.3em]">ELEVATE</span>
            <span className="text-xs text-muted">Administrace</span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <a href="/cs" target="_blank" rel="noreferrer" className="text-muted hover:text-ink">Zobrazit web ↗</a>
            <span className="hidden text-muted sm:inline">{email}</span>
            <form action={signOut}>
              <button type="submit" className={btnGhost}>Odhlásit</button>
            </form>
          </div>
        </div>
        <nav className="mx-auto flex max-w-5xl gap-1 px-5">
          {TABS.map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`border-b-2 px-4 py-3 text-sm transition-colors ${tab === id ? 'border-[var(--blue-bright)] text-ink' : 'border-transparent text-muted hover:text-ink'}`}
            >
              {label}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-8">
        {tab === 'projects' ? <ProjectsTab projects={projects} notify={notify} /> : null}
        {tab === 'pricing' ? <PricingTab initial={pricing} notify={notify} /> : null}
        {tab === 'contact' ? <ContactTab initial={contactEmail} notify={notify} /> : null}
      </main>

      {toast ? (
        <div
          role="status"
          className={`fixed bottom-5 right-5 z-[60] max-w-sm rounded-xl border px-4 py-3 text-sm shadow-xl ${
            toast.kind === 'ok' ? 'border-[rgba(61,123,255,0.5)] bg-[#0d1733]' : 'border-red-500/50 bg-[#2a0f14] text-red-100'
          }`}
        >
          {toast.text}
        </div>
      ) : null}
    </div>
  );
}

'use client';

import { createBrowserClient } from '@supabase/ssr';
import { useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Check, ImagePlus, Languages, Plus, RefreshCw, Trash2, X } from 'lucide-react';
import type { ProjectRow } from '@/lib/content/projects';
import { INDUSTRY_LOCALES, OTHER_INDUSTRY, industryName, slugifyIndustry, type GalleryItem, type Industry } from '@/lib/content/gallery';
import { addGalleryItems, createGalleryUpload, deleteGalleryItem, saveIndustries, updateGalleryItem, type GalleryInput } from '../actions';
import { Btn, Card, inputClass, SaveBar, useSave } from './ui';

/**
 * Galerie ukázek: skutečné weby studia rozdělené podle oborů. Ve formuláři
 * (krok Vzhled) uvidí návštěvník ukázky ze svého oboru a může označit, co se
 * mu líbí. Obory jsou zároveň volby „Obor podnikání" ve formuláři.
 */

const LOCALE_LABEL = { cs: 'Česky', en: 'English', ru: 'Русский', uk: 'Українська' } as const;

/* ---------- příprava obrázků v prohlížeči ---------- */

const FULL = { width: 1200, maxHeight: 3200 };
const THUMB = { width: 640, height: 400 };

async function toBlob(canvas: HTMLCanvasElement, quality: number) {
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
  if (!blob) throw new Error('Obrázek se nepodařilo převést.');
  return blob;
}

/** Plný snímek (max 1200 px na šířku, horní část dlouhých screenshotů). */
async function fullImage(bitmap: ImageBitmap) {
  const width = Math.min(FULL.width, bitmap.width);
  const scale = width / bitmap.width;
  const height = Math.min(FULL.maxHeight, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Prohlížeč neumí zpracovat obrázek.');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, 0, 0, bitmap.width, height / scale, 0, 0, width, height);
  return { blob: await toBlob(canvas, 0.82), width, height };
}

/** Zmenšenina 16:10 z horní části (úvodní obrazovka webu). */
async function thumbImage(bitmap: ImageBitmap) {
  const canvas = document.createElement('canvas');
  canvas.width = THUMB.width;
  canvas.height = THUMB.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Prohlížeč neumí zpracovat obrázek.');
  ctx.imageSmoothingQuality = 'high';
  const scale = THUMB.width / bitmap.width;
  const srcH = Math.min(bitmap.height, THUMB.height / scale);
  ctx.fillStyle = '#05070d';
  ctx.fillRect(0, 0, THUMB.width, THUMB.height);
  ctx.drawImage(bitmap, 0, 0, bitmap.width, srcH, 0, 0, THUMB.width, srcH * scale);
  return toBlob(canvas, 0.78);
}

/* ---------- komponenta ---------- */

export function GalleryTab({ initialItems, initialIndustries, projects }: { initialItems: GalleryItem[]; initialIndustries: Industry[]; projects: ProjectRow[] }) {
  const [items, setItems] = useState(initialItems);
  const [industries, setIndustries] = useState(initialIndustries);
  const [filter, setFilter] = useState<string>('all');
  const [queue, setQueue] = useState<{ name: string; state: string }[]>([]);
  const [error, setError] = useState('');
  const [fromProjects, setFromProjects] = useState(false);
  const supabase = useMemo(
    () => createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!),
    [],
  );

  const apply = (res: Awaited<ReturnType<typeof addGalleryItems>>) => {
    if (!res.ok) {
      setError(res.error);
      return false;
    }
    setItems(res.items);
    setIndustries(res.industries);
    setError('');
    return true;
  };

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of items) for (const id of item.industries) map.set(id, (map.get(id) ?? 0) + 1);
    return map;
  }, [items]);
  const orphans = items.filter((item) => !item.industries.length).length;
  const shown = items.filter((item) => (filter === 'all' ? true : filter === 'none' ? !item.industries.length : item.industries.includes(filter)));
  const presetIndustries = filter !== 'all' && filter !== 'none' ? [filter] : [];

  /** Nahrát soubor(y) → plný snímek + zmenšenina do úložiště. */
  const upload = async (file: File): Promise<Pick<GalleryInput, 'url' | 'thumb' | 'width' | 'height' | 'owned'>> => {
    const bitmap = await createImageBitmap(file);
    try {
      const [full, thumb, slot] = await Promise.all([fullImage(bitmap), thumbImage(bitmap), createGalleryUpload()]);
      if (!slot.ok) throw new Error(slot.error);
      const put = async (s: { path: string; token: string }, blob: Blob) => {
        const { error: upErr } = await supabase.storage.from('media').uploadToSignedUrl(s.path, s.token, blob, { contentType: 'image/jpeg' });
        if (upErr) throw upErr;
      };
      await Promise.all([put(slot.image, full.blob), put(slot.thumb, thumb)]);
      return { url: slot.image.publicUrl, thumb: slot.thumb.publicUrl, width: full.width, height: full.height, owned: [slot.image.path, slot.thumb.path] };
    } finally {
      bitmap.close();
    }
  };

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const list = Array.from(files).slice(0, 30);
    setQueue(list.map((f) => ({ name: f.name, state: 'čeká' })));
    const ready: GalleryInput[] = [];
    for (const [i, file] of list.entries()) {
      setQueue((q) => q.map((row, k) => (k === i ? { ...row, state: 'nahrávám…' } : row)));
      try {
        const up = await upload(file);
        ready.push({ ...up, industries: presetIndustries, label: file.name.replace(/\.[a-z0-9]+$/i, '').slice(0, 80) });
        setQueue((q) => q.map((row, k) => (k === i ? { ...row, state: 'hotovo' } : row)));
      } catch (e) {
        setQueue((q) => q.map((row, k) => (k === i ? { ...row, state: `chyba: ${e instanceof Error ? e.message : String(e)}` } : row)));
      }
    }
    if (ready.length) apply(await addGalleryItems(ready));
    window.setTimeout(() => setQueue((q) => q.filter((row) => !row.state.startsWith('hotovo'))), 2500);
  };

  /** Snímek z hotového projektu: plný obrázek zůstane projektu, nahraje se jen zmenšenina. */
  const addFromProject = async (project: ProjectRow) => {
    setQueue([{ name: project.name, state: 'připravuji…' }]);
    try {
      const response = await fetch(project.desktop_image);
      const bitmap = await createImageBitmap(await response.blob());
      const [thumb, slot] = await Promise.all([thumbImage(bitmap), createGalleryUpload()]);
      bitmap.close();
      if (!slot.ok) throw new Error(slot.error);
      const { error: upErr } = await supabase.storage.from('media').uploadToSignedUrl(slot.thumb.path, slot.thumb.token, thumb, { contentType: 'image/jpeg' });
      if (upErr) throw upErr;
      const ok = apply(
        await addGalleryItems([
          {
            url: project.desktop_image,
            thumb: slot.thumb.publicUrl,
            width: project.desktop_width,
            height: project.desktop_height,
            industries: presetIndustries,
            label: project.name,
            owned: [slot.thumb.path],
          },
        ]),
      );
      setQueue(ok ? [] : [{ name: project.name, state: 'chyba' }]);
    } catch (e) {
      setQueue([{ name: project.name, state: `chyba: ${e instanceof Error ? e.message : String(e)}` }]);
    }
  };

  const replace = async (item: GalleryItem, file: File | undefined) => {
    if (!file) return;
    setQueue([{ name: file.name, state: 'vyměňuji…' }]);
    try {
      const up = await upload(file);
      apply(await updateGalleryItem(item.id, up));
      setQueue([]);
    } catch (e) {
      setQueue([{ name: file.name, state: `chyba: ${e instanceof Error ? e.message : String(e)}` }]);
    }
  };

  const toggleIndustry = async (item: GalleryItem, id: string) => {
    const next = item.industries.includes(id) ? item.industries.filter((x) => x !== id) : [...item.industries, id];
    setItems((list) => list.map((x) => (x.id === item.id ? { ...x, industries: next } : x)));
    apply(await updateGalleryItem(item.id, { industries: next }));
  };

  const usedProjectUrls = new Set(items.map((item) => item.url));
  const projectChoices = projects.filter((p) => p.desktop_image && !usedProjectUrls.has(p.desktop_image));

  return (
    <div className="space-y-6 pb-28">
      <IndustriesCard industries={industries} counts={counts} onSaved={(res) => apply(res)} />

      <Card
        title="Ukázky"
        subtitle="Jen skutečné weby studia. Každá ukázka musí mít aspoň jeden obor — ve formuláři se ukáže zákazníkům z toho oboru."
        actions={
          <div className="flex flex-wrap gap-2">
            <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-btn bg-[linear-gradient(120deg,var(--blue),var(--blue-bright))] px-3.5 font-display text-[10px] uppercase tracking-[0.12em] text-white shadow-[0_0_24px_var(--blue-glow)]">
              <ImagePlus className="h-3.5 w-3.5" aria-hidden />
              Nahrát obrázky
              <input
                type="file"
                multiple
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => {
                  const input = e.currentTarget;
                  void onFiles(input.files).then(() => {
                    input.value = '';
                  });
                }}
              />
            </label>
            <Btn size="sm" onClick={() => setFromProjects((v) => !v)} disabled={!projectChoices.length} title={projectChoices.length ? '' : 'Všechny projekty už v galerii jsou'}>
              Přidat z projektů
            </Btn>
          </div>
        }
      >
        {fromProjects && projectChoices.length ? (
          <div className="mb-5 rounded-xl border border-[rgba(110,150,255,0.2)] bg-white/[0.02] p-3">
            <p className="mb-2 text-xs text-muted">Snímek webu z hotového projektu (záložka Projekty). {presetIndustries.length ? `Přidá se do oboru „${industryName(industries.find((i) => i.id === filter), 'cs')}".` : 'Obor pak vyberete u ukázky.'}</p>
            <div className="flex flex-wrap gap-2">
              {projectChoices.map((project) => (
                <button key={project.id} type="button" onClick={() => addFromProject(project)} className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-white/[0.03] py-1 pl-1 pr-3 text-xs text-ink hover:border-[rgba(80,120,255,0.55)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={project.desktop_image} alt="" className="h-7 w-11 rounded-full object-cover object-top" />
                  {project.name}
                  <Plus className="h-3 w-3 text-[var(--blue-bright)]" aria-hidden />
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {queue.length ? (
          <ul className="mb-4 space-y-1 text-xs">
            {queue.map((row, i) => (
              <li key={i} className={row.state.startsWith('chyba') ? 'text-[#ffb3be]' : 'text-muted'}>
                {row.name} — {row.state}
              </li>
            ))}
          </ul>
        ) : null}
        {error ? <p className="mb-4 text-sm text-[#ffb3be]">{error}</p> : null}

        {/* filtr podle oboru */}
        <div className="mb-5 flex flex-wrap gap-1.5">
          {[
            { id: 'all', label: 'Vše', n: items.length },
            ...industries.map((ind) => ({ id: ind.id, label: industryName(ind, 'cs'), n: counts.get(ind.id) ?? 0 })),
            ...(orphans ? [{ id: 'none', label: 'Bez oboru', n: orphans }] : []),
          ].map((chip) => (
            <button
              key={chip.id}
              type="button"
              onClick={() => setFilter(chip.id)}
              aria-pressed={filter === chip.id}
              className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                filter === chip.id
                  ? 'border-[rgba(143,178,255,0.85)] bg-[rgba(31,91,255,0.2)] text-white'
                  : chip.id === 'none'
                    ? 'border-[rgba(255,197,61,0.5)] text-[#ffe2a0]'
                    : 'border-[var(--line)] text-muted hover:text-ink'
              }`}
            >
              {chip.label} <span className="opacity-60">{chip.n}</span>
            </button>
          ))}
        </div>

        {shown.length ? (
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {shown.map((item) => (
              <GalleryCard
                key={item.id}
                item={item}
                industries={industries}
                onToggle={(id) => toggleIndustry(item, id)}
                onLabel={async (label) => apply(await updateGalleryItem(item.id, { label }))}
                onReplace={(file) => replace(item, file)}
                onDelete={async () => {
                  if (!window.confirm('Smazat ukázku? Obrázek zmizí i z formuláře.')) return;
                  apply(await deleteGalleryItem(item.id));
                }}
              />
            ))}
          </ul>
        ) : (
          <p className="rounded-xl border border-dashed border-[var(--line)] p-6 text-center text-sm text-muted">
            {items.length ? 'V tomhle oboru zatím nic není.' : 'Galerie je prázdná — nahrajte první snímky webů.'}
          </p>
        )}
      </Card>
    </div>
  );
}

function GalleryCard({
  item,
  industries,
  onToggle,
  onLabel,
  onReplace,
  onDelete,
}: {
  item: GalleryItem;
  industries: Industry[];
  onToggle: (id: string) => void;
  onLabel: (label: string) => void;
  onReplace: (file: File | undefined) => void;
  onDelete: () => void;
}) {
  const [label, setLabel] = useState(item.label);
  const missing = !item.industries.length;
  return (
    <li className={`overflow-hidden rounded-xl border bg-white/[0.02] ${missing ? 'border-[rgba(255,197,61,0.55)]' : 'border-[rgba(110,150,255,0.18)]'}`}>
      <a href={item.url} target="_blank" rel="noreferrer" className="block aspect-[16/10] overflow-hidden bg-black/40" title="Otevřít celý obrázek">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={item.thumb} alt="" className="h-full w-full object-cover object-top" loading="lazy" />
      </a>
      <div className="space-y-3 p-3">
        <input
          className={`${inputClass} !py-2 text-xs`}
          value={label}
          placeholder="Popisek (např. název projektu)"
          onChange={(e) => setLabel(e.target.value)}
          onBlur={() => label !== item.label && onLabel(label)}
        />
        <div>
          <p className={`mb-1.5 text-[10px] uppercase tracking-[0.14em] ${missing ? 'text-[#ffe2a0]' : 'text-muted'}`}>{missing ? 'Vyberte aspoň jeden obor' : 'Obory'}</p>
          <div className="flex flex-wrap gap-1.5">
            {industries.map((ind) => {
              const on = item.industries.includes(ind.id);
              return (
                <button
                  key={ind.id}
                  type="button"
                  onClick={() => onToggle(ind.id)}
                  aria-pressed={on}
                  className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] transition-colors ${
                    on ? 'border-[rgba(143,178,255,0.85)] bg-[rgba(31,91,255,0.22)] text-white' : 'border-[var(--line)] text-muted hover:text-ink'
                  }`}
                >
                  {on ? <Check className="h-3 w-3" aria-hidden /> : null}
                  {industryName(ind, 'cs')}
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-[rgba(110,150,255,0.12)] pt-3">
          <span className="text-[11px] text-muted">{item.width} × {item.height} px</span>
          <div className="flex gap-1.5">
            <label className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-btn border border-[var(--line)] bg-white/[0.04] px-2.5 text-[11px] text-ink hover:border-[rgba(80,120,255,0.55)]">
              <RefreshCw className="h-3 w-3" aria-hidden />
              Vyměnit
              <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => onReplace(e.target.files?.[0])} />
            </label>
            <button type="button" onClick={onDelete} className="inline-flex h-8 items-center gap-1.5 rounded-btn border border-[rgba(255,90,110,0.35)] px-2.5 text-[11px] text-[#ffc2cb] hover:border-[rgba(255,90,110,0.7)]">
              <Trash2 className="h-3 w-3" aria-hidden />
              Smazat
            </button>
          </div>
        </div>
      </div>
    </li>
  );
}

/** Seznam oborů — pořadí, názvy a překlady; „Jiný obor" vždy poslední. */
function IndustriesCard({
  industries,
  counts,
  onSaved,
}: {
  industries: Industry[];
  counts: Map<string, number>;
  onSaved: (res: Awaited<ReturnType<typeof saveIndustries>>) => void;
}) {
  const [draft, setDraft] = useState(industries);
  const [open, setOpen] = useState<string | null>(null);
  const [name, setName] = useState('');
  const save = useSave();
  const baseline = useRef(JSON.stringify(industries));
  const dirty = JSON.stringify(draft) !== baseline.current;

  const editable = draft.filter((i) => i.id !== OTHER_INDUSTRY);
  const other = draft.find((i) => i.id === OTHER_INDUSTRY);
  const setAll = (list: Industry[]) => setDraft(other ? [...list, other] : list);
  const patch = (id: string, fn: (i: Industry) => Industry) => setDraft((d) => d.map((i) => (i.id === id ? fn(i) : i)));
  const move = (index: number, dir: -1 | 1) => {
    const list = [...editable];
    const target = index + dir;
    if (target < 0 || target >= list.length) return;
    [list[index], list[target]] = [list[target], list[index]];
    setAll(list);
  };
  const add = () => {
    const cs = name.trim();
    if (!cs) return;
    let id = slugifyIndustry(cs);
    while (draft.some((i) => i.id === id)) id = `${id}-2`.slice(0, 40);
    setAll([...editable, { id, names: { cs } }]);
    setName('');
    setOpen(id);
  };

  const row = (ind: Industry, index: number) => {
    const isOther = ind.id === OTHER_INDUSTRY;
    const n = counts.get(ind.id) ?? 0;
    return (
      <li key={ind.id} className="rounded-xl border border-[rgba(110,150,255,0.14)] bg-white/[0.015]">
        <div className="flex items-center gap-2 p-2">
          <div className="flex flex-col">
            <button type="button" aria-label="Posunout nahoru" disabled={isOther || index === 0} onClick={() => move(index, -1)} className="grid h-5 w-7 place-items-center text-muted hover:text-ink disabled:opacity-25">
              <ArrowUp className="h-3.5 w-3.5" />
            </button>
            <button type="button" aria-label="Posunout dolů" disabled={isOther || index === editable.length - 1} onClick={() => move(index, 1)} className="grid h-5 w-7 place-items-center text-muted hover:text-ink disabled:opacity-25">
              <ArrowDown className="h-3.5 w-3.5" />
            </button>
          </div>
          <input
            className={`${inputClass} !py-2`}
            value={ind.names.cs ?? ''}
            onChange={(e) => patch(ind.id, (i) => ({ ...i, names: { ...i.names, cs: e.target.value } }))}
            aria-label="Název oboru česky"
          />
          <span className="hidden shrink-0 text-xs text-muted sm:inline">{n} {n === 1 ? 'ukázka' : n >= 2 && n <= 4 ? 'ukázky' : 'ukázek'}</span>
          <button
            type="button"
            onClick={() => setOpen(open === ind.id ? null : ind.id)}
            aria-expanded={open === ind.id}
            title="Překlady"
            className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg border ${open === ind.id ? 'border-[rgba(143,178,255,0.8)] text-ink' : 'border-[var(--line)] text-muted'}`}
          >
            <Languages className="h-4 w-4" />
          </button>
          {isOther ? (
            <span className="w-9 shrink-0 text-center text-[10px] text-muted" title="Jiný obor zůstává vždy poslední">—</span>
          ) : (
            <button
              type="button"
              title="Smazat obor"
              onClick={() => {
                if (n && !window.confirm(`Obor má ${n} ukázek — zůstanou v galerii, jen bez tohoto oboru. Smazat?`)) return;
                setAll(editable.filter((i) => i.id !== ind.id));
              }}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-[rgba(255,90,110,0.3)] text-[#ffc2cb] hover:border-[rgba(255,90,110,0.7)]"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        {open === ind.id ? (
          <div className="grid gap-2 border-t border-[rgba(110,150,255,0.12)] p-3 sm:grid-cols-3">
            {INDUSTRY_LOCALES.filter((l) => l !== 'cs').map((l) => (
              <label key={l} className="text-xs text-muted">
                {LOCALE_LABEL[l]}
                <input
                  className={`${inputClass} mt-1 !py-2`}
                  value={ind.names[l] ?? ''}
                  placeholder={`${ind.names.cs ?? ''} (bez překladu = česky)`}
                  onChange={(e) => patch(ind.id, (i) => ({ ...i, names: { ...i.names, [l]: e.target.value } }))}
                />
              </label>
            ))}
          </div>
        ) : null}
      </li>
    );
  };

  return (
    <Card title="Obory" subtitle="Jeden seznam pro formulář („Obor podnikání“) i pro galerii. Nový obor se po uložení hned objeví ve formuláři.">
      <ul className="space-y-2">
        {editable.map((ind, i) => row(ind, i))}
        {other ? row(other, editable.length) : null}
      </ul>
      <div className="mt-4 flex gap-2">
        <input
          className={inputClass}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), add())}
          placeholder="Nový obor česky, např. Fitness a sport"
        />
        <Btn onClick={add} disabled={!name.trim()}>
          <Plus className="h-4 w-4" aria-hidden />
          Přidat
        </Btn>
      </div>
      {dirty || save.state !== 'idle' ? (
        <SaveBar dirtyText={dirty ? 'Neuložené změny v oborech' : ''} state={save.state} error={save.error}>
          <Btn variant="ghost" disabled={!dirty || save.busy} onClick={() => setDraft(JSON.parse(baseline.current))}>
            Zahodit
          </Btn>
          <Btn
            variant="primary"
            disabled={!dirty || save.busy || draft.some((i) => !i.names.cs?.trim())}
            onClick={() =>
              save.run(async () => {
                const res = await saveIndustries(draft);
                if (res.ok) {
                  baseline.current = JSON.stringify(res.industries);
                  setDraft(res.industries);
                }
                onSaved(res);
                return res.ok ? { ok: true } : { ok: false, error: res.error };
              })
            }
          >
            Uložit obory
          </Btn>
        </SaveBar>
      ) : null}
    </Card>
  );
}

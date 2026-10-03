'use client';

import { createBrowserClient } from '@supabase/ssr';
import { useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Check, ImagePlus, Languages, LayoutGrid, Play, Plus, RefreshCw, Trash2, X } from 'lucide-react';
import type { ProjectRow } from '@/lib/content/projects';
import { GALLERY_TYPES, GALLERY_TYPE_LABEL, INDUSTRY_LOCALES, OTHER_INDUSTRY, industryName, slugifyIndustry, type GalleryItem, type GalleryType, type Industry } from '@/lib/content/gallery';
import { addGalleryItems, createGalleryUpload, deleteGalleryItem, saveIndustries, updateGalleryItem, type GalleryInput } from '../actions';
import { Btn, Card, inputClass, SaveBar, useSave } from './ui';

/**
 * Galerie ukázek: každá ukázka má dva štítky — typ projektu (web / e-shop /
 * logo / aplikace) a obor. Ve formuláři (krok Vzhled) se ukazují jen ukázky
 * pro kombinaci, kterou zákazník vybral. Tady: přehled počtů v tabulce
 * typ × obor, klepnutím na buňku se zobrazí jen ta kombinace.
 */

const LOCALE_LABEL = { cs: 'Česky', en: 'English', ru: 'Русский', uk: 'Українська' } as const;
const PAGE = 24;

/* ---------- příprava obrázků v prohlížeči ---------- */

const FULL = { width: 1000, maxHeight: 2600 };
const THUMB = { width: 480, height: 600 };

async function toBlob(canvas: HTMLCanvasElement, quality: number) {
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
  if (!blob) throw new Error('Obrázek se nepodařilo převést.');
  return blob;
}

/** Plný snímek (max 1000 px na šířku, horní část dlouhých stránek). */
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

/** Náhled 4:5 — stránky na výšku od horní hrany, obrázky na šířku celé na tmavém plátně. */
async function thumbImage(bitmap: ImageBitmap) {
  const canvas = document.createElement('canvas');
  canvas.width = THUMB.width;
  canvas.height = THUMB.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Prohlížeč neumí zpracovat obrázek.');
  ctx.imageSmoothingQuality = 'high';
  ctx.fillStyle = '#0a0c14';
  ctx.fillRect(0, 0, THUMB.width, THUMB.height);
  if (bitmap.height / bitmap.width >= 1.15) {
    const scale = THUMB.width / bitmap.width;
    const srcH = Math.min(bitmap.height, THUMB.height / scale);
    ctx.drawImage(bitmap, 0, 0, bitmap.width, srcH, 0, 0, THUMB.width, srcH * scale);
  } else {
    const scale = Math.min(THUMB.width / bitmap.width, THUMB.height / bitmap.height);
    const w = bitmap.width * scale;
    const h = bitmap.height * scale;
    ctx.drawImage(bitmap, (THUMB.width - w) / 2, (THUMB.height - h) / 2, w, h);
  }
  return toBlob(canvas, 0.78);
}

type Filter = { type: GalleryType | 'all'; industry: string };

/* ---------- komponenta ---------- */

export function GalleryTab({ initialItems, initialIndustries, projects }: { initialItems: GalleryItem[]; initialIndustries: Industry[]; projects: ProjectRow[] }) {
  const [items, setItems] = useState(initialItems);
  const [industries, setIndustries] = useState(initialIndustries);
  const [filter, setFilterState] = useState<Filter>({ type: 'all', industry: 'all' });
  const [limit, setLimit] = useState(PAGE);
  const [queue, setQueue] = useState<{ name: string; state: string }[]>([]);
  const [error, setError] = useState('');
  const [fromProjects, setFromProjects] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const supabase = useMemo(
    () => createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!),
    [],
  );
  const setFilter = (next: Filter, scroll = false) => {
    setFilterState(next);
    setLimit(PAGE);
    if (scroll) window.setTimeout(() => listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };

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

  /** počty: typ → obor (‚none' = bez oboru) */
  const counts = useMemo(() => {
    const map = new Map<string, number>();
    const bump = (k: string) => map.set(k, (map.get(k) ?? 0) + 1);
    for (const item of items) {
      bump(`${item.type}|*`);
      if (!item.industries.length) bump(`${item.type}|none`);
      for (const id of item.industries) {
        bump(`${item.type}|${id}`);
        bump(`*|${id}`);
      }
    }
    return map;
  }, [items]);
  const perIndustry = useMemo(() => new Map(industries.map((ind) => [ind.id, counts.get(`*|${ind.id}`) ?? 0])), [industries, counts]);
  const count = (type: string, industry: string) => counts.get(`${type}|${industry}`) ?? 0;

  const matches = (item: GalleryItem) =>
    (filter.type === 'all' || item.type === filter.type) &&
    (filter.industry === 'all' ? true : filter.industry === 'none' ? !item.industries.length : item.industries.includes(filter.industry));
  const overview = filter.type === 'all' && filter.industry === 'all';
  const shown = overview ? [] : items.filter(matches);
  const presetType: GalleryType = filter.type === 'all' ? 'web' : filter.type;
  const presetIndustries = filter.industry !== 'all' && filter.industry !== 'none' ? [filter.industry] : [];
  const presetText = `${GALLERY_TYPE_LABEL[presetType]}${presetIndustries.length ? ` → ${industryName(industries.find((i) => i.id === filter.industry), 'cs')}` : ''}`;

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
    const list = Array.from(files).slice(0, 40);
    setQueue(list.map((f) => ({ name: f.name, state: 'čeká' })));
    const ready: GalleryInput[] = [];
    for (const [i, file] of list.entries()) {
      setQueue((q) => q.map((row, k) => (k === i ? { ...row, state: 'nahrávám…' } : row)));
      try {
        const up = await upload(file);
        ready.push({ ...up, type: presetType, industries: presetIndustries, label: file.name.replace(/\.[a-z0-9]+$/i, '').slice(0, 80) });
        setQueue((q) => q.map((row, k) => (k === i ? { ...row, state: 'hotovo' } : row)));
      } catch (e) {
        setQueue((q) => q.map((row, k) => (k === i ? { ...row, state: `chyba: ${e instanceof Error ? e.message : String(e)}` } : row)));
      }
    }
    if (ready.length) apply(await addGalleryItems(ready));
    window.setTimeout(() => setQueue((q) => q.filter((row) => !row.state.startsWith('hotovo'))), 2500);
  };

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
          { type: 'web', url: project.desktop_image, thumb: slot.thumb.publicUrl, width: project.desktop_width, height: project.desktop_height, industries: presetIndustries, label: project.name, owned: [slot.thumb.path] },
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
      apply(await updateGalleryItem(item.id, await upload(file)));
      setQueue([]);
    } catch (e) {
      setQueue([{ name: file.name, state: `chyba: ${e instanceof Error ? e.message : String(e)}` }]);
    }
  };

  const patch = async (item: GalleryItem, change: Partial<GalleryInput>) => {
    setItems((list) => list.map((x) => (x.id === item.id ? { ...x, ...change } : x)));
    apply(await updateGalleryItem(item.id, change));
  };

  const usedProjectUrls = new Set(items.map((item) => item.url));
  const projectChoices = projects.filter((p) => p.desktop_image && !usedProjectUrls.has(p.desktop_image));
  const chip = (on: boolean, warn = false) =>
    `rounded-full border px-3 py-1.5 text-xs transition-colors ${on ? 'border-[rgba(143,178,255,0.85)] bg-[rgba(31,91,255,0.2)] text-white' : warn ? 'border-[rgba(255,197,61,0.5)] text-[#ffe2a0]' : 'border-[var(--line)] text-muted hover:text-ink'}`;
  const industryCols = [...industries.map((ind) => ({ id: ind.id, label: industryName(ind, 'cs') })), { id: 'none', label: 'Bez oboru' }];

  return (
    <div className="space-y-6 pb-28">
      <Card
        title="Ukázky"
        subtitle={`${items.length} ukázek. Každá má typ projektu a obor — ve formuláři se zákazníkovi ukážou jen ty, které odpovídají jeho výběru.`}
        actions={
          <div className="flex flex-wrap gap-2">
            <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-btn bg-[linear-gradient(120deg,var(--blue),var(--blue-bright))] px-3.5 font-display text-[10px] uppercase tracking-[0.12em] text-white shadow-[0_0_24px_var(--blue-glow)]" title={`Nahrané obrázky dostanou: ${presetText}`}>
              <ImagePlus className="h-3.5 w-3.5" aria-hidden />
              Nahrát do: {presetText}
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
            <p className="mb-2 text-xs text-muted">Snímek webu z hotového projektu (záložka Projekty) — přidá se jako Web.</p>
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

        {/* filtry: typ projektu + obor */}
        <div ref={listRef} className="scroll-mt-40 space-y-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 w-12 text-[10px] uppercase tracking-[0.14em] text-muted">Typ</span>
            <button type="button" onClick={() => setFilter({ ...filter, type: 'all' })} aria-pressed={filter.type === 'all'} className={chip(filter.type === 'all')}>
              Vše <span className="opacity-60">{items.length}</span>
            </button>
            {GALLERY_TYPES.map((type) => (
              <button key={type} type="button" onClick={() => setFilter({ ...filter, type })} aria-pressed={filter.type === type} className={chip(filter.type === type)}>
                {GALLERY_TYPE_LABEL[type]} <span className="opacity-60">{count(type, '*')}</span>
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 w-12 text-[10px] uppercase tracking-[0.14em] text-muted">Obor</span>
            <button type="button" onClick={() => setFilter({ ...filter, industry: 'all' })} aria-pressed={filter.industry === 'all'} className={chip(filter.industry === 'all')}>
              Vše
            </button>
            {industryCols.map((col) => {
              const n = filter.type === 'all' ? (col.id === 'none' ? items.filter((i) => !i.industries.length).length : perIndustry.get(col.id) ?? 0) : count(filter.type, col.id);
              return (
                <button key={col.id} type="button" onClick={() => setFilter({ ...filter, industry: col.id })} aria-pressed={filter.industry === col.id} className={chip(filter.industry === col.id)}>
                  {col.label} <span className="opacity-60">{n}</span>
                </button>
              );
            })}
          </div>
        </div>

        {overview ? (
          /* přehled: tabulka typ × obor, klepnutí = jen ta kombinace */
          <div className="mt-6 overflow-x-auto rounded-xl border border-[rgba(110,150,255,0.16)]">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-[0.12em] text-muted">
                  <th className="px-3 py-2.5 font-normal">
                    <span className="inline-flex items-center gap-1.5">
                      <LayoutGrid className="h-3.5 w-3.5" aria-hidden /> Obor ╲ Typ
                    </span>
                  </th>
                  {GALLERY_TYPES.map((type) => (
                    <th key={type} className="px-2 py-2.5 text-center font-normal">
                      <button type="button" onClick={() => setFilter({ type, industry: 'all' }, true)} className="hover:text-ink">
                        {GALLERY_TYPE_LABEL[type]}
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {industryCols.map((col) => (
                  <tr key={col.id} className="border-t border-[rgba(110,150,255,0.1)]">
                    <th className="px-3 py-2 text-left font-normal">
                      <button type="button" onClick={() => setFilter({ type: 'all', industry: col.id }, true)} className="text-ink/90 hover:text-white">
                        {col.label}
                      </button>
                    </th>
                    {GALLERY_TYPES.map((type) => {
                      const n = count(type, col.id);
                      return (
                        <td key={type} className="px-2 py-1.5 text-center">
                          {n ? (
                            <button type="button" onClick={() => setFilter({ type, industry: col.id }, true)} className="inline-grid h-8 min-w-12 place-items-center rounded-lg border border-[rgba(110,150,255,0.25)] bg-[rgba(31,91,255,0.1)] px-2 tabular-nums text-ink hover:border-[rgba(143,178,255,0.85)] hover:bg-[rgba(31,91,255,0.24)]">
                              {n}
                            </button>
                          ) : (
                            <span className="text-muted/50">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="border-t border-[rgba(110,150,255,0.1)] px-3 py-2 text-xs text-muted">Klepněte na číslo — zobrazí se jen ta kombinace (např. E-shop → Gastro a ubytování). Loga a aplikace bez oboru se ve formuláři ukazují u všech oborů.</p>
          </div>
        ) : shown.length ? (
          <>
            <p className="mt-5 text-xs text-muted">
              {shown.length} ukázek · {filter.type === 'all' ? 'všechny typy' : GALLERY_TYPE_LABEL[filter.type]} · {filter.industry === 'all' ? 'všechny obory' : industryCols.find((c) => c.id === filter.industry)?.label}
            </p>
            <ul className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {shown.slice(0, limit).map((item) => (
                <GalleryCard
                  key={item.id}
                  item={item}
                  industries={industries}
                  onType={(type) => patch(item, { type })}
                  onToggle={(id) => patch(item, { industries: item.industries.includes(id) ? item.industries.filter((x) => x !== id) : [...item.industries, id] })}
                  onLabel={(label) => patch(item, { label })}
                  onReplace={(file) => replace(item, file)}
                  onDelete={async () => {
                    if (!window.confirm('Smazat ukázku? Obrázek zmizí i z formuláře.')) return;
                    apply(await deleteGalleryItem(item.id));
                  }}
                />
              ))}
            </ul>
            {shown.length > limit ? (
              <div className="mt-5 text-center">
                <Btn onClick={() => setLimit((n) => n + PAGE)}>Zobrazit další ({shown.length - limit})</Btn>
              </div>
            ) : null}
          </>
        ) : (
          <p className="mt-6 rounded-xl border border-dashed border-[var(--line)] p-6 text-center text-sm text-muted">Pro tuhle kombinaci zatím nic není — zákazník ve formuláři uvidí zprávu „ozveme se s návrhem na míru“.</p>
        )}
      </Card>

      <IndustriesCard industries={industries} counts={perIndustry} onSaved={(res) => apply(res)} />
    </div>
  );
}

function GalleryCard({
  item,
  industries,
  onType,
  onToggle,
  onLabel,
  onReplace,
  onDelete,
}: {
  item: GalleryItem;
  industries: Industry[];
  onType: (type: GalleryType) => void;
  onToggle: (id: string) => void;
  onLabel: (label: string) => void;
  onReplace: (file: File | undefined) => void;
  onDelete: () => void;
}) {
  const [label, setLabel] = useState(item.label);
  const [open, setOpen] = useState(false);
  // web a e-shop obor potřebují; loga a aplikace mohou být obecné
  const missing = !item.industries.length && (item.type === 'web' || item.type === 'eshop');
  return (
    <li className={`overflow-hidden rounded-xl border bg-white/[0.02] ${missing ? 'border-[rgba(255,197,61,0.55)]' : 'border-[rgba(110,150,255,0.18)]'}`}>
      <a href={item.video ?? item.url} target="_blank" rel="noreferrer" className="relative block aspect-[4/5] overflow-hidden bg-black/40" title="Otevřít celý náhled">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={item.thumb} alt="" className="h-full w-full object-cover object-top" loading="lazy" />
        {item.video ? (
          <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] text-white">
            <Play className="h-3 w-3 fill-white" aria-hidden /> video
          </span>
        ) : null}
      </a>
      <div className="space-y-2.5 p-3">
        <div className="grid grid-cols-4 gap-1 rounded-lg border border-[var(--line)] p-0.5" role="radiogroup" aria-label="Typ projektu">
          {GALLERY_TYPES.map((type) => (
            <button key={type} type="button" role="radio" aria-checked={item.type === type} onClick={() => item.type !== type && onType(type)} className={`rounded-md px-1 py-1 text-[10.5px] transition-colors ${item.type === type ? 'bg-[rgba(31,91,255,0.3)] text-white' : 'text-muted hover:text-ink'}`}>
              {type === 'logo' ? 'Logo' : GALLERY_TYPE_LABEL[type]}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className={`block w-full truncate text-left text-xs ${missing ? 'text-[#ffe2a0]' : 'text-muted hover:text-ink'}`}>
          {item.industries.length ? item.industries.map((id) => industryName(industries.find((i) => i.id === id), 'cs')).join(', ') : missing ? 'Vyberte obor' : 'Bez oboru — u všech oborů'}
          <span className="ml-1 text-[var(--blue-bright)]">{open ? '▴' : '▾'}</span>
        </button>
        {open ? (
          <div className="space-y-2.5">
            <div className="flex flex-wrap gap-1.5">
              {industries.map((ind) => {
                const on = item.industries.includes(ind.id);
                return (
                  <button key={ind.id} type="button" onClick={() => onToggle(ind.id)} aria-pressed={on} className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] transition-colors ${on ? 'border-[rgba(143,178,255,0.85)] bg-[rgba(31,91,255,0.22)] text-white' : 'border-[var(--line)] text-muted hover:text-ink'}`}>
                    {on ? <Check className="h-3 w-3" aria-hidden /> : null}
                    {industryName(ind, 'cs')}
                  </button>
                );
              })}
            </div>
            <input className={`${inputClass} !py-2 text-xs`} value={label} placeholder="Popisek" onChange={(e) => setLabel(e.target.value)} onBlur={() => label !== item.label && onLabel(label)} />
          </div>
        ) : null}
        <div className="flex items-center justify-between gap-2 border-t border-[rgba(110,150,255,0.12)] pt-2.5">
          <span className="min-w-0 truncate text-[11px] text-muted" title={item.label}>{item.label || `${item.width} × ${item.height}`}</span>
          <div className="flex shrink-0 gap-1.5">
            <label className="grid h-8 w-8 cursor-pointer place-items-center rounded-btn border border-[var(--line)] bg-white/[0.04] text-ink hover:border-[rgba(80,120,255,0.55)]" title="Vyměnit obrázek">
              <RefreshCw className="h-3.5 w-3.5" aria-hidden />
              <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => onReplace(e.target.files?.[0])} />
            </label>
            <button type="button" onClick={onDelete} title="Smazat" className="grid h-8 w-8 place-items-center rounded-btn border border-[rgba(255,90,110,0.35)] text-[#ffc2cb] hover:border-[rgba(255,90,110,0.7)]">
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
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

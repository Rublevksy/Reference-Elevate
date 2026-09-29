export type Pose =
  | 'idle' | 'wave' | 'point' | 'think'
  | 'thumbsUp' | 'celebrate' | 'walk' | 'bored';

/**
 * 3D rendery maskota (public/mascot/*.webp, průhledné, výška 1400 px,
 * zdroje v reference/mascot-poses/). Chůze ani „znuděná" póza render nemají —
 * mapují se na nejbližší existující (klidný postoj / zamyšlení); maskot
 * nikdy „nechodí" posouváním obrázku.
 */
export const poseSprite: Record<Pose, string> = {
  idle: '/mascot/idle.webp',
  wave: '/mascot/wave.webp',
  point: '/mascot/point.webp',
  think: '/mascot/think.webp',
  thumbsUp: '/mascot/thumbsup.webp',
  celebrate: '/mascot/celebrate.webp',
  walk: '/mascot/idle.webp',
  bored: '/mascot/think.webp',
};

/** Poměr stran (šířka / výška) jednotlivých renderů. */
export const poseAspect: Record<Pose, number> = {
  idle: 553 / 1400,
  wave: 561 / 1400,
  point: 747 / 1400,
  think: 413 / 1400,
  thumbsUp: 511 / 1400,
  celebrate: 853 / 1400,
  walk: 553 / 1400,
  bored: 413 / 1400,
};

/** Klip v GLB modelu, až bude k dispozici. */
export const poseClip: Record<Pose, string> = {
  idle: 'Idle', wave: 'Wave', point: 'Point', think: 'Think',
  thumbsUp: 'ThumbsUp', celebrate: 'Celebrate', walk: 'Walk', bored: 'Idle',
};

/**
 * Dvojice sekce → póza. Text bere průvodce z messages (mascot.cues.<id>).
 * `hidden` = v téhle sekci maskot vystupuje přímo ve scéně, průvodce se schová.
 */
/**
 * „Záběr" průvodce v dané sekci: póza, celá postava / do pasu (vykukuje
 * zespodu, je větší), na kterou stranu obrazovky a jak je natočený.
 */
export type MascotShot = { framing: 'full' | 'waist'; side: 'left' | 'right'; flip?: boolean; turn: number };
export type MascotCue = { sectionId: string; pose: Pose; cue: string; hidden?: boolean; shot?: MascotShot };

export const mascotCues: MascotCue[] = [
  { sectionId: 'hero', pose: 'wave', cue: 'hero', hidden: true }, // maskot je přímo ve filmu
  { sectionId: 'sluzby', pose: 'wave', cue: 'sluzby', shot: { framing: 'full', side: 'right', turn: -16 } },
  { sectionId: 'detaily', pose: 'point', cue: 'detaily', shot: { framing: 'waist', side: 'right', flip: true, turn: 12 } },
  { sectionId: 'proc-animace', pose: 'celebrate', cue: 'proc-animace', hidden: true }, // vlastní maskot u přepínače
  { sectionId: 'proces', pose: 'think', cue: 'proces', hidden: true }, // maskot provází kroky ve scéně
  { sectionId: 'reference', pose: 'thumbsUp', cue: 'reference', shot: { framing: 'full', side: 'left', turn: 18 } },
  { sectionId: 'cenik', pose: 'think', cue: 'cenik', shot: { framing: 'waist', side: 'right', turn: -10 } },
  { sectionId: 'kontakt', pose: 'point', cue: 'kontakt', hidden: true }, // maskot u formuláře
];

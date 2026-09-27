export type Pose =
  | 'idle' | 'wave' | 'point' | 'think'
  | 'thumbsUp' | 'celebrate' | 'walk' | 'bored';

/**
 * Sprite pro jednotlivé pózy. Dokud nemáme render pro každou,
 * míří všechny na dostupné obrázky a pózu dohrává pohyb v <Mascot />.
 * Až přibydou další PNG, stačí přepsat cestu tady.
 */
export const poseSprite: Record<Pose, string> = {
  idle: '/assets/mascot-fullbody.png',
  wave: '/assets/mascot-fullbody.png',
  point: '/assets/mascot-fullbody.png',
  think: '/assets/mascot-cafe-cutout.png',
  thumbsUp: '/assets/mascot-fullbody.png',
  celebrate: '/assets/mascot-fullbody.png',
  walk: '/assets/mascot-fullbody.png',
  bored: '/assets/mascot-fullbody.png',
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
export type MascotCue = { sectionId: string; pose: Pose; cue: string; hidden?: boolean };

export const mascotCues: MascotCue[] = [
  { sectionId: 'hero', pose: 'wave', cue: 'hero', hidden: true },
  { sectionId: 'problem', pose: 'think', cue: 'problem', hidden: true },
  { sectionId: 'sluzby', pose: 'point', cue: 'sluzby', hidden: true },
  { sectionId: 'detaily', pose: 'point', cue: 'detaily', hidden: true },
  { sectionId: 'proc-animace', pose: 'celebrate', cue: 'proc-animace', hidden: true },
  { sectionId: 'proces', pose: 'walk', cue: 'proces', hidden: true },
  { sectionId: 'reference', pose: 'thumbsUp', cue: 'reference' },
  { sectionId: 'cenik', pose: 'point', cue: 'cenik' },
  { sectionId: 'faq', pose: 'idle', cue: 'faq' },
  { sectionId: 'kontakt', pose: 'point', cue: 'kontakt', hidden: true },
];

/**
 * Přesné souřadnice obrazovky v přiloženém MacBook mockupu
 * (public/assets/macbook-frame-cut.png), v procentech rozměrů obrázku.
 * Vygenerováno scripts/prepare-macbook.py — needituj ručně, spusť skript znovu.
 *
 * Rámeček (a "čelka" kamery) leží NAD obsahem — obsah se pozicuje přesně
 * do tohoto výřezu a nic z něj nesmí vyčnívat mimo.
 */
export const macbookScreen = {
  /** poměr stran celého PNG mockupu */
  imageAspect: 1472 / 854,
  /** odsazení obrazovky od okrajů obrázku, v % šířky/výšky obrázku */
  inset: {
    left: 10.8016,
    top: 2.2248,
    right: 10.8016,
    bottom: 11.5925,
  },
  /** poloměr zaoblení rohů obrazovky, v % šířky obrázku */
  cornerRadiusPct: 0.3397,
} as const;

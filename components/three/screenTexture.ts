import * as THREE from 'three';

const W = 1024;
const H = 640;

/**
 * Mini-web, který běží na displeji notebooku v heru.
 * Kreslíme ho do 2D canvasu a posíláme do three.js jako texturu —
 * levnější a ostřejší než vkládat DOM do scény.
 */
export function createScreenTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;

  const roundRect = (x: number, y: number, w: number, h: number, r: number) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  };

  let lastT = -1;
  let lastTime = -1;

  /**
   * t = 0..1 postup animace mini-webu.
   * Překreslujeme max. ~15× za sekundu a jen když se opravdu něco změnilo —
   * plný redraw 1024×640 canvasu v každém snímku je zbytečně drahý.
   */
  const draw = (t: number, time: number) => {
    if (Math.abs(t - lastT) < 0.003 && time - lastTime < 0.066) return;
    lastT = t;
    lastTime = time;

    const ease = (v: number) => 1 - Math.pow(1 - Math.max(0, Math.min(1, v)), 3);

    ctx.fillStyle = '#04060b';
    ctx.fillRect(0, 0, W, H);

    // pozadí – modrá záře
    const glow = ctx.createRadialGradient(W * 0.72, H * 0.1, 10, W * 0.72, H * 0.1, W * 0.75);
    glow.addColorStop(0, 'rgba(31,91,255,0.38)');
    glow.addColorStop(1, 'rgba(4,6,11,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    // horní lišta
    ctx.globalAlpha = ease(t * 4);
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fillRect(0, 0, W, 64);
    ctx.fillStyle = '#f2f5ff';
    ctx.font = '700 22px system-ui, sans-serif';
    ctx.fillText('E L E V A T E', 44, 40);
    ctx.fillStyle = 'rgba(242,245,255,0.55)';
    ctx.font = '500 16px system-ui, sans-serif';
    ['Služby', 'Proces', 'Reference', 'Kontakt'].forEach((item, index) => {
      ctx.fillText(item, W - 420 + index * 100, 40);
    });

    // headline
    const h1 = ease((t - 0.1) * 3);
    ctx.globalAlpha = h1;
    ctx.fillStyle = '#f2f5ff';
    ctx.font = '800 64px system-ui, sans-serif';
    ctx.fillText('Váš byznys.', 60, 210 - (1 - h1) * 24);
    ctx.fillStyle = '#3d7bff';
    ctx.fillText('Na vyšší úroveň.', 60, 290 - (1 - h1) * 24);

    ctx.globalAlpha = ease((t - 0.25) * 3);
    ctx.fillStyle = 'rgba(242,245,255,0.6)';
    ctx.font = '400 22px system-ui, sans-serif';
    ctx.fillText('Weby, e-shopy a aplikace, které přináší výsledky.', 62, 340);

    // CTA s pulzující září
    const btn = ease((t - 0.35) * 3);
    ctx.globalAlpha = btn;
    const pulse = 0.55 + Math.sin(time * 2.4) * 0.25;
    ctx.shadowColor = `rgba(31,91,255,${pulse})`;
    ctx.shadowBlur = 34;
    const grad = ctx.createLinearGradient(60, 0, 340, 0);
    grad.addColorStop(0, '#1f5bff');
    grad.addColorStop(1, '#3d7bff');
    ctx.fillStyle = grad;
    roundRect(60, 382, 286, 62, 16);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff';
    ctx.font = '700 18px system-ui, sans-serif';
    ctx.fillText('NEZÁVAZNÁ KONZULTACE →', 92, 420);

    // sloupcový graf vpravo
    const chart = ease((t - 0.45) * 2.4);
    ctx.globalAlpha = chart;
    ctx.strokeStyle = 'rgba(80,120,255,0.25)';
    ctx.lineWidth = 1;
    roundRect(600, 150, 370, 300, 18);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.03)';
    ctx.fill();

    const bars = [0.35, 0.5, 0.42, 0.68, 0.8, 1];
    bars.forEach((value, index) => {
      const barHeight = value * 190 * chart;
      const x = 636 + index * 54;
      const barGrad = ctx.createLinearGradient(0, 420 - barHeight, 0, 420);
      barGrad.addColorStop(0, '#3d7bff');
      barGrad.addColorStop(1, 'rgba(31,91,255,0.15)');
      ctx.fillStyle = barGrad;
      roundRect(x, 420 - barHeight, 32, barHeight, 8);
      ctx.fill();
    });

    ctx.fillStyle = 'rgba(242,245,255,0.85)';
    ctx.font = '700 18px system-ui, sans-serif';
    ctx.fillText('Přehled výsledků', 636, 190);

    ctx.globalAlpha = 1;
    texture.needsUpdate = true;
  };

  return { texture, draw, dispose: () => texture.dispose() };
}

/** Logo ELEVATE na víku notebooku. */
export function createLogoTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, 512, 128);
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 46px system-ui, sans-serif';
  ctx.letterSpacing = '10px';
  ctx.fillText('ELEV', 96, 80);
  ctx.fillText('TE', 320, 80);

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(258, 80);
  ctx.lineTo(283, 36);
  ctx.lineTo(295, 58);
  ctx.stroke();

  ctx.strokeStyle = '#3d7bff';
  ctx.beginPath();
  ctx.moveTo(272, 88);
  ctx.lineTo(312, 26);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(288, 26);
  ctx.lineTo(312, 26);
  ctx.lineTo(312, 50);
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

import { useEffect, useRef, useState } from 'react';
import { type Delineation, type Scene } from '../frag/index.ts';

// a deterministic bright colour per fragment label (so the segmentation reads clearly over the grey muckpile)
function labelColor(l: number): [number, number, number] {
  const h = (l * 47) % 360;
  const s = 0.75;
  const v = 0.95;
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}

/** Renders the synthetic muckpile + the live segmentation overlay: each delineated fragment is tinted by its label
 * colour (translucent), so the overlay shows how the watershed split the pile. Hover reads the fragment size out. Pure canvas. */
export function SceneView({ scene, delin, mmPerPx, showOverlay = true, height = 300, lang = 'en', unit = 'mm' }: {
  scene: Scene; delin: Delineation; mmPerPx: number; showOverlay?: boolean; height?: number; lang?: 'en' | 'es';
  /** size unit for the hover readout: 'mm' for synthetic/calibrated, 'px' for a real photo with unset scale. */
  unit?: 'mm' | 'px';
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hover, setHover] = useState<{ x: number; y: number; text: string } | null>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const dispW = wrap.clientWidth || 700;
    const scale = dispW / scene.width;
    const dispH = Math.round(scene.height * scale);
    const dpr = window.devicePixelRatio || 1;
    canvas.width = dispW * dpr;
    canvas.height = dispH * dpr;
    canvas.style.width = `${dispW}px`;
    canvas.style.height = `${dispH}px`;
    const ctx = canvas.getContext('2d')!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // composite the muckpile + the label tint into an offscreen ImageData, then scale-draw
    const off = document.createElement('canvas');
    off.width = scene.width;
    off.height = scene.height;
    const octx = off.getContext('2d')!;
    const img = octx.createImageData(scene.width, scene.height);
    const N = scene.width * scene.height;
    for (let i = 0; i < N; i++) {
      let r = scene.rgba[i * 4];
      let g = scene.rgba[i * 4 + 1];
      let b = scene.rgba[i * 4 + 2];
      const l = delin.labels[i];
      if (showOverlay && l > 0) {
        const [lr, lg, lb] = labelColor(l);
        r = r * 0.55 + lr * 0.45;
        g = g * 0.55 + lg * 0.45;
        b = b * 0.55 + lb * 0.45;
      } else if (showOverlay && l < 0) {
        r = 255; g = 255; b = 255; // ridge/boundary
      }
      img.data[i * 4] = r;
      img.data[i * 4 + 1] = g;
      img.data[i * 4 + 2] = b;
      img.data[i * 4 + 3] = 255;
    }
    octx.putImageData(img, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(off, 0, 0, dispW, dispH);
  }, [scene, delin, showOverlay, height]);

  const onMove = (e: React.MouseEvent) => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const rect = wrap.getBoundingClientRect();
    const scale = rect.width / scene.width;
    const ix = Math.floor((e.clientX - rect.left) / scale);
    const iy = Math.floor((e.clientY - rect.top) / scale);
    if (ix < 0 || ix >= scene.width || iy < 0 || iy >= scene.height) { setHover(null); return; }
    const l = delin.labels[iy * scene.width + ix];
    const f = l > 0 ? delin.fragments.find((fr) => Math.abs(fr.cx - ix) < 60 && Math.abs(fr.cy - iy) < 60) : null;
    setHover({
      x: e.clientX - rect.left, y: e.clientY - rect.top,
      text: f ? `${(f.equivDiamPx * mmPerPx).toFixed(0)} ${unit}` : (lang === 'es' ? 'borde / fondo' : 'edge / background'),
    });
  };

  return (
    <div className="fq-scene" ref={wrapRef} style={{ position: 'relative' }} onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
      <canvas ref={canvasRef} style={{ display: 'block', borderRadius: 8, width: '100%' }} />
      {hover && <div className="heatmap-readout" style={{ left: Math.min(hover.x + 10, 9999), top: hover.y + 10 }}>{hover.text}</div>}
    </div>
  );
}

import { useCallback, useMemo } from 'react';
import type uPlot from 'uplot';
import { type PSDPointRec, type RRFitRec } from '../lib/contract.types.ts';
import { themeColors, UPlotChart } from './UPlotChart.tsx';

/** The particle-size distribution: cumulative % passing vs size (log-x), with the recovered curve, the Rosin–Rammler
 * fit, and the ground-truth curve overlaid. The classic fragmentation plot (WipFrag/Split style). */
export function PSDChart({ recovered, truth, rr, lang = 'en', height = 260 }: {
  recovered: PSDPointRec[]; truth?: PSDPointRec[]; rr?: RRFitRec; lang?: 'en' | 'es'; height?: number;
}) {
  // shared log-spaced size axis (union of both curves' size points, sorted)
  const data = useMemo<uPlot.AlignedData>(() => {
    const sizes = recovered.map((p) => p.sizeMm);
    const rec = recovered.map((p) => p.passing * 100);
    const interp = (curve: PSDPointRec[] | undefined, x: number) => {
      if (!curve || !curve.length) return null;
      if (x <= curve[0].sizeMm) return curve[0].passing * 100;
      for (let i = 1; i < curve.length; i++) if (curve[i].sizeMm >= x) {
        const a = curve[i - 1];
        const b = curve[i];
        const t = (x - a.sizeMm) / Math.max(1e-9, b.sizeMm - a.sizeMm);
        return (a.passing + (b.passing - a.passing) * t) * 100;
      }
      return curve[curve.length - 1].passing * 100;
    };
    const tru = sizes.map((x) => interp(truth, x));
    const rrCurve = rr ? sizes.map((x) => (1 - Math.exp(-Math.pow(x / Math.max(1e-6, rr.xcMm), rr.nIndex))) * 100) : sizes.map(() => null);
    return [sizes, rec, tru, rrCurve];
  }, [recovered, truth, rr]);

  const build = useCallback((w: number, h: number): uPlot.Options => {
    const c = themeColors();
    return {
      width: w, height: h,
      scales: { x: { distr: 3, time: false }, y: { range: [0, 100] } }, // distr 3 = log-x
      cursor: { y: false },
      axes: [
        { stroke: c.subtle, grid: { stroke: c.border, width: 1 }, ticks: { stroke: c.border }, label: lang === 'es' ? 'tamaño (mm)' : 'size (mm)' },
        { stroke: c.subtle, grid: { stroke: c.border, width: 1 }, ticks: { stroke: c.border }, label: lang === 'es' ? '% pasante' : '% passing' },
      ],
      series: [
        {},
        { label: lang === 'es' ? 'recuperada' : 'recovered', stroke: c.accent, width: 2 },
        { label: lang === 'es' ? 'verdad' : 'truth', stroke: c.good, width: 2, dash: [5, 3] },
        { label: 'Rosin–Rammler', stroke: c.warn, width: 1.5, dash: [2, 3] },
      ],
    } as uPlot.Options;
  }, [lang]);

  return <UPlotChart data={data} build={build} height={height} />;
}

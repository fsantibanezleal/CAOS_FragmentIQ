/** A simple size-class histogram (count per log-spaced size bin) of the delineated fragments — the discrete view
 * behind the cumulative PSD curve. */
export function SizeHist({ bins, lang = 'en' }: { bins: Array<{ sizeMm: number; count: number }>; lang?: 'en' | 'es' }) {
  const max = Math.max(1, ...bins.map((b) => b.count));
  return (
    <div className="fq-hist">
      <div className="fq-hist-row">
        {bins.map((b, i) => (
          <div key={i} className="fq-hist-col" title={`${b.sizeMm} mm · ${b.count}`}>
            <i style={{ height: `${(b.count / max) * 100}%` }} />
            <span className="fq-hist-x">{b.sizeMm >= 100 ? b.sizeMm.toFixed(0) : b.sizeMm.toFixed(0)}</span>
          </div>
        ))}
      </div>
      <div className="pf-cap">{lang === 'es' ? 'conteo de fragmentos por clase de tamaño (mm)' : 'fragment count per size class (mm)'}</div>
    </div>
  );
}

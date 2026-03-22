export default function Toolbar({ scale, onScale, onUpscaleAll, onDownloadAll, onClear, hasImages, hasUpscaled, isProcessing }) {
  return (
    <div className="toolbar">
      <div className="toolbar__group">
        <span className="toolbar__label">Scale</span>
        {[2, 3, 4].map((s) => (
          <button
            key={s}
            className={`toolbar__scale-btn ${scale === s ? "toolbar__scale-btn--active" : ""}`}
            onClick={() => onScale(s)}
            disabled={isProcessing}
          >{s}×</button>
        ))}
      </div>

      <div className="toolbar__group--right">
        {hasImages && (
          <button className="toolbar__btn toolbar__btn--primary" onClick={onUpscaleAll} disabled={isProcessing}>
            {isProcessing ? "Processing…" : "Upscale all"}
          </button>
        )}
        {hasUpscaled && (
          <button className="toolbar__btn toolbar__btn--secondary" onClick={onDownloadAll} disabled={isProcessing}>
            Download all
          </button>
        )}
        <button className="toolbar__btn toolbar__btn--ghost" onClick={onClear} disabled={isProcessing}>
          Clear
        </button>
      </div>
    </div>
  );
}
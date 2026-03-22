import { downloadDataUrl } from "../utils/Upscale";

export default function ImageCard({ item, scale, onCompare, onRemove }) {
  const handleDownload = () => {
    const name = item.file.name.replace(/\.[^.]+$/, "");
    downloadDataUrl(item.upscaledSrc, `${name}_${scale}x_upscaled.png`);
  };

  return (
    <div className={`image-card image-card--${item.status}`}>
      <div className="image-card__thumb-wrap">
        <img
          className="image-card__thumb"
          src={item.upscaledSrc || item.originalSrc}
          alt={item.file.name}
        />

        {/* Remove — appears on hover */}
        <button
          className="image-card__remove"
          onClick={() => onRemove(item.id)}
          disabled={item.status === "processing"}
          title="Remove"
        >✕</button>

        {/* Processing */}
        {item.status === "processing" && (
          <div className="image-card__overlay">
            <div className="image-card__progress-bar">
              <div className="image-card__progress-fill" style={{ width: `${item.progress}%` }} />
            </div>
            <span className="image-card__progress-label">{item.progress}%</span>
          </div>
        )}

        {/* Done checkmark */}
        {item.status === "done" && (
          <span className="image-card__badge image-card__badge--done">✓</span>
        )}

        {/* Error */}
        {item.status === "error" && (
          <span className="image-card__badge image-card__badge--error">!</span>
        )}
      </div>

      <div className="image-card__info">
        <p className="image-card__name" title={item.file.name}>{item.file.name}</p>

        {/* Dimensions only — no verbose method text */}
        {item.meta && (
          <p className="image-card__meta">
            {item.status === "done" && item.newWidth
              ? `${item.newWidth} × ${item.newHeight}`
              : `${item.meta.width} × ${item.meta.height}`}
          </p>
        )}

        {/* AI badge only when Real-ESRGAN ran — no text for fallbacks */}
        {item.method === "realesrgan" && (
          <span className="method-badge badge--ai">AI</span>
        )}

        {item.error && <p className="image-card__error">{item.error}</p>}
      </div>

      {item.status === "done" && (
        <div className="image-card__actions">
          <button className="image-card__btn" onClick={() => onCompare(item)}>Compare</button>
          <button className="image-card__btn image-card__btn--primary" onClick={handleDownload}>Download</button>
        </div>
      )}
    </div>
  );
}
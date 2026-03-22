import { useState, useCallback, useEffect } from "react";
import DropZone    from "./components/DropZone";
import Toolbar     from "./components/Toolbar";
import ImageCard   from "./components/ImageCard";
import SplitViewer from "./components/SplitViewer";
import { upscaleFile, downloadDataUrl } from "./utils/Upscale";

let nextId = 1;

export default function App() {
  const [items,        setItems]       = useState([]);
  const [scale,        setScale]       = useState(2);
  const [isProcessing, setIsProcessing] = useState(false);
  const [compareItem,  setCompareItem]  = useState(null);
  const [serverStatus, setServerStatus] = useState(null);

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then((data) => setServerStatus(data))
      .catch(() => setServerStatus({ status: "offline" }));
  }, []);

  const updateItem = useCallback((id, patch) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item))
    );
  }, []);

  const removeItem = useCallback((id) => {
    setItems((prev) => {
      const item = prev.find((i) => i.id === id);
      if (item) URL.revokeObjectURL(item.originalSrc);
      return prev.filter((i) => i.id !== id);
    });
  }, []);

  const handleFiles = useCallback((files) => {
    const newItems = files.map((file) => ({
      id:          String(nextId++),
      file,
      originalSrc: URL.createObjectURL(file),
      upscaledSrc: null,
      status:      "idle",
      progress:    0,
      method:      null,
      meta:        null,
      error:       null,
    }));
    setItems((prev) => [...prev, ...newItems]);
    newItems.forEach((item) => fetchMeta(item.id, item.file));
  }, []);

  const fetchMeta = async (id, file) => {
    try {
      const form = new FormData();
      form.append("image", file);
      const res  = await fetch("/api/metadata", { method: "POST", body: form });
      const meta = await res.json();
      updateItem(id, { meta });
    } catch { }
  };

  const processItem = async (item, currentScale) => {
    updateItem(item.id, { status: "processing", progress: 10 });
    try {
      const result = await upscaleFile(
        item.file,
        currentScale,
        (pct) => updateItem(item.id, { progress: pct })
      );
      updateItem(item.id, {
        status:      "done",
        progress:    100,
        upscaledSrc: result.dataUrl,
        method:      result.method,
        newWidth:    result.newWidth,
        newHeight:   result.newHeight,
      });
    } catch (err) {
      updateItem(item.id, { status: "error", error: err.message });
    }
  };

  const handleUpscaleAll = async () => {
    const pending = items.filter((i) => i.status === "idle");
    if (!pending.length) return;
    setIsProcessing(true);
    for (const item of pending) await processItem(item, scale);
    setIsProcessing(false);
  };

  const handleDownloadAll = () => {
    items.filter((i) => i.status === "done").forEach((item) => {
      const name = item.file.name.replace(/\.[^.]+$/, "");
      downloadDataUrl(item.upscaledSrc, `${name}_${scale}x_upscaled.png`);
    });
  };

  const handleClear = () => {
    items.forEach((i) => URL.revokeObjectURL(i.originalSrc));
    setItems([]);
  };

  // Derive a simple status for the dot — no verbose sentences
  const dotCls = serverStatus === null      ? "status-dot--loading"
               : serverStatus.status === "offline"  ? "status-dot--offline"
               : serverStatus.ai_available           ? "status-dot--ai"
               :                                       "status-dot--pillow";

  const dotLabel = serverStatus === null      ? ""
                 : serverStatus.status === "offline"  ? "Offline"
                 : serverStatus.ai_available           ? "AI"
                 :                                       "Basic";

  return (
    <div className="app">
      <header className="header">
        <div className="header__brand">
          {/* Simple geometric logo mark */}
          <div className="header__logo">
            <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="1" y="1" width="6" height="6" fill="#000"/>
              <rect x="9" y="1" width="6" height="6" fill="#000"/>
              <rect x="1" y="9" width="6" height="6" fill="#000"/>
              <rect x="9" y="9" width="6" height="6" fill="#000" opacity="0.4"/>
            </svg>
          </div>
          <span className="header__title">PixApic</span>
        </div>

        {/* Just a dot + one word — no tech noise */}
        <div className="header__status">
          <span className={`status-dot ${dotCls}`} />
          {dotLabel && <span className="status-label">{dotLabel}</span>}
        </div>
      </header>

      <main className="main">
        <DropZone onFiles={handleFiles} />

        {items.length > 0 && (
          <Toolbar
            scale={scale}
            onScale={setScale}
            onUpscaleAll={handleUpscaleAll}
            onDownloadAll={handleDownloadAll}
            onClear={handleClear}
            hasImages={items.some((i) => i.status === "idle")}
            hasUpscaled={items.some((i) => i.status === "done")}
            isProcessing={isProcessing}
          />
        )}

        {items.length > 0 && (
          <div className="image-grid">
            {items.map((item) => (
              <ImageCard
                key={item.id}
                item={item}
                scale={scale}
                onCompare={setCompareItem}
                onRemove={removeItem}
              />
            ))}
          </div>
        )}

        {items.length === 0 && (
          <p className="hint">Drop images to upscale</p>
        )}
      </main>

      {compareItem && (
        <SplitViewer
          originalSrc={compareItem.originalSrc}
          upscaledSrc={compareItem.upscaledSrc}
          onClose={() => setCompareItem(null)}
        />
      )}
    </div>
  );
}
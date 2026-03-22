// SplitViewer.js
// Full-screen before/after comparison slider.
// Original image sits underneath; upscaled image is clipped on the right
// using CSS clip-path, revealing more or less as you drag the handle.

import { useState, useRef, useEffect, useCallback } from "react";

export default function SplitViewer({ originalSrc, upscaledSrc, onClose }) {
  const [sliderPct, setSliderPct] = useState(50);
  const containerRef = useRef(null);
  const dragging     = useRef(false);

  const updateSlider = useCallback((clientX) => {
    if (!containerRef.current) return;
    const { left, width } = containerRef.current.getBoundingClientRect();
    const pct = Math.min(100, Math.max(0, ((clientX - left) / width) * 100));
    setSliderPct(pct);
  }, []);

  const onMouseDown = (e) => { dragging.current = true; updateSlider(e.clientX); };
  const onMouseMove = useCallback((e) => { if (dragging.current) updateSlider(e.clientX); }, [updateSlider]);
  const onMouseUp   = () => { dragging.current = false; };

  const onTouchMove = useCallback((e) => {
    if (dragging.current) updateSlider(e.touches[0].clientX);
  }, [updateSlider]);

  useEffect(() => {
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup",   onMouseUp);
    window.addEventListener("touchmove", onTouchMove);
    window.addEventListener("touchend",  onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup",   onMouseUp);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend",  onMouseUp);
    };
  }, [onMouseMove, onTouchMove]);

  return (
    <div className="split-overlay">
      <div className="split-viewer" ref={containerRef}>

        {/* Original — always visible underneath */}
        <img
          className="split-viewer__img"
          src={originalSrc}
          alt="Original"
          draggable={false}
        />

        {/* Upscaled — clipped to reveal only the right side */}
        <img
          className="split-viewer__img split-viewer__img--upscaled"
          src={upscaledSrc}
          alt="Upscaled"
          draggable={false}
          style={{ clipPath: `inset(0 0 0 ${sliderPct}%)` }}
        />

        {/* Labels */}
        <span className="split-viewer__label split-viewer__label--left">ORIGINAL</span>
        <span className="split-viewer__label split-viewer__label--right">UPSCALED</span>

        {/* Drag handle */}
        <div
          className="split-viewer__handle"
          style={{ left: `${sliderPct}%` }}
          onMouseDown={onMouseDown}
          onTouchStart={(e) => {
            dragging.current = true;
            updateSlider(e.touches[0].clientX);
          }}
        >
          <div className="split-viewer__line" />
          <div className="split-viewer__knob">⇔</div>
        </div>
      </div>

      <button className="split-viewer__close" onClick={onClose}>
        ✕ Close
      </button>
    </div>
  );
}
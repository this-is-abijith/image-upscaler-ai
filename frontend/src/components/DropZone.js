import { useState, useRef } from "react";

export default function DropZone({ onFiles }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef();

  const handleDragOver  = (e) => { e.preventDefault(); setDragging(true); };
  const handleDragLeave = ()  => setDragging(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("image/"));
    if (files.length) onFiles(files);
  };

  const handleChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length) onFiles(files);
    e.target.value = "";
  };

  return (
    <div
      className={`dropzone ${dragging ? "dropzone--active" : ""}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => inputRef.current.click()}
    >
      <input ref={inputRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={handleChange} />
      <div className="dropzone__icon">↑</div>
      <p className="dropzone__title">Drop images here</p>
      <p className="dropzone__subtitle">PNG, JPG, WEBP — single or batch</p>
      <span className="dropzone__btn">Choose files</span>
    </div>
  );
}
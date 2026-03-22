# PixApic

AI-powered image upscaler. Enlarge images up to 4× using Real-ESRGAN running locally on your GPU.

![PixApic UI](/assets/Screenshot.png)

---

## Features

- **Real AI upscaling** — Real-ESRGAN neural network, not just interpolation
- **GPU accelerated** — runs via Vulkan, works on NVIDIA, AMD, and Intel GPUs
- **Batch processing** — drop multiple images and upscale them all at once
- **Before / After comparison** — drag slider to compare original vs upscaled
- **Scale control** — choose 2×, 3×, or 4×
- **Fallback chain** — if AI is unavailable, falls back to Pillow LANCZOS, then Canvas bicubic

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | React (Create React App) |
| Backend | Python Flask |
| AI Model | Real-ESRGAN ncnn Vulkan |
| Image processing | Pillow |

---

## Project Structure

```
pixelarc/
├── backend/
│   ├── app.py                  # Flask API — upscale, metadata, health endpoints
│   ├── requirements.txt
│   └── realesrgan-bin/
│       ├── realesrgan-ncnn-vulkan.exe
│       ├── vcomp140.dll
│       ├── vcomp140d.dll
│       └── models/
│           ├── realesrgan-x4plus.param
│           ├── realesrgan-x4plus.bin
│           ├── realesrgan-x4plus-anime.param
│           └── realesrgan-x4plus-anime.bin
└── frontend/
    ├── public/
    │   └── index.html
    └── src/
        ├── App.js
        ├── index.js
        ├── index.css
        ├── components/
        │   ├── DropZone.js      # Drag & drop file input
        │   ├── Toolbar.js       # Scale picker + actions
        │   ├── ImageCard.js     # Per-image tile with status
        │   └── SplitViewer.js   # Before/After comparison slider
        └── utils/
            └── upscale.js       # Flask-first upscale logic with Canvas fallback
```

---

## Setup

### Prerequisites

- Python 3.10+
- Node.js 18+
- A GPU with Vulkan support (NVIDIA / AMD / Intel)

---

### 1. Get the Real-ESRGAN binary and models

Download the Windows binary from the [Real-ESRGAN releases page](https://github.com/xinntao/Real-ESRGAN/releases):

- **Binary:** `realesrgan-ncnn-vulkan-vX.X.X-windows.zip` → extract `.exe` and `.dll` files
- **Models:** `realesrgan-ncnn-vulkan-20220424-windows.zip` → extract the `models/` folder

Place them into `backend/realesrgan-bin/` as shown in the structure above.

---

### 2. Backend

```bash
cd backend
pip install -r requirements.txt
python app.py
```

Flask starts at **http://localhost:5000**

---

### 3. Frontend

```bash
cd frontend
npm install
npm start
```

React starts at **http://localhost:3000**

> The `"proxy": "http://localhost:5000"` in `package.json` forwards all `/api/*`
> calls from React to Flask automatically — no CORS setup needed.

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Returns server status and AI availability |
| POST | `/api/metadata` | Accepts an image, returns dimensions and file info |
| POST | `/api/upscale` | Accepts an image + scale, returns upscaled PNG as base64 |

### Upscale request

```
POST /api/upscale
Content-Type: multipart/form-data

image  — image file (jpg / png / webp)
scale  — integer, 2 / 3 / 4
```

### Upscale response

```json
{
  "image":       "<base64 PNG>",
  "method":      "realesrgan",
  "orig_width":  800,
  "orig_height": 600,
  "new_width":   3200,
  "new_height":  2400,
  "scale":       4
}
```

`method` can be `realesrgan`, `pillow`, or `pillow_fallback`.

---

## How It Works

```
Browser → drop image
    ↓
React sends image to Flask /api/upscale
    ↓
Flask writes image to temp file
    ↓
realesrgan-ncnn-vulkan.exe processes it on GPU via Vulkan
    ↓
Flask reads output, encodes as base64, returns JSON
    ↓
React displays result, enables Compare + Download
```

If Flask is unreachable, `upscale.js` catches the error and falls back to
Canvas-based bicubic interpolation + unsharp mask sharpening entirely in the browser.

---

## Upscale Fallback Chain

```
1. Real-ESRGAN (GPU)     — best quality, AI super-resolution
2. Pillow LANCZOS (CPU)  — good quality, no GPU needed
3. Canvas bicubic        — browser-only, no server needed
```

---

## License

MIT
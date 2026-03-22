# app.py — PIXELARC AI Backend
#
# Uses realesrgan-ncnn-vulkan binary (no PyTorch, no version conflicts)
#
# Folder structure needed:
#   backend/
#   ├── app.py
#   └── realesrgan-bin/
#       ├── realesrgan-ncnn-vulkan.exe
#       ├── vcomp140.dll
#       ├── vcomp140d.dll
#       └── models/
#           ├── realesrgan-x4plus.param
#           ├── realesrgan-x4plus.bin
#           ├── realesrgan-x4plus-anime.param
#           └── realesrgan-x4plus-anime.bin

from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image
import io, base64, os, subprocess, tempfile, traceback

app = Flask(__name__)
CORS(app)

BASE_DIR     = os.path.dirname(os.path.abspath(__file__))
BIN_DIR      = os.path.join(BASE_DIR, "realesrgan-bin")
BINARY_PATH  = os.path.join(BIN_DIR, "realesrgan-ncnn-vulkan.exe")
MODELS_DIR   = os.path.join(BIN_DIR, "models")

# Check both binary AND models exist
BINARY_OK    = os.path.exists(BINARY_PATH)
MODELS_OK    = os.path.exists(MODELS_DIR) and any(
    f.endswith(".param") for f in os.listdir(MODELS_DIR)
) if os.path.exists(MODELS_DIR) else False

AI_AVAILABLE = BINARY_OK and MODELS_OK

print(f"  Binary : {'✅' if BINARY_OK else '❌'}  {BINARY_PATH}")
print(f"  Models : {'✅' if MODELS_OK else '❌'}  {MODELS_DIR}")


def image_to_base64(img: Image.Image) -> str:
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode("utf-8")


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({
        "status":       "ok",
        "ai_available": AI_AVAILABLE,
        "binary_ok":    BINARY_OK,
        "models_ok":    MODELS_OK,
        "device":       "vulkan-gpu" if AI_AVAILABLE else "none",
    })


@app.route("/api/metadata", methods=["POST"])
def metadata():
    if "image" not in request.files:
        return jsonify({"error": "No image provided"}), 400
    try:
        file = request.files["image"]
        img  = Image.open(file.stream)
        w, h = img.size
        file.stream.seek(0, os.SEEK_END)
        size_kb = round(file.stream.tell() / 1024, 1)
        return jsonify({
            "width": w, "height": h,
            "mode": img.mode,
            "format": img.format or "UNKNOWN",
            "size_kb": size_kb,
            "megapixels": round((w * h) / 1_000_000, 2),
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/upscale", methods=["POST"])
def upscale():
    if "image" not in request.files:
        return jsonify({"error": "No image provided"}), 400

    scale      = int(request.form.get("scale", 2))
    model_name = request.form.get("model", "realesrgan-x4plus")

    # realesrgan-x4plus only supports scale 4 natively
    # For 2x and 3x we run at 4x then resize down — still true AI quality
    run_scale  = 4 if scale in [2, 3] else scale

    try:
        raw_bytes = request.files["image"].read()
        pil_img   = Image.open(io.BytesIO(raw_bytes)).convert("RGB")
        orig_w, orig_h = pil_img.size

        method_used = "pillow"
        result_img  = None

        # ── Path A: Real-ESRGAN binary ─────────────────────────────────────
        if AI_AVAILABLE:
            try:
                # Write input image to temp file
                tmp_in  = tempfile.NamedTemporaryFile(suffix=".png", delete=False)
                tmp_out = tempfile.NamedTemporaryFile(suffix=".png", delete=False)
                tmp_in.close()
                tmp_out.close()

                pil_img.save(tmp_in.name)

                cmd = [
                    BINARY_PATH,
                    "-i", tmp_in.name,
                    "-o", tmp_out.name,
                    "-s", str(run_scale),
                    "-n", model_name,
                    "-m", MODELS_DIR,    # tell binary where models folder is
                    "-f", "png",
                ]

                print(f"  Running: {' '.join(cmd)}")

                result = subprocess.run(
                    cmd,
                    capture_output=True,
                    text=True,
                    timeout=180,
                    cwd=BIN_DIR,         # run from bin dir so dlls are found
                )

                if result.returncode != 0:
                    raise RuntimeError(result.stderr or result.stdout)

                result_img = Image.open(tmp_out.name).convert("RGB")

                # If we ran at 4x but user wanted 2x/3x, resize down
                if run_scale != scale:
                    target_w = orig_w * scale
                    target_h = orig_h * scale
                    result_img = result_img.resize((target_w, target_h), Image.LANCZOS)

                method_used = "realesrgan"

                os.unlink(tmp_in.name)
                os.unlink(tmp_out.name)

            except Exception as ai_err:
                print(f"⚠️  Real-ESRGAN failed: {ai_err}")
                print(traceback.format_exc())
                result_img  = _pillow_upscale(pil_img, orig_w, orig_h, scale)
                method_used = "pillow_fallback"

        # ── Path B: Pillow fallback ────────────────────────────────────────
        if result_img is None:
            result_img  = _pillow_upscale(pil_img, orig_w, orig_h, scale)
            method_used = "pillow"

        rw, rh = result_img.size
        return jsonify({
            "image":       image_to_base64(result_img),
            "method":      method_used,
            "orig_width":  orig_w,
            "orig_height": orig_h,
            "new_width":   rw,
            "new_height":  rh,
            "scale":       scale,
        })

    except Exception as e:
        print(traceback.format_exc())
        return jsonify({"error": str(e)}), 500


def _pillow_upscale(img, w, h, scale):
    return img.resize((w * scale, h * scale), Image.LANCZOS)


if __name__ == "__main__":
    print(f"🚀  PIXELARC API  →  http://localhost:5000")
    print(f"🤖  AI: {'ENABLED (Real-ESRGAN Vulkan)' if AI_AVAILABLE else 'DISABLED — Pillow fallback active'}")
    app.run(debug=True, port=5000)
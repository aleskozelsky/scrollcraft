# Asset Pipeline: The Intelligence Factor

The ScrollCraft 2.0 Asset Pipeline is designed to do the "hard work" of segmentation, tracking, and optimization using high-end AI models.

## 1. The One-Step Creation

The `npx scft create` command is the primary tool for generating projects.

```bash
npx scft create <input> [options]
```

### Options:
- `-o, --output <dir>`: Target directory (default: `./scrollcraft-project`).
- `-p, --prompt <text>`: Target object to track (e.g. "red car").
- `-s, --step <number>`: Process every Nth frame. **VITAL for performance**. (e.g. `--step 2` reduces footprint by 50%).
- `--cloud`: Use Fal.ai for tracking (requires `FAL_KEY`).
- `--depth`: Generate a corresponding image sequence of depth maps for the 3D parallax effect.

### What it does:
1.  **Auto-Upload**: If you provide a local `.mp4`, it's automatically uploaded to the cloud for processing.
2.  **Extraction**: Converts video files into high-quality image sequences.
3.  **AI Tracking**: Identifies the main subject (using **SAM 3**). Our engine now features **Sticky Tracking**—if the subject is obscured for a few frames, the coordinates hold their last known position.
4.  **Variant Generation**: 
    - **Smart Crop**: Centers the images based on the tracked subject.
    - **Resolution Scaling**: Creates 720p (Mobile) and 2160p (4K Desktop) folders.
    - **Compression**: Optimized `.webp` generation.
5.  **Metadata Export**: Generates the final `scrollcraft.json` with **root-relative paths** for easier deployment.

---

## 2. Cloud vs Local Processing

The pipeline is split into a **Local Implementation** path and a **Cloud-Accelerated** path.

### 🏠 Local Implementation (Free)
- Uses **FFmpeg** on your machine for extraction.
- Uses **Sharp** for resizing and cropping.
- Does **not** include automatic AI point-tracking (uses center-pinned defaults).

### ☁️ Cloud-Accelerated Implementation (Paid)
- **Fal.ai Integration**: Triggers high-end GPUs to run SAM 3 tracking.
- **Refinement**: Can be configured to auto-remove backgrounds or upscale low-res sequences using ESRGAN.
- **CDN Ready**: Prepares assets for cloud hosting.

---

## 3. Configuration (.env.local)

To use the cloud features, you must provide your own API keys in your `.env.local`:

```bash
FAL_KEY="your-fal-api-key"
```

*Note: This mimics the Remotion "Bring Your Own Key" model for indie developers.*

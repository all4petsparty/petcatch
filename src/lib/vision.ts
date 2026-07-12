import type { Species } from "@/lib/store";

/**
 * On-device AI pipeline (Transformers.js) — zero backend compute.
 *  - Runs on WebGPU when available (3-10× faster), WASM otherwise
 *  - image-classification (ViT, ImageNet-1k): species + breed + anti-spoofing
 *  - background-removal (RMBG-1.4 / ISNet): the sticker cutout
 *  - image-feature-extraction (DINOv2-small): 384-d instance embedding taken
 *    from the CUTOUT (background removed) — the pet's re-identification
 *    signature. DINOv2 features separate individuals far better than
 *    classification features, so the same pet is recognized across angles.
 */

const SPECIES_RANGES: [Species, [number, number][]][] = [
  ["bird", [[7, 24], [80, 100], [127, 146]]],
  ["dog", [[151, 268]]],
  ["cat", [[281, 285]]],
  ["rabbit", [[330, 332]]],
];

const SPOOF_WORDS = [
  "monitor", "screen", "television", "laptop", "desktop computer",
  "notebook", "cellular", "ipod", "projector", "web site", "hand-held computer",
];

export const SIGNATURE_DIM = 384; // DINOv2-small CLS token

export interface ClassifyResult {
  ok: boolean;
  reason?: "no_animal" | "screen_detected" | "too_still";
  species: Species;
  breed: string | null;
  confidence: number;
}

export type ProgressCallback = (pct: number) => void;

/* eslint-disable @typescript-eslint/no-explicit-any */
let classifierPromise: Promise<any> | null = null;
let extractorPromise: Promise<any> | null = null;
let segmenterPromise: Promise<any> | null = null;

// Aggregate download progress across all model files
const fileProgress = new Map<string, number>();
let progressListener: ProgressCallback | null = null;
export function onModelProgress(cb: ProgressCallback | null) {
  progressListener = cb;
}
function trackProgress(p: any) {
  if (p?.status === "progress" && p.file) {
    fileProgress.set(p.file, p.progress ?? 0);
    if (progressListener) {
      const vals = [...fileProgress.values()];
      progressListener(Math.round(vals.reduce((a, b) => a + b, 0) / vals.length));
    }
  }
}

/** WebGPU when the browser has it; a failed WebGPU init falls back to WASM. */
async function makePipeline(task: string, model: string, extra: Record<string, unknown> = {}, forceWasm = false) {
  const { pipeline } = await import("@huggingface/transformers");
  const base = { dtype: "q8", progress_callback: trackProgress, ...extra } as any;
  if (!forceWasm && typeof navigator !== "undefined" && (navigator as any).gpu) {
    try {
      return await pipeline(task as any, model, { ...base, device: "webgpu" });
    } catch {
      // WebGPU unavailable for this model/driver — use WASM
    }
  }
  return pipeline(task as any, model, base);
}

async function getClassifier() {
  classifierPromise ??= makePipeline("image-classification", "Xenova/vit-base-patch16-224");
  return classifierPromise;
}
async function getExtractor() {
  extractorPromise ??= makePipeline("image-feature-extraction", "Xenova/dinov2-small");
  return extractorPromise;
}
async function getSegmenter() {
  // RMBG-1.4 ships a bogus model_type; it's really an ISNet.
  // WASM only: quantized RMBG on mobile WebGPU drivers can emit garbage
  // mattes (streaky output), and this runs in the background anyway.
  segmenterPromise ??= makePipeline(
    "background-removal", "briaai/RMBG-1.4",
    { config: { model_type: "isnet" } },
    true
  );
  return segmenterPromise;
}

/** Kick off all model downloads (called from onboarding + capture tab). */
export function preloadModels() {
  getClassifier().catch(() => {});
  getExtractor().catch(() => {});
  getSegmenter().catch(() => {});
}

/** Load an image URL into a downscaled JPEG data URL (demo scans). */
export async function imageToDataUrl(src: string, maxSide = 512): Promise<string> {
  const img = new Image();
  img.crossOrigin = "anonymous";
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error(`Failed to load ${src}`));
    img.src = src;
  });
  const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.naturalWidth * scale);
  canvas.height = Math.round(img.naturalHeight * scale);
  canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.85);
}

export function grabFrame(video: HTMLVideoElement, maxSide = 512): string {
  const scale = Math.min(1, maxSide / Math.max(video.videoWidth, video.videoHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(video.videoWidth * scale);
  canvas.height = Math.round(video.videoHeight * scale);
  canvas.getContext("2d")!.drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.85);
}

/** Liveness heuristic: two frames ~650ms apart must differ (live scene). */
export async function checkLiveness(video: HTMLVideoElement): Promise<boolean> {
  const sample = () => {
    const c = document.createElement("canvas");
    c.width = 32; c.height = 32;
    c.getContext("2d")!.drawImage(video, 0, 0, 32, 32);
    const { data } = c.getContext("2d")!.getImageData(0, 0, 32, 32);
    const gray = new Float32Array(1024);
    for (let i = 0; i < 1024; i++) {
      gray[i] = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];
    }
    return gray;
  };
  const a = sample();
  await new Promise((r) => setTimeout(r, 650));
  const b = sample();
  let diff = 0;
  for (let i = 0; i < 1024; i++) diff += Math.abs(a[i] - b[i]);
  return diff / 1024 >= 0.8;
}

function titleCase(label: string): string {
  return label.split(",")[0].split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

/** Stage 1 (fast): species/breed classification + screen anti-spoofing. */
export async function classifyFrame(dataUrl: string): Promise<ClassifyResult> {
  const classifier = await getClassifier();
  const preds: { label: string; score: number }[] = await classifier(dataUrl, { top_k: 10 });

  const id2label: Record<string, string> = classifier.model.config.id2label ?? {};
  const labelToId = new Map(Object.entries(id2label).map(([id, l]) => [l, Number(id)]));

  const speciesScores = new Map<Species, { score: number; best: string; bestScore: number }>();
  let spoofScore = 0;
  for (const { label, score } of preds) {
    if (SPOOF_WORDS.some((w) => label.toLowerCase().includes(w))) {
      spoofScore += score;
      continue;
    }
    const idx = labelToId.get(label);
    if (idx === undefined) continue;
    for (const [species, ranges] of SPECIES_RANGES) {
      if (ranges.some(([lo, hi]) => idx >= lo && idx <= hi)) {
        const cur = speciesScores.get(species) ?? { score: 0, best: label, bestScore: 0 };
        cur.score += score;
        if (score > cur.bestScore) { cur.best = label; cur.bestScore = score; }
        speciesScores.set(species, cur);
      }
    }
  }

  let species: Species = "other";
  let breed: string | null = null;
  let confidence = 0;
  for (const [s, v] of speciesScores) {
    if (v.score > confidence) { confidence = v.score; species = s; breed = titleCase(v.best); }
  }

  if (spoofScore > 0.3 && spoofScore > confidence)
    return { ok: false, reason: "screen_detected", species, breed, confidence };
  if (confidence < 0.15)
    return { ok: false, reason: "no_animal", species, breed, confidence };
  return { ok: true, species, breed, confidence };
}

/** Stage 2: cut the pet out of the photo (transparent sticker). */
export async function segmentPet(dataUrl: string): Promise<string | null> {
  try {
    const segmenter = await getSegmenter();
    const output = await segmenter(dataUrl);
    const raw = Array.isArray(output) ? output[0] : output;
    if (!raw) return null;

    const canvas = document.createElement("canvas");
    canvas.width = raw.width;
    canvas.height = raw.height;
    const ctx = canvas.getContext("2d")!;
    if (typeof raw.toCanvas === "function") {
      ctx.drawImage(raw.toCanvas(), 0, 0);
    } else {
      // respect the source channel count — a stride mismatch here smears
      // the whole image into diagonal streaks
      const ch = raw.channels ?? 4;
      const pixels = ctx.createImageData(raw.width, raw.height);
      const n = raw.width * raw.height;
      for (let i = 0; i < n; i++) {
        pixels.data[i * 4] = raw.data[i * ch];
        pixels.data[i * 4 + 1] = raw.data[i * ch + (ch > 1 ? 1 : 0)];
        pixels.data[i * 4 + 2] = raw.data[i * ch + (ch > 2 ? 2 : 0)];
        pixels.data[i * 4 + 3] = ch === 4 ? raw.data[i * 4 + 3] : 255;
      }
      ctx.putImageData(pixels, 0, 0);
    }

    // Sanity check: a healthy matte has real foreground AND background.
    // Degenerate output (all-opaque, all-clear) → keep the original photo.
    const probe = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let opaque = 0;
    const total = canvas.width * canvas.height;
    for (let i = 3; i < probe.length; i += 4) if (probe[i] > 32) opaque++;
    const ratio = opaque / total;
    if (ratio < 0.02 || ratio > 0.98) {
      console.warn("[petcatch] cutout looked degenerate, keeping photo (fg ratio:", ratio.toFixed(2) + ")");
      return null;
    }

    const trimmed = trimTransparent(canvas);
    const webp = trimmed.toDataURL("image/webp", 0.82);
    return webp.startsWith("data:image/webp") ? webp : trimmed.toDataURL("image/png");
  } catch (err) {
    console.warn("[petcatch] cutout failed, falling back to full photo:", err);
    return null;
  }
}

/**
 * Stage 3: 384-d L2-normalized DINOv2 signature. Feed it the CUTOUT so the
 * background can't pollute the identity (falls back to the full frame).
 * The transparent cutout is composited onto neutral gray first — DINOv2
 * has no alpha channel, and a consistent backdrop keeps signatures stable.
 */
export async function embedSignature(imageDataUrl: string): Promise<number[]> {
  const extractor = await getExtractor();
  const input = imageDataUrl.startsWith("data:image/webp") || imageDataUrl.startsWith("data:image/png")
    ? await flattenOnGray(imageDataUrl)
    : imageDataUrl;
  const output = await extractor(input);
  const dim: number = output.dims[2];
  const cls = Array.from(output.data.slice(0, dim) as Float32Array);
  const norm = Math.hypot(...cls) || 1;
  return cls.map((v) => v / norm);
}

async function flattenOnGray(dataUrl: string): Promise<string> {
  const img = new Image();
  await new Promise<void>((res, rej) => {
    img.onload = () => res();
    img.onerror = () => rej(new Error("flatten load failed"));
    img.src = dataUrl;
  });
  const c = document.createElement("canvas");
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#808080";
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(img, 0, 0);
  return c.toDataURL("image/jpeg", 0.9);
}

function trimTransparent(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const ctx = canvas.getContext("2d")!;
  const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  let minX = width, minY = height, maxX = 0, maxY = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > 16) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX <= minX || maxY <= minY) return canvas;
  const pad = 6;
  minX = Math.max(0, minX - pad); minY = Math.max(0, minY - pad);
  maxX = Math.min(width - 1, maxX + pad); maxY = Math.min(height - 1, maxY + pad);
  const out = document.createElement("canvas");
  out.width = maxX - minX + 1;
  out.height = maxY - minY + 1;
  out.getContext("2d")!.drawImage(canvas, minX, minY, out.width, out.height, 0, 0, out.width, out.height);
  return out;
}

/** Cosine similarity (vectors are already L2-normalized). */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot;
}

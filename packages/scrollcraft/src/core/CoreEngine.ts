import { ProjectConfiguration, SequenceAsset, AssetVariant } from './types';
import { WebGLRenderer } from './WebGLRenderer';

/**
 * SCROLLCRAFT 2.0 CORE ENGINE
 * 
 * A declarative, performant engine that maps scroll progress 
 * to high-performance image sequence rendering.
 */
export class CoreEngine {
    private config: ProjectConfiguration;
    private currentFrame: number = -1;
    private activeVariant: AssetVariant | null = null;
    private canvas: HTMLCanvasElement | null = null;
    private ctx: CanvasRenderingContext2D | null = null;
    private renderer: WebGLRenderer | null = null;

    // Internal Cache
    private imageCache: Map<string, HTMLImageElement> = new Map();
    private depthCache: Map<string, HTMLImageElement> = new Map();
    private scrollTimeout: any = null;

    constructor(config: ProjectConfiguration) {
        this.config = config;
        this.detectBestVariant();

        // Listen for window resize to swap variants (Adaptive Rendering)
        window.addEventListener('resize', () => {
            this.detectBestVariant();
            this.resizeCanvas();
            this.render(); // Re-render current frame on resize
        });
    }

    /**
     * ATTACH CANVAS
     * Connects the engine to a DOM element for rendering.
     */
    public attachCanvas(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        try {
            this.renderer = new WebGLRenderer(canvas);
        } catch (e) {
            console.warn("WebGL failed, falling back to 2D", e);
            this.ctx = canvas.getContext('2d', { alpha: false });
        }
        this.resizeCanvas();
        this.render();
    }

    private resizeCanvas() {
        if (!this.canvas) return;

        // Set display size (css pixels)
        const width = window.innerWidth;
        const height = window.innerHeight;

        // Set actual size (retina support)
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = width * dpr;
        this.canvas.height = height * dpr;

        if (this.ctx) {
            this.ctx.scale(dpr, dpr);
        }
    }

    /**
     * ADAPTIVE RENDERING
     * Selects the best image folder based on current browser media queries.
     */
    private detectBestVariant() {
        const firstSequence = this.config.assets[0];
        if (!firstSequence) return;

        const bestMatch = firstSequence.variants.find(v => {
            return window.matchMedia(v.media).matches;
        }) || firstSequence.variants[0];

        if (!bestMatch) {
            console.warn('[CoreEngine] No best match found');
            return;
        };

        if (this.activeVariant?.id !== bestMatch.id) {
            console.log(`🎯 Variant Switched: ${bestMatch.id}`);
            this.activeVariant = bestMatch;
            console.log(`[CoreEngine] Variant hasDepthMap:`, this.activeVariant.hasDepthMap);
            this.clearCache();
            this.preloadInitial();
        }
    }

    private clearCache() {
        this.imageCache.clear();
        this.depthCache.clear();
    }

    private preloadInitial() {
        for (let i = 0; i < 15; i++) {
            this.getImage(i);
        }
    }

    /**
     * THE PLAYER ENGINE
     * Maps global scroll progress (0-1) to local scene frames.
     */
    public update(progress: number) {
        const scene = this.config.timeline.scenes[0];
        if (!scene) return;

        const totalFrames = scene.assetRange[1] - scene.assetRange[0];
        const localFrame = Math.floor(scene.assetRange[0] + (progress * totalFrames));

        if (localFrame !== this.currentFrame) {
            this.currentFrame = localFrame;
            this.render();
            // Predictive preloading
            this.getImage(this.currentFrame + 5);
            this.getImage(this.currentFrame + 10);

            // Lazy load depth map when scroll stops
            if (this.scrollTimeout) clearTimeout(this.scrollTimeout);
            this.scrollTimeout = setTimeout(() => {
                this.loadDepthMap(this.currentFrame);
            }, 100);
        }

        return {
            frame: this.currentFrame,
            subjectCoords: this.getSubjectCoords(this.currentFrame)
        };
    }

    private getSubjectCoords(frame: number) {
        if (!this.activeVariant?.subjectTracking) return { x: 0.5, y: 0.5 };
        const trackData = this.activeVariant.subjectTracking.find(f => f.frame === frame);
        return trackData ? { x: trackData.x, y: trackData.y } : { x: 0.5, y: 0.5 };
    }

    /**
     * RENDER LOOP
     * Draws the image to the canvas with object-fit: cover logic.
     */
    private render() {
        if (!this.canvas || this.currentFrame === -1) return;

        const img = this.getImage(this.currentFrame);
        if (!img || !img.complete) return;

        const canvasWidth = window.innerWidth;
        const canvasHeight = window.innerHeight;

        let depthImg = null;
        if (this.activeVariant?.hasDepthMap) {
            depthImg = this.getDepthImage(this.currentFrame);
            if (depthImg && !depthImg.complete) depthImg = null;
        }

        if (this.renderer) {
            this.renderer.render(img, depthImg, canvasWidth * (window.devicePixelRatio || 1), canvasHeight * (window.devicePixelRatio || 1));
        } else if (this.ctx) {
            // ... fallback 2d ...
            const imgWidth = img.naturalWidth;
            const imgHeight = img.naturalHeight;
            const imgRatio = imgWidth / imgHeight;
            const canvasRatio = canvasWidth / canvasHeight;

            let drawWidth, drawHeight, offsetX, offsetY;

            if (imgRatio > canvasRatio) {
                drawHeight = canvasHeight;
                drawWidth = canvasHeight * imgRatio;
                offsetX = (canvasWidth - drawWidth) / 2;
                offsetY = 0;
            } else {
                drawWidth = canvasWidth;
                drawHeight = canvasWidth / imgRatio;
                offsetX = 0;
                offsetY = (canvasHeight - drawHeight) / 2;
            }

            this.ctx.clearRect(0, 0, canvasWidth, canvasHeight);
            this.ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
        }
    }

    private getImage(frame: number): HTMLImageElement | null {
        if (!this.activeVariant) return null;
        if (frame < 0 || frame >= this.activeVariant.frameCount) return null;

        const key = `${this.activeVariant.id}_${frame}`;
        if (this.imageCache.has(key)) return this.imageCache.get(key)!;

        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = `${this.activeVariant.path}/index_${frame}.webp`;
        img.onload = () => {
            if (this.currentFrame === frame) this.render();
        };
        this.imageCache.set(key, img);
        return img;
    }

    private loadDepthMap(frame: number) {
        if (!this.activeVariant?.hasDepthMap) {
            console.log("[CoreEngine] activeVariant does not define hasDepthMap=true");
            return;
        }
        console.log(`[CoreEngine] Lazy requesting depth map for frame: ${frame}`);
        const img = this.getDepthImage(frame);
        // getDepthImage triggers the download map
    }

    private getDepthImage(frame: number): HTMLImageElement | null {
        if (!this.activeVariant?.hasDepthMap) return null;
        if (frame < 0 || frame >= this.activeVariant.frameCount) return null;

        const key = `${this.activeVariant.id}_depth_${frame}`;
        if (this.depthCache.has(key)) return this.depthCache.get(key)!;

        console.log(`[CoreEngine] Downloading: ${this.activeVariant.path}/index_${frame}_depth.webp`);
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = `${this.activeVariant.path}/index_${frame}_depth.webp`; // Matching user's request: frame_0_depth
        img.onload = () => {
            console.log(`[CoreEngine] Depth map loaded for frame: ${frame}`);
            if (this.currentFrame === frame) this.render();
        };
        img.onerror = (e) => {
            console.error(`[CoreEngine] Depth map failed to load for frame: ${frame}`, e);
        };
        this.depthCache.set(key, img);
        return img;
    }
}

import { CoreEngine } from './CoreEngine';
import { scroll, animate } from 'motion';
import { ProjectConfiguration } from './types';

export interface CoreOrchestratorOptions {
    scrub?: number;
}

/**
 * CORE ORCHESTRATOR
 * 
 * Bridges the DOM (React or Vanilla HTML) with the ScrollCraft CoreEngine.
 * Parses `data-scft-*` attributes, initializes the WebGL canvas,
 * and sets up `motion.dev` scroll synchronization.
 */
export class CoreOrchestrator {
    private container: HTMLElement;
    private options: CoreOrchestratorOptions;
    private engine: CoreEngine | null = null;
    private motionScrollCancel?: () => void;
    private syncedAnimations: any[] = [];
    private destroyed: boolean = false;

    // Callbacks for frameworks
    public onFrameChange?: (frame: number, scrubbedProgress: number) => void;

    constructor(container: HTMLElement, options: CoreOrchestratorOptions = {}) {
        this.container = container;
        this.options = { scrub: 0, ...options };
    }

    /**
     * Helper to auto-initialize all .scft-container elements on a page
     */
    public static async initAll(): Promise<CoreOrchestrator[]> {
        const containers = document.querySelectorAll('.scft-container');
        const instances: CoreOrchestrator[] = [];
        for (let i = 0; i < containers.length; i++) {
            const el = containers[i] as HTMLElement;
            // Support global defaults if needed, passing empty options for now
            const orchestrator = new CoreOrchestrator(el, { scrub: 0.5 }); 
            await orchestrator.init();
            instances.push(orchestrator);
        }
        return instances;
    }

    /**
     * Initializes the engine by scanning the container's DOM.
     */
    public async init(): Promise<void> {
        if (this.destroyed) return;

        // 1. Find Canvas and Project URL
        const canvasWrapper = this.container.querySelector('.scft-canvas') as HTMLElement;
        if (!canvasWrapper) {
            console.warn('[CoreOrchestrator] No .scft-canvas found inside container.');
            return;
        }

        const projectUrl = canvasWrapper.dataset.scftCanvas || canvasWrapper.getAttribute('data-project');
        if (!projectUrl) {
            console.warn('[CoreOrchestrator] No project URL found on .scft-canvas. Use data-scft-canvas="url"');
            return;
        }

        // 2. Load Configuration and Initialize Engine
        this.engine = await this.loadEngine(projectUrl, canvasWrapper);
        if (this.destroyed) return; // Prevent memory leaks if destroyed during fetch

        // 3. Parse Data-Driven Animations
        this.parseAnimatedElements();

        // 4. Hook Motion Scroll to the Container
        this.setupScrollTracking();

        // 5. Hook Engine Loop to drive Animations and Callbacks
        this.engine.onFrameChange = (frame, progress) => {
            if (this.onFrameChange) this.onFrameChange(frame, progress);
        };

        this.engine.onProgressUpdate = (progress) => {
            this.syncAnimations(progress);
        };
    }

    private async loadEngine(projectUrl: string, canvasWrapper: HTMLElement): Promise<CoreEngine> {
        let config: ProjectConfiguration;
        
        try {
            // Check if projectUrl is a JSON string vs a URL (future proofing for inline configs)
            if (projectUrl.trim().startsWith('{')) {
                config = JSON.parse(projectUrl);
            } else {
                const res = await fetch(projectUrl);
                if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
                config = await res.json();
            }
        } catch (e) {
            console.error('[CoreOrchestrator] Failed to load configuration:', e);
            throw e;
        }

        // Auto-detect base path if not present
        if (!config.settings) {
            config.settings = { baseResolution: { width: 1920, height: 1080 }, scrollMode: 'vh' };
        }
        if (!config.settings.basePath && !projectUrl.trim().startsWith('{')) {
            config.settings.basePath = projectUrl.substring(0, projectUrl.lastIndexOf('/'));
        }

        const engine = new CoreEngine(config, { scrub: this.options.scrub });

        // Ensure a canvas exists
        let canvas = canvasWrapper.querySelector('canvas');
        if (!canvas) {
            canvas = document.createElement('canvas');
            canvas.style.width = '100%';
            canvas.style.height = '100%';
            canvas.style.display = 'block';
            canvas.style.objectFit = 'cover';
            canvasWrapper.appendChild(canvas);
        }

        engine.attachCanvas(canvas);
        return engine;
    }

    private setupScrollTracking() {
        if (!this.engine) return;

        // Parse offset from container
        const rawOffset = this.container.dataset.scftOffset;
        let offset: any = ['start end', 'end start'];
        try {
            if (rawOffset) offset = JSON.parse(rawOffset);
        } catch(e) {
             // Fallback to defaults
        }

        this.motionScrollCancel = scroll(
            (progress: number) => {
                if (this.engine) {
                    this.engine.update(progress);
                }
            },
            {
                target: this.container,
                offset: offset
            }
        );
    }

    private parseAnimatedElements() {
        const animatedElements = this.container.querySelectorAll('[data-scft-animate]');
        
        animatedElements.forEach((el) => {
            try {
                const rawAnim = el.getAttribute('data-scft-animate');
                if (!rawAnim) return;

                const animConfig = JSON.parse(rawAnim);
                
                // Create a motion.dev animation instance
                // Instead of playing it, we immediately pause it
                const animation = animate(el, animConfig, {
                    duration: 1, // Normalized to 1 second so we can map progress 0-1 easily
                    ease: 'linear' // Must be linear, easing is handled by keyframes and engine scrub
                });
                
                animation.pause();
                animation.time = 0;
                
                this.syncedAnimations.push(animation);
            } catch (e) {
                console.warn('[CoreOrchestrator] Failed to parse data-scft-animate on element', el, e);
            }
        });
    }

    private syncAnimations(progress: number) {
        // Drive all paused animations based on the scrubbed engine progress
        // This ensures WebGL frames and DOM element animations are perfectly in sync
        for (const anim of this.syncedAnimations) {
            anim.time = progress;
        }
    }

    public getEngine(): CoreEngine | null {
        return this.engine;
    }

    public destroy() {
        this.destroyed = true;
        
        if (this.motionScrollCancel) {
            this.motionScrollCancel();
            this.motionScrollCancel = undefined;
        }

        for (const anim of this.syncedAnimations) {
            anim.stop();
        }
        this.syncedAnimations = [];

        if (this.engine) {
            this.engine.destroy();
            this.engine = null;
        }

        this.onFrameChange = undefined;
    }
}

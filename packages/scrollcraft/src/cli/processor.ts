import * as fs from 'fs-extra';
import * as path from 'path';
import sharp from 'sharp';
import { ProjectConfiguration, AssetVariant, SubjectFrameData } from '../core/types';

/**
 * LOCAL ASSET PROCESSOR
 * 
 * Handles cropping, resizing, and variant generation.
 */
export class AssetProcessor {
    private outDir: string;

    constructor(outDir: string) {
        this.outDir = outDir;
    }

    /**
     * GENERATE VARIANTS
     * 
     * Creates folders for Mobile, Tablet, Desktop with optimized images.
     */
    async processVariants(sourceFramesDir: string, trackingData: SubjectFrameData[], options: { step?: number, hasDepth?: boolean } = {}) {
        const step = options.step || 1;
        const allFiles = await fs.readdir(sourceFramesDir);
        // Ensure we only process regular frames for the main loop
        const allFrames = allFiles.filter(f => f.startsWith('frame_'));
        // Sort frames numerically to ensure consistent indexing (e.g. 1, 2, 10 instead of 1, 10, 2)
        allFrames.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

        const framesToProcess = allFrames.filter((_, i) => i % step === 0);
        const variants: AssetVariant[] = [];

        // Define our target variants
        const configs = [
            { id: 'mobile', width: 720, height: 1280, media: '(max-width: 600px)' },
            { id: 'desktop', width: 1920, height: 1080, media: '(min-width: 601px)' }
        ];

        for (const config of configs) {
            const variantDir = path.join(this.outDir, config.id);
            await fs.ensureDir(variantDir);

            console.log(`🎨 Generating ${config.id} variant (${config.width}x${config.height}) for ${framesToProcess.length} images...`);

            const variantTracking: SubjectFrameData[] = [];

            for (let i = 0; i < framesToProcess.length; i++) {
                const originalIndex = i * step;
                const frameName = framesToProcess[i];
                const framePath = path.join(sourceFramesDir, frameName);
                const targetPath = path.join(variantDir, `index_${i}.webp`);

                const subject = trackingData.find(f => f.frame === originalIndex) || { frame: originalIndex, x: 0.5, y: 0.5, scale: 0 };

                // SMART CROP: Center on the subject (x,y)
                // This logic would calculate the top/left based on subject relative position
                await sharp(framePath)
                    .resize(config.width, config.height, {
                        fit: 'cover',
                        position: this.subjectToSharpPosition(subject)
                    })
                    .webp({ quality: 80 })
                    .toFile(targetPath);

                if (options.hasDepth) {
                    const numStr = frameName.match(/(\d+)/)?.[1] || "";
                    // Look for a depth file that matches the same numeric index
                    const depthFrameName = allFiles.find(f => f.startsWith('depth_') && f.includes(numStr));
                    const depthFramePath = depthFrameName ? path.join(sourceFramesDir, depthFrameName) : '';

                    if (depthFramePath && fs.existsSync(depthFramePath)) {
                        const depthTargetPath = path.join(variantDir, `index_${i}_depth.webp`);
                        await sharp(depthFramePath)
                            .resize(config.width, config.height, {
                                fit: 'cover',
                                position: this.subjectToSharpPosition(subject)
                            })
                            // We grayscale and save as webp
                            .grayscale()
                            .webp({ quality: 80 })
                            .toFile(depthTargetPath);
                    }
                }

                // Add to variant tracking (using relative frame 0...N)
                variantTracking.push({
                    ...subject,
                    frame: i
                });
            }

            // Extract tracking data into its own file
            const trackingPath = path.join(variantDir, 'tracking-main.json');
            await fs.writeJson(trackingPath, variantTracking, { spaces: 2 });

            variants.push({
                id: config.id,
                media: config.media,
                path: `./${config.id}`, // Relative path in the final output
                aspectRatio: config.id === 'mobile' ? '9:16' : '16:9',
                frameCount: framesToProcess.length,
                hasDepthMap: options.hasDepth,
                subjects: ['main']
            });
        }

        return variants;
    }

    private subjectToSharpPosition(subject: SubjectFrameData) {
        // Map 0-1 to percentages for sharp
        const xPercent = Math.round(subject.x * 100);
        const yPercent = Math.round(subject.y * 100);

        // Return a string sharp understands or use its gravity system
        // For custom positioning, we'd need more complex math with .extract()
        return 'center'; // Placeholder for now
    }

    /**
     * SAVE PROJECT FILE
     */
    async saveConfig(variants: AssetVariant[]) {
        const config: ProjectConfiguration = {
            version: "2.0.1",
            settings: {
                fps: 30,
                baseResolution: { width: 1920, height: 1080 },
                scrollMode: 'vh'
            },
            assets: [{
                id: "main-sequence",
                strategy: "adaptive",
                variants: variants
            }],
            timeline: {
                totalDuration: "300vh",
                scenes: [{
                    id: "scene-1",
                    assetId: "main-sequence",
                    startProgress: 0,
                    duration: 1,
                    assetRange: [0, variants[0].frameCount - 1],
                    layers: []
                }]
            }
        };

        await fs.writeJson(path.join(this.outDir, 'scrollcraft.json'), config, { spaces: 2 });
        return config;
    }
}

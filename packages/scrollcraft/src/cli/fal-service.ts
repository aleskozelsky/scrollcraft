import { fal } from "@fal-ai/client";
import * as fs from 'fs-extra';
import * as path from 'path';
import 'dotenv/config';

/**
 * FAL.AI SERVICE
 * 
 * Handles all cloud-based AI processing for the asset pipeline.
 */
export class FalService {
    constructor() {
        if (!process.env.FAL_KEY) {
            throw new Error('FAL_KEY not found in environment. Please add it to your .env file.');
        }
    }

    /**
     * SUBJECT TRACKING (SAM 3)
     * 
     * Analyzes a video and returns frame-by-frame (x,y) coordinates of the subject.
     */
    async trackSubject(videoPathOrUrl: string, prompt: string = "main subject") {
        let videoUrl = videoPathOrUrl;

        // Auto-upload if the input is a local file
        if (fs.existsSync(videoPathOrUrl) && fs.statSync(videoPathOrUrl).isFile()) {
            videoUrl = await this.uploadFile(videoPathOrUrl);
        }

        console.log(`🤖 AI is tracking "${prompt}" in the video via SAM 3...`);

        const result: any = await fal.subscribe("fal-ai/sam-3/video-rle", {
            input: {
                video_url: videoUrl,
                prompt: prompt,
            },
            logs: true,
            onQueueUpdate: (update) => {
                if (update.status === "IN_PROGRESS") {
                    update.logs.forEach(l => console.log(`⏳ AI Tracking: ${l.message}`));
                }
            }
        });

        // SAM 3 Video RLE structure parsing
        const payload = result.data || result;
        const boxes = payload.boxes;

        if (!boxes || !Array.isArray(boxes) || boxes.length === 0) {
            throw new Error(`AI tracking returned no box data. Check if your FAL_KEY is active and the prompt "${prompt}" matches an object in the video.`);
        }

        console.log(`✅ AI identified tracking data for ${boxes.length} frames.`);

        return this.mapBoxesToTrackingData(boxes, payload);
    }

    /**
     * AUTO-UPLOAD HELPER
     * Uploads a local file to fal.ai temporary storage.
     */
    private async uploadFile(filePath: string): Promise<string> {
        console.log(`☁️  Uploading local file to AI Cloud: ${path.basename(filePath)}...`);
        const fileBuffer = await fs.readFile(filePath);

        const url = await fal.storage.upload(new Blob([fileBuffer]));
        console.log(`✅ Upload complete: ${url}`);
        return url;
    }

    /**
     * DEPTH MAP GENERATION (Video Depth Anything)
     * Creates a temporally consistent grayscale depth video.
     */
    async generateDepthMap(videoPathOrUrl: string) {
        let videoUrl = videoPathOrUrl;

        // Auto-upload if the input is a local file
        if (fs.existsSync(videoPathOrUrl) && fs.statSync(videoPathOrUrl).isFile()) {
            videoUrl = await this.uploadFile(videoPathOrUrl);
        }

        console.log(`🤖 AI is generating Depth Map Video using Video Depth Anything...`);

        const result: any = await fal.subscribe("fal-ai/video-depth-anything", {
            input: {
                video_url: videoUrl,
                model_size: "VDA-Base", // Small, Base, or Large. Base is a good balance.
            },
            logs: true,
            onQueueUpdate: (update) => {
                if (update.status === "IN_PROGRESS") {
                    update.logs.forEach(l => console.log(`⏳ AI Depth Map: ${l.message}`));
                }
            }
        });

        // Debug output to see what Fal is actually returning
        //await fs.writeFile('debug_fal.json', JSON.stringify(result, null, 2));

        const payload = result.data || result;
        if (!payload.video || !payload.video.url) {
            throw new Error(`AI Depth Map generation failed. No video URL returned. Saved response to debug_fal.json`);
        }

        console.log(`✅ Depth Map Video Generated: ${payload.video.url}`);
        return payload.video.url;
    }

    /**
     * IMAGE REFINEMENT (Upscale / BG Remove)
     */
    async refineImage(imageUrl: string, options: { upscale?: boolean, removeBg?: boolean }) {
        let currentUrl = imageUrl;

        if (options.removeBg) {
            const bgResult: any = await fal.subscribe("fal-ai/bria/background-removal", {
                input: { image_url: currentUrl }
            });
            currentUrl = bgResult.image.url;
        }

        if (options.upscale) {
            const upscaleResult: any = await fal.subscribe("fal-ai/esrgan", {
                input: { image_url: currentUrl, scale: 2 }
            });
            currentUrl = upscaleResult.image.url;
        }

        return currentUrl;
    }

    private mapBoxesToTrackingData(boxes: any[], payload: any = {}) {
        let lastKnown = { x: 0.5, y: 0.5, scale: 0 };
        let detectedCount = 0;

        const mapped = boxes.map((frameBoxes, i) => {
            // SAM-3 video-rle returns frames as [null, [cx,cy,w,h], [cx,cy,w,h], ...]
            // Or sometimes [[cx,cy,w,h]] if it's an array of objects

            if (frameBoxes && Array.isArray(frameBoxes)) {
                let box: number[] | null = null;

                // Case 1: frameBoxes is [cx, cy, w, h] directly
                if (typeof frameBoxes[0] === 'number' && frameBoxes.length >= 4) {
                    box = frameBoxes;
                }
                // Case 2: frameBoxes is [[cx, cy, w, h]]
                else if (Array.isArray(frameBoxes[0]) && frameBoxes[0].length >= 4) {
                    box = frameBoxes[0];
                }
                // Case 3: frameBoxes is [{box_2d: [...]}]
                else if (typeof frameBoxes[0] === 'object' && frameBoxes[0].box_2d) {
                    box = frameBoxes[0].box_2d;
                }

                if (box) {
                    lastKnown = {
                        x: box[0],
                        y: box[1],
                        scale: box[2] * box[3]
                    };
                    detectedCount++;
                }
            }

            return {
                frame: i,
                ...lastKnown
            };
        });

        if (detectedCount === 0) {
            console.warn('⚠️  AI found frames but NO objects were detected with the logic. All coordinates defaulted to 0.5.');
        } else {
            console.log(`🎯 Successfully extracted unique coordinates for ${detectedCount} frames.`);
        }

        return mapped;
    }
}

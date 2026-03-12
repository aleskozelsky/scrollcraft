#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import * as fs from 'fs-extra';
import * as path from 'path';
import { execSync } from 'child_process';
import ffmpegStatic from 'ffmpeg-static';
import { FalService } from './fal-service';
import { AssetProcessor } from './processor';

const pkg = require('../../package.json');

/**
 * Robust FFmpeg Detection
 * Prioritizes bundled static binary, then system PATH.
 */
function getFFmpegPath(): string | null {
  // 1. Try bundled ffmpeg-static
  if (ffmpegStatic) return ffmpegStatic;

  // 2. Try system PATH
  try {
    execSync('ffmpeg -version', { stdio: 'ignore' });
    return 'ffmpeg';
  } catch (e) {
    return null;
  }
}

const program = new Command();

program
  .name('scft')
  .description('ScrollCraft CLI - Immersive Web SDK')
  .version(pkg.version);

program
  .command('create')
  .description('ONE-STEP: Transform video/images into a responsive ScrollCraft')
  .argument('<input>', 'Path to input video or directory of images')
  .option('-o, --output <dir>', 'Output directory', './scrollcraft-project')
  .option('-p, --prompt <text>', 'Text prompt for subject tracking', 'main subject')
  .option('-s, --step <number>', 'Process every Nth frame (default: 1)', '1')
  .option('--cloud', 'Use Fal.ai for tracking and refinement', false)
  .option('--depth', 'Generate a 3D depth map for the displacement effect (Requires --cloud)', false)
  .action(async (input: string, opts: { output: string, prompt: string, cloud: boolean, step: string, depth: boolean }) => {
    console.log(chalk.bold.blue('\n🎞️  ScrollCraft Asset Pipeline\n'));

    // 0. PRE-FLIGHT CHECK
    const ffmpegPath = getFFmpegPath();
    if (!ffmpegPath) {
      console.error(chalk.red('\n❌ FFmpeg not found!'));
      console.log(chalk.yellow('This CLI requires FFmpeg to process videos.'));
      console.log('Please install it manually or ensure regular npm install was successful.');
      process.exit(1);
    }

    const outDir = path.resolve(opts.output);
    const tempDir = path.join(outDir, '.temp-frames');
    const step = parseInt(opts.step) || 1;

    try {
      await fs.ensureDir(outDir);
      await fs.ensureDir(tempDir);

      // 1. FRAME EXTRACTION
      if (fs.statSync(input).isFile()) {
        console.log(chalk.yellow(`📦 Extracting frames from video: ${input}`));
        // Extract 30 frames per second (matching our default)
        // Using the robust path discovered in pre-flight
        execSync(`"${ffmpegPath}" -i "${input}" -vf "fps=30" "${tempDir}/frame_%04d.png"`, { stdio: 'inherit' });
      } else {
        console.log(chalk.yellow(`📂 Using images from: ${input}`));

        if (opts.cloud || opts.depth) {
          console.error(chalk.red('\n❌ AI Cloud features (tracking/depth) currently require a video file as input.'));
          console.log(chalk.yellow('To use a directory of images, please use local mode (disable --cloud and --depth).'));
          process.exit(1);
        }

        const files = (await fs.readdir(input))
          .filter(f => /\.(png|jpg|jpeg|webp)$/i.test(f))
          .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

        if (files.length === 0) {
          throw new Error(`No compatible images (png, jpg, webp) found in ${input}`);
        }

        console.log(chalk.dim(`📦 Standardizing ${files.length} images...`));
        for (let i = 0; i < files.length; i++) {
          const ext = path.extname(files[i]);
          const frameName = `frame_${(i + 1).toString().padStart(4, '0')}${ext}`;
          await fs.copy(path.join(input, files[i]), path.join(tempDir, frameName));
        }
      }

      // 2. SUBJECT TRACKING & DEPTH MAP
      let trackingData = [];
      let hasDepth = false;

      if (opts.cloud) {
        const fal = new FalService();

        // Tracking
        trackingData = await fal.trackSubject(input, opts.prompt);

        // Depth Map
        if (opts.depth) {
          console.log(chalk.yellow(`\n🕳️  Generating Depth Map via AI...`));
          const depthUrl = await fal.generateDepthMap(input);
          console.log(chalk.yellow(`📥 Downloading Depth Map Video...`));
          const res = await fetch(depthUrl);
          const arrayBuffer = await res.arrayBuffer();
          const depthVideoPath = path.join(tempDir, 'depth_video.mp4');
          await fs.writeFile(depthVideoPath, Buffer.from(arrayBuffer));

          console.log(chalk.yellow(`📦 Extracting depth frames...`));
          execSync(`"${ffmpegPath}" -i "${depthVideoPath}" -vf "fps=30" "${tempDir}/depth_%04d.png"`, { stdio: 'inherit' });
          hasDepth = true;
        }
      } else {
        console.log(chalk.dim('ℹ️  Local tracking not yet implemented. Using center-pinned defaults.'));
        const frames = (await fs.readdir(tempDir)).filter(f => f.startsWith('frame_'));
        trackingData = frames.map((_, i) => ({ frame: i, x: 0.5, y: 0.5, scale: 0 }));
      }

      // 3. VARIANT GENERATION (Mobile/Desktop)
      const processor = new AssetProcessor(outDir);
      const variants = await processor.processVariants(tempDir, trackingData, { step, hasDepth });

      // 4. CLEANUP & SAVE
      await processor.saveConfig(variants);
      await fs.remove(tempDir);

      console.log(chalk.bold.green(`\n✅ Project Created Successfully!`));
      console.log(chalk.white(`📍 Output: ${outDir}`));
      console.log(chalk.white(`📜 Config: scrollcraft.json`));
      console.log(chalk.cyan(`\nNext: Import the .json into your <ScrollCraftProvider />\n`));

    } catch (err: any) {
      console.error(chalk.red(`\n❌ Error: ${err.message}`));
      process.exit(1);
    }
  });

program.parse(process.argv);

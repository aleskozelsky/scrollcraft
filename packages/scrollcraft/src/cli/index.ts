#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import * as fs from 'fs-extra';
import * as path from 'path';
import { execSync } from 'child_process';
import ffmpegStatic from 'ffmpeg-static';
import { FalService } from './fal-service';
import { AssetProcessor } from './processor';
import * as readline from 'readline';
import 'dotenv/config';

const pkg = require('../../package.json');

/**
 * VARIANT PRESETS & MEDIA QUERY BUILDER
 */
const DEVICE_PRESETS: Record<string, { width: number; height: number; threshold: number }> = {
  mobile:  { width: 720,  height: 1280, threshold: 600 },
  tablet:  { width: 1024, height: 1366, threshold: 1024 },
  laptop:  { width: 1440, height: 900,  threshold: 1440 },
  desktop: { width: 1920, height: 1080, threshold: 1920 },
  '4k':    { width: 3840, height: 2160, threshold: 99999 },
};

function buildVariantsFromIds(input: (string | number | any)[]): any[] {
  const result: any[] = [];
  const orientations: ('portrait' | 'landscape')[] = ['portrait', 'landscape'];

  // 1. Process each "Target" resolution
  input.forEach(item => {
    let res = 0;
    if (typeof item === 'number') res = item;
    else if (typeof item === 'string') res = parseInt(item);
    else if (item.height) res = item.height; // Assume height is the defining metric

    if (!res || isNaN(res)) return;

    orientations.forEach(orient => {
      const isPortrait = orient === 'portrait';
      const width = isPortrait ? res : Math.round(res * (16 / 9));
      const height = isPortrait ? Math.round(res * (16 / 9)) : res;
      
      result.push({
        id: `${res}p_${orient.substring(0, 1)}`,
        width,
        height,
        orientation: orient,
        aspectRatio: isPortrait ? '9:16' : '16:9',
        media: `(orientation: ${orient})` // Minimal fallback
      });
    });
  });

  // 2. Sort by height (ascending) so the engine finds the first one that fits
  return result.sort((a, b) => a.height - b.height);
}

/**
 * CONFIG LOADER
 * Looks for scrollcraft.config.js/ts in the current working directory.
 */
async function loadProjectConfig(): Promise<any> {
  const possiblePaths = [
    path.join(process.cwd(), 'scrollcraft.cli.config.js'),
    path.join(process.cwd(), 'scrollcraft.cli.config.cjs'),
    path.join(process.cwd(), 'scrollcraft.cli.config.ts')
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      try {
        // For simplicity in CLI we handle commonjs/esm basics
        // If it's TS, it might need jiti or ts-node, but let's assume JS for now
        // or use a simple dynamic import if supported.
        return require(p);
      } catch (e) {
        console.warn(chalk.yellow(`⚠️  Found config at ${p} but failed to load it. Skipping...`));
      }
    }
  }
  return null;
}

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

/**
 * Interactive Helper
 */
async function prompt(question: string, defaultValue?: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise(resolve => {
    rl.question(`${chalk.cyan('?')} ${question}${defaultValue ? ` (${defaultValue})` : ''}: `, (answer) => {
      rl.close();
      resolve(answer.trim() || defaultValue || '');
    });
  });
}

program
  .command('create')
  .description('ONE-STEP: Transform video/images into a responsive ScrollCraft')
  .argument('[input]', 'Path to input video or directory of images')
  .option('-o, --output <dir>', 'Output directory (deprecated, use --name)')
  .option('-p, --track <text>', 'Text prompt for subject tracking', 'main subject')
  .option('-n, --name <string>', 'Name of the project')
  .option('-v, --variants <string>', 'Comma-separated target resolutions (e.g. 720,1080)')
  .option('-s, --step <number>', 'Process every Nth frame (default: 1)', '1')
  .option('--cloud', 'Use Fal.ai for tracking and refinement', false)
  .option('--depth', 'Generate a 3D depth map for the displacement effect (Requires --cloud)', false)
  .action(async (inputArg: string | undefined, opts: { output?: string, track: string, cloud: boolean, step: string, depth: boolean, name?: string, variants?: string }) => {
    console.log(chalk.bold.blue('\n🎞️  ScrollCraft Asset Pipeline\n'));

    // 0. PRE-FLIGHT CHECK
    const ffmpegPath = getFFmpegPath();
    if (!ffmpegPath) {
      console.error(chalk.red('\n❌ FFmpeg not found!'));
      console.log(chalk.yellow('This CLI requires FFmpeg to process videos.'));
      console.log('Please install it manually or ensure regular npm install was successful.');
      process.exit(1);
    }

    const projectConfig = await loadProjectConfig();
    let input = inputArg;
    let track = opts.track;
    let projectName = opts.name;
    let useCloud = opts.cloud;
    let customVariants = projectConfig?.variants || (opts.variants ? buildVariantsFromIds(opts.variants.split(',')) : null);

    // 1. INPUT VALIDATION (Immediate)
    if (!input) {
      input = await prompt('Path to input video or directory of images');
    }

    if (!input || !fs.existsSync(input)) {
      console.error(chalk.red(`\n❌ Error: Input path "${input || ''}" does not exist.`));
      process.exit(1);
    }

    // 2. PROJECT NAME & SETTINGS
    if (!projectName) {
      projectName = await prompt('Project name', 'scrollcraft-project');
    }

    let step = parseInt(opts.step) || 1;
    if (!inputArg) {
      const stepInput = await prompt('Process every Nth frame (Step size)', '1');
      step = parseInt(stepInput) || 1;
    }

    // Interactive AI Decision
    if (!useCloud && !inputArg) {
      const aiChoice = await prompt('Use AI Cloud for tracking/depth? (requires FAL_KEY) [y/N]', 'n');
      useCloud = aiChoice.toLowerCase() === 'y';
    }

    // Interactive Variant Selection (if not in config)
    if (!customVariants && !inputArg) {
      console.log(chalk.cyan('\n📱 Resolution Targets:'));
      console.log(chalk.dim('Enter the base vertical/horizontal resolution (e.g. 720, 1080, 2160)'));
      console.log(chalk.dim('We will generate both Portrait (9:16) and Landscape (16:9) pairs.'));
      const selection = await prompt('Target Resolutions (comma separated)', '720, 1080');
      customVariants = buildVariantsFromIds(selection.split(','));
    } else if (customVariants && typeof customVariants[0] !== 'object') {
      // Handle simple numeric array in config: variants: [720, 1080]
      customVariants = buildVariantsFromIds(customVariants);
    }

    if (useCloud) {
      if (!process.env.FAL_KEY) {
        console.log(chalk.yellow('\n⚠️  FAL_KEY not found in environment.'));
        const key = await prompt('Please enter your Fal.ai API Key (or press enter if you will add it to .env)');
        if (key) process.env.FAL_KEY = key;
      }

      if (!opts.track || opts.track === 'main subject') {
        const customTrack = await prompt('What subject should we track?', 'main subject');
        track = customTrack;
      }
    }

    const outDir = path.resolve(opts.output || projectName!);
    const tempDir = path.join(outDir, '.temp-frames');

    try {
      await fs.ensureDir(outDir);
      await fs.ensureDir(tempDir);

      // 1. FRAME EXTRACTION
      if (fs.statSync(input).isFile()) {
        console.log(chalk.yellow(`📦 Extracting frames from video: ${input}`));
        // Default extraction: ALL frames
        execSync(`"${ffmpegPath}" -i "${input}" "${tempDir}/frame_%04d.png"`, { stdio: 'inherit' });

        // COPY SOURCE MEDIA
        console.log(chalk.dim(`📂 Keeping source media...`));
        await fs.copy(input, path.join(outDir, 'source_video.mp4'));
      } else {
        console.log(chalk.yellow(`📂 Using images from: ${input}`));

        if (useCloud || opts.depth) {
          console.error(chalk.red('\n❌ AI Cloud features (tracking/depth) currently require a video file as input.'));
          console.log(chalk.yellow('To use a directory of images, please use local mode (disable AI during prompts or don\'t use --cloud).'));
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

      if (useCloud) {
        const fal = new FalService();

        // Tracking
        trackingData = await fal.trackSubject(input, track);

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
          execSync(`"${ffmpegPath}" -i "${depthVideoPath}" "${tempDir}/depth_%04d.png"`, { stdio: 'inherit' });
          hasDepth = true;
        }
      } else {
        console.log(chalk.dim('ℹ️  Local tracking not yet implemented. Using center-pinned defaults.'));
        const frames = (await fs.readdir(tempDir)).filter(f => f.startsWith('frame_'));
        trackingData = frames.map((_, i) => ({ frame: i, x: 0.5, y: 0.5, scale: 0 }));
      }

      // 3. VARIANT GENERATION (Mobile/Desktop)
      const processor = new AssetProcessor(outDir);
      const variants = await processor.processVariants(tempDir, trackingData, { step, hasDepth, variants: customVariants });

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

// NEW UPDATE COMMAND
program
  .command('update')
  .description('Rerun extraction and tracking on an existing project')
  .argument('<dir>', 'Project directory')
  .option('-p, --track <text>', 'Additional subject to track')
  .action(async (dir: string, opts: { track?: string }) => {
    console.log(chalk.bold.yellow('\n♻️  ScrollCraft Update Pipeline\n'));
    const projectPath = path.resolve(dir);
    const configPath = path.join(projectPath, 'scrollcraft.json');

    if (!fs.existsSync(configPath)) {
      console.error(chalk.red('❌ Not a valid ScrollCraft project directory (missing scrollcraft.json).'));
      process.exit(1);
    }

    const config = await fs.readJson(configPath);
    if (config.version !== pkg.version) {
      console.warn(chalk.yellow(`⚠️  Version Mismatch: Project is ${config.version}, CLI is ${pkg.version}`));
      // In a real implementation, we might offer to upgrade or handle incompatibilities
    }

    console.log(chalk.dim('Skeletal update implemented. Continuing in next iteration...'));
  });

program.parse(process.argv);

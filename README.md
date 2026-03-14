# ScrollCraft 

**Transform media into interactive web experiences.**

ScrollCraft is a modern animation SDK built for the era of high-performance, agent-driven development. It allows you to transform standard video or images into web assets that precisely track subjects and depth.

---

## Installation

```bash
npm install scrollcraft
```

---

## Quick Start

Initialize your project:

```bash
# 1. Transform your video into a ScrollCraft project
# This will extract frames, track the subject, and generate optimized variants and depth maps using cloud AI processing.
npx scft create "your-video.mp4" --name "my-project" --track "apple" --cloud --depth
```

```tsx
// 2. Drop it into your Next.js app
import project from './my-project/scrollcraft.json';
import { ScrollCraftProvider, ScrollCraftCanvas, SubjectLayer } from 'scrollcraft';

const App = () => (
  <ScrollCraftProvider 
    project={project} 
    scrub={0.1} // Smooth interpolation (0 = instant, 1 = heavy lag)
  >
    <div style={{ height: '400vh' }}>
      <ScrollCraftCanvas />
      
      {/* Automatically follows the 'apple' tracked in the CLI */}
      <SubjectLayer id="main">
         <h2>Pinned Element</h2>
      </SubjectLayer>
    </div>
  </ScrollCraftProvider>
);
```

---

## Documentation & Guides

Choose your path based on your role:

### 👤 For Humans
- [**Core Architecture**](https://github.com/aleskozelsky/scrollcraft/blob/main/packages/docs/app/docs/architecture/page.md): Understand the state-snapshot engine.
- [**Asset Pipeline**](https://github.com/aleskozelsky/scrollcraft/blob/main/packages/docs/app/docs/asset-pipeline/page.md): Learn how to use the CLI and AI tracking.
- [**React Hooks**](https://github.com/aleskozelsky/scrollcraft/blob/main/packages/docs/app/docs/react-integration/page.md): Build custom interactive components.

### 🤖 For AI Agents
- [**AGENTS.md**](https://github.com/aleskozelsky/scrollcraft/blob/main/AGENTS.md): Technical standard operating procedures for the repository.
- [**AI Integration Protocol**](https://github.com/aleskozelsky/scrollcraft/blob/main/packages/docs/app/docs/ai-integration/page.md): How to prompt agents to build scenes for you.

---

## Performance & Tech
- **WebGL Accelerated**: High-FPS rendering even for 4K sequences.
- **AI Subject Tracking**: Automatic (x,y) pinning via SAM 3.
- **Mouse-Interactive Parallax**: Automatic 3D depth map generation and rendering.
- **Object-Fit Support**: Responsive "Cover" and "Contain" logic built into the shader.

---


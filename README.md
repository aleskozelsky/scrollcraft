# 🎞️ ScrollCraft 2.0

**Transform cinematic motion into interactive web experiences.**

ScrollCraft 2.0 is a modern animation SDK built for the era of high-performance, agent-driven development. It allows you to transform standard video or image sequences into "Intelligent Assets" that precisely track subjects and depth.

---

## 🚀 Quick Start

```bash
# 1. Transform your video into an intelligent asset sequence
npx scft create "examples/sample-media/jabko.mp4" --cloud --depth --prompt "apple" 

# this command will output a folder named scrollcraft-project 
```

```tsx
// 2. Drop it into your React app
import project from './scrollcraft-project/scrollcraft.json';
import { ScrollCraftProvider, ScrollCraftCanvas, SubjectLayer } from 'scrollcraft';

const App = () => (
  <ScrollCraftProvider project={project}>
    <ScrollCraftCanvas />
    <SubjectLayer offset={{ x: 10, y: -5 }}>
       <h2>Pin UI to moving objects.</h2>
    </SubjectLayer>
  </ScrollCraftProvider>
);
```

---

## 📖 Documentation & Guides

Choose your path based on your role:

### 👤 For Humans
- [**Core Architecture**](https://github.com/aleskozelsky/scrollcraft/blob/main/packages/docs/architecture.md): Understand the state-snapshot engine.
- [**Asset Pipeline**](https://github.com/aleskozelsky/scrollcraft/blob/main/packages/docs/asset-pipeline.md): Learn how to use the CLI and AI tracking.
- [**React Hooks**](https://github.com/aleskozelsky/scrollcraft/blob/main/packages/docs/react-integration.md): Build custom interactive components.

### 🤖 For AI Agents
- [**AGENTS.md**](https://github.com/aleskozelsky/scrollcraft/blob/main/AGENTS.md): Technical standard operating procedures for the repository.
- [**AI Integration Protocol**](https://github.com/aleskozelsky/scrollcraft/blob/main/packages/docs/ai-integration.md): How to prompt agents to build scenes for you.

---

## 🛠️ Performance & Tech
- **WebGL Accelerated**: High-FPS rendering even for 4K sequences.
- **AI Subject Tracking**: Automatic (x,y) pinning via SAM 3.
- **Mouse-Interactive Parallax**: Automatic 3D depth map generation and rendering.
- **Object-Fit Support**: Responsive "Cover" and "Contain" logic built into the shader.

---


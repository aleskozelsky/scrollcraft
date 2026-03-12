# React Integration

The ScrollCraft 2.0 React library is a thin, high-performance wrapper around the Core Engine.

## 1. The Provider Pattern

Everything starts with the `ScrollCraftProvider`. It initializes the engine and provides a reactive context for all child components.

```tsx
import { ScrollCraftProvider } from 'scrollcraft/react';
import projectConfig from './my-project.json';

function App() {
  return (
    <ScrollCraftProvider project={projectConfig}>
      {/* 
          The actual canvas that renders the sequence.
          Can be placed anywhere inside the provider.
      */}
      <ScrollCraftCanvas 
        style={{ width: '100%', height: '100vh', objectFit: 'cover' }} 
      />
      
      <MyContent />
    </ScrollCraftProvider>
  );
}
```

---

## 2. The `<ScrollCraftCanvas />`

In v2.0, the rendering engine is decoupled from the provider. You must include a `<ScrollCraftCanvas />` to see your images.

### Key Props:
- **`style`**: Standard React styles. Use `objectFit: 'cover'` to ensure the sequence behaves like a background.
- **`assetId`**: (Optional) Specify which asset from the JSON to render. Defaults to the first one.
- **`depthEnabled`**: (Optional) Boolean. If true (and if depth maps exist in the assets), enables the mouse-parallax displacement effect.

---

## 3. Using the `<SubjectLayer />`

The `<SubjectLayer>` is the primary way to add content that "sticks" to the product in your sequence.

```tsx
import { SubjectLayer } from 'scrollcraft/react';

<SubjectLayer offset={{ x: 15, y: -10 }}>
  <div className="callout">
    <h4>4K Ultra Wide</h4>
    <p>Captured at 120fps.</p>
  </div>
</SubjectLayer>
```

### Key Props:
- **`offset`**: `{ x: number, y: number }`. Positioning relative to the **Subject Center**. This is measured in viewport percentage units (0-100).
- **`zIndex`**: Control the depth of the layer.

---

## 4. The `useScrollCraft` Hook

For custom components, you can hook directly into the engine's state.

```tsx
import { useScrollCraft } from 'scrollcraft/react';

const MyCustomStats = () => {
  const { progress, frame, subjectCoords } = useScrollCraft();

  return (
    <div style={{ opacity: progress }}>
      Current Frame: {frame}
    </div>
  );
};
```

---

## 5. Context Properties
- `progress`: Number (0 to 1). The global scroll position.
- `frame`: Number. The current frame index of the active scene.
- `subjectCoords`: `{ x: number, y: number }`. The current normalized (0-1) position of the subject on the screen.

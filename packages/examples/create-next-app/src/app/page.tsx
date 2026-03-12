"use client";

import { ScrollCraftProvider, ScrollCraftCanvas, SubjectLayer, useScrollCraft } from 'scrollcraft/react';

const AppleInfo = () => {
  const { progress, frame } = useScrollCraft();
  const opacity = progress > 0.2 && progress < 0.5 ? 1 : 0;

  return (
    <div style={{
      position: 'fixed',
      top: '20%',
      left: '10%',
      color: 'white',
      transition: 'opacity 0.5s',
      opacity,
      zIndex: 20
    }}>
      <h2 style={{ fontSize: '3rem', margin: 0 }}>Fresh Red Apple</h2>
      <p style={{ opacity: 0.7 }}>Tracked with SAM-3 • Frame {frame}</p>
    </div>
  );
};

export default function Home() {

  return (
    <main style={{ background: '#8b2222ff', paddingBottom: '100vh' }}>

      {/* Intro section */}
      <section style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
        <h1>Welcome to ScrollCraft 2.0</h1>
        <p style={{ position: 'absolute', bottom: '10vh' }}>↓ SCROLL TO EXPLORE</p>
      </section>

      {/* The Scroll Sequence */}
      <ScrollCraftProvider
        project="/scrollcraft-project-apple/scrollcraft.json"
        containerHeight="400vh"
        canvasHeight="100vh"
        offset={["start end", "end start"]} // motion.dev tracking offsets
      >
        <div style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
          <ScrollCraftCanvas />
        </div>

        <SubjectLayer id="main" offset={{ x: 0, y: 0 }}>
          <div style={{
            padding: '12px 24px',
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(12px)',
            borderRadius: '30px',
            border: '1px solid rgba(255,255,255,0.2)',
            color: 'white',
            fontWeight: 'bold',
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
            pointerEvents: 'none',
            whiteSpace: 'nowrap'
          }}>
            🍎 Apple Lens Target
          </div>
        </SubjectLayer>

        <AppleInfo />

      </ScrollCraftProvider>

      {/* Outro section */}
      <section style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
        <h2>End of sequence</h2>
      </section>

    </main>
  );
}

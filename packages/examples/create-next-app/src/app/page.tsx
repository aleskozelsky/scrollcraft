"use client";

import { ScrollCraftProvider, ScrollCraftCanvas, SubjectLayer, useScrollCraft } from 'scrollcraft/react';
import { ProjectConfiguration } from 'scrollcraft/core';
import sampleConfigData from '../../public/scft-project-apple/scrollcraft.json';

const sampleConfig = sampleConfigData as unknown as ProjectConfiguration; // to avoid typescript errors

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
    <main style={{ height: '400vh', background: '#8b2222ff' }}>

      <ScrollCraftProvider project={sampleConfig}>

        <div style={{ position: 'fixed', inset: 0, zIndex: 1 }}>
          <ScrollCraftCanvas
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}

          />
        </div>


        <SubjectLayer offset={{ x: 0, y: -0 }}>
          <div style={{
            padding: '12px 24px',
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(12px)',
            borderRadius: '30px',
            border: '1px solid rgba(255,255,255,0.2)',
            color: 'white',
            fontWeight: 'bold',
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
            pointerEvents: 'none'
          }}>
            🍎 Apple Lens x
          </div>
        </SubjectLayer>

        <AppleInfo />


        <div style={{
          position: 'absolute',
          top: '90vh',
          width: '100%',
          textAlign: 'center',
          color: 'white',
          opacity: 0.5,
          zIndex: 10
        }}>
          ↓ SCROLL TO EXPLORE
        </div>

      </ScrollCraftProvider>
    </main>
  );
}

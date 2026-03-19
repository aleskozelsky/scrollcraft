"use client";

import { ScrollCraftProvider, ScrollCraftCanvas, ScrollCraftLayer, ScrollCraftLayerTracking, useScrollCraft } from 'scrollcraft/react';

const AppleInfo = () => {
    const { progress, frame } = useScrollCraft();
    const opacity = progress > 0.2 && progress < 0.5 ? 1 : 0;

    return (
        <>
            <h2 style={{ fontSize: '3rem', margin: 0 }}>Fresh Red Apple</h2>
            <p style={{ opacity: 0.7 }}>Tracked with SAM-3 • Frame {frame}</p>
        </>
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
                type="sticky" // sticky (in the future we will have also "fixed" or "flow")
                containerHeight="400vh"
                //? containerWidth="100%"? unsure if this would work inside a flexbox
                sceneHeight="100vh" // sticky element height (the height of the "scene" which has the layers and which sticks to the screen while scrolling)
                offset={["start end", "end start"]} // motion.dev tracking offsets
                scrub={0.5} // 0 = instant, 1 = 1 second delay before it catches up with scroll
            >
                {/* Only Layers, or Tracked Layers can be children of the provider, it needs to throw error or type error, or warning when others are being added as child */}
                <ScrollCraftLayer
                    // normal layer, not tracked, 
                    align="center-center" // top-left, top-center, top-right, center-left, center-center, center-right, bottom-left, bottom-center, bottom-right (flex container?)
                >
                    <ScrollCraftCanvas
                        width="100%"
                        height="100%"
                        project="/hack4/scrollcraft.json" // moved here because it holds information about the media files that are rendered on the canvas
                    // assetId="main-sequence" // (optional?)
                    />
                </ScrollCraftLayer>

                <ScrollCraftLayerTracking id="main" offset={{ x: 0, y: 0 }}>
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
                </ScrollCraftLayerTracking>

                <ScrollCraftLayer
                    align="bottom-left"
                >
                    <AppleInfo />
                </ScrollCraftLayer>


            </ScrollCraftProvider>

            {/* Outro section */}
            <section style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                <h2>End of sequence</h2>
            </section>

        </main>
    );
}

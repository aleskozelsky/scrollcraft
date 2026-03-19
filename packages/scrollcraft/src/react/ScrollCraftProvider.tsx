import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { CoreEngine, CoreOrchestrator } from '../core';

interface SCFTContext {
    progress: number;
    frame: number;
    engine: CoreEngine | null;
}

const ScrollCraftContext = createContext<SCFTContext | null>(null);

export interface ScrollCraftProviderProps {
    type?: string; 
    containerHeight?: string;
    sceneHeight?: string; // instead of canvasHeight
    offset?: any;
    scrub?: number;
    children: React.ReactNode;
}

export const ScrollCraftProvider: React.FC<ScrollCraftProviderProps> = ({
    type = 'sticky',
    containerHeight = '400vh',
    sceneHeight = '100vh',
    offset = ['start end', 'end start'],
    scrub = 0,
    children
}) => {
    const [state, setState] = useState<Omit<SCFTContext, 'engine'>>({ progress: 0, frame: -1 });
    const [engineReady, setEngineReady] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const orchestratorRef = useRef<CoreOrchestrator | null>(null);
    const offsetStr = JSON.stringify(offset);

    useEffect(() => {
        let isMounted = true;

        if (!containerRef.current) return;

        const init = async () => {
            const orchestrator = new CoreOrchestrator(containerRef.current!, { scrub });
            orchestratorRef.current = orchestrator;

            // Hook React State to the Orchestrator's unified callback
            orchestrator.onFrameChange = (frame, progress) => {
                if (isMounted) setState({ frame, progress });
            };

            await orchestrator.init();

            if (isMounted) setEngineReady(true);
        };

        const timeoutId = setTimeout(() => {
            // Slight delay ensures children nodes & DOM are fully mounted before Orchestrator queries them
            init();
        }, 0);

        return () => {
            isMounted = false;
            clearTimeout(timeoutId);
            if (orchestratorRef.current) {
                orchestratorRef.current.destroy();
                orchestratorRef.current = null;
            }
        };
    }, []); // Re-init on unmount only. Changes to scrub/offset requires new DOM node in WP block logic anyways

    return (
        <ScrollCraftContext.Provider value={{ ...state, engine: orchestratorRef.current?.getEngine() || null }}>
            <div 
                ref={containerRef} 
                className="scft-container" 
                style={{ position: 'relative', height: containerHeight }}
                data-scft-offset={offsetStr}
            >
                <div className="scft-container_inner_sticky" style={{ position: 'sticky', top: 0, height: sceneHeight, overflow: 'hidden' }}>
                    {children}
                </div>
            </div>
        </ScrollCraftContext.Provider>
    );
};

export const ScrollCraftCanvas: React.FC<{ project: string; width?: string; height?: string; style?: React.CSSProperties }> = ({ project, width = '100%', height = '100%', style }) => {
    return (
        <div 
            className="scft-canvas"
            data-scft-canvas={project}
            style={{ width, height, ...style }}
        >
             {/* CoreOrchestrator will inject the actual <canvas> here */}
        </div>
    );
};

export const ScrollCraftLayer: React.FC<{ align?: string; style?: React.CSSProperties; children: React.ReactNode }> = ({ align, style, children }) => {
    // If user passed `align` mapping (backwards compatibility for React users), apply flex properties:
    let flexStyle: React.CSSProperties = {};
    if (align) {
        const [y, x] = align.split('-');
        flexStyle = {
            display: 'flex',
            position: 'absolute',
            inset: 0,
            justifyContent: x === 'center' ? 'center' : (x === 'right' ? 'flex-end' : 'flex-start'),
            alignItems: y === 'center' ? 'center' : (y === 'bottom' ? 'flex-end' : 'flex-start'),
            pointerEvents: 'none' // Let clicks pass down unless explicitly caught
        };
    } else {
        flexStyle = { position: 'absolute', inset: 0, pointerEvents: 'none' };
    }

    return (
        <div className="scft-layer" style={{ ...flexStyle, ...style }}>
            <div style={{ pointerEvents: 'auto' }}>
                {children}
            </div>
        </div>
    );
}

export const ScrollCraftLayerTracking: React.FC<{ id?: string; offset?: { x: number; y: number }; style?: React.CSSProperties; children: React.ReactNode }> = ({ id = 'main', offset = { x: 0, y: 0 }, style, children }) => {
    const context = useContext(ScrollCraftContext);
    const [coords, setCoords] = useState({ x: 0.5, y: 0.5 });

    // React still fetches coords dynamically, but wrapping it so DOM structure matches Vanilla HTML
    useEffect(() => {
        if (context?.engine && context.frame >= 0) {
            context.engine.loadTrackingData(id).then(() => {
                const { x, y } = context.engine!.getTrackedCoords(id, context.frame);
                setCoords({ x, y });
            });
        }
    }, [context?.engine, context?.frame, id]);

    if (!context || context.frame === -1) return null;

    const baseStyle: React.CSSProperties = {
        position: 'absolute',
        left: `${(coords.x * 100) + offset.x}%`,
        top: `${(coords.y * 100) + offset.y}%`,
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'auto',
        zIndex: 10,
        transition: 'left 0.5s linear, top 0.5s linear',
        ...style
    };

    return (
        <div className="scft-layer-tracking" data-scft-layer-tracking={id} style={baseStyle}>
            {children}
        </div>
    );
};

// Aliased for backwards compatibility with earlier snippets
export const SubjectLayer = ScrollCraftLayerTracking;

export const useScrollCraft = () => {
    const context = useContext(ScrollCraftContext);
    if (!context) throw new Error('useScrollCraft must be used within a ScrollCraftProvider');
    return context;
};

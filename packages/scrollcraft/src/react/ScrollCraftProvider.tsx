import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { CoreEngine } from '../core/CoreEngine';
import { ProjectConfiguration } from '../core/types';
import { scroll } from 'motion';

interface SCFTContext {
    progress: number;
    frame: number;
    engine: CoreEngine | null;
}

const ScrollCraftContext = createContext<SCFTContext | null>(null);

export interface ScrollCraftProviderProps {
    project: ProjectConfiguration | string;
    children: React.ReactNode;
    containerHeight?: string; 
    canvasHeight?: string;
    offset?: any; // e.g. ["start end", "end start"]
}

export const ScrollCraftProvider: React.FC<ScrollCraftProviderProps> = ({ 
    project, 
    children,
    containerHeight = '400vh',
    canvasHeight = '100vh',
    offset = ['start end', 'end start']
}) => {
    const [state, setState] = useState<Omit<SCFTContext, 'engine'>>({ progress: 0, frame: -1 });
    const [engineReady, setEngineReady] = useState(false);
    const engineRef = useRef<CoreEngine | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Initialize Engine
    useEffect(() => {
        let isMounted = true;
        let activeEngine: CoreEngine;

        const initEngine = async () => {
            if (typeof project === 'string') {
                const res = await fetch(project);
                const config = await res.json();
                const basePath = project.substring(0, project.lastIndexOf('/'));
                if (!config.settings) config.settings = { fps: 30, baseResolution: { width: 1920, height: 1080 }, scrollMode: 'vh' };
                config.settings.basePath = config.settings.basePath || basePath;
                activeEngine = new CoreEngine(config);
            } else {
                activeEngine = new CoreEngine(project);
            }

            if (!isMounted) {
                activeEngine.destroy();
                return;
            }

            activeEngine.onFrameChange = (frame, progress) => {
                setState({ frame, progress });
            };

            engineRef.current = activeEngine;
            setEngineReady(true);
        };

        setEngineReady(false);
        initEngine();

        return () => {
            isMounted = false;
            if (engineRef.current) {
                engineRef.current.destroy();
                engineRef.current = null;
            }
        };
    }, [project]);

    // Setup Motion Scroll integration
    useEffect(() => {
        if (!engineReady || !containerRef.current || !engineRef.current) return;
        
        const controls = scroll(
            (progress: number) => {
                if (engineRef.current) {
                    engineRef.current.update(progress);
                }
            },
            {
                target: containerRef.current,
                offset: offset
            }
        );

        return () => {
            controls();
        };
    }, [engineReady, offset]); // wait for engine to be ready

    return (
        <ScrollCraftContext.Provider value={{ ...state, engine: engineRef.current }}>
            <div ref={containerRef} className="scft-container" style={{ position: 'relative', height: containerHeight }}>
                <div style={{ position: 'sticky', top: 0, height: canvasHeight, overflow: 'hidden' }}>
                    {children}
                </div>
            </div>
        </ScrollCraftContext.Provider>
    );
};

export const ScrollCraftCanvas: React.FC<{ style?: React.CSSProperties }> = ({ style }) => {
    const context = useContext(ScrollCraftContext);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (canvasRef.current && context?.engine) {
            context.engine.attachCanvas(canvasRef.current);
        }
    }, [context?.engine]);

    return (
        <canvas
            ref={canvasRef}
            style={{
                width: '100%',
                height: '100%',
                display: 'block',
                objectFit: 'cover',
                ...style
            }}
        />
    );
};

export const SubjectLayer: React.FC<{ id?: string; offset?: { x: number; y: number }; children: React.ReactNode }> = ({ id = 'main', offset = { x: 0, y: 0 }, children }) => {
    const context = useContext(ScrollCraftContext);
    const [coords, setCoords] = useState({ x: 0.5, y: 0.5 });
    
    useEffect(() => {
        if (context?.engine && context.frame >= 0) {
            context.engine.loadTrackingData(id).then(() => {
                const { x, y } = context.engine!.getTrackedCoords(id, context.frame);
                setCoords({ x, y });
            });
        }
    }, [context?.engine, context?.frame, id]);

    if (!context || context.frame === -1) return null;

    const style: React.CSSProperties = {
        position: 'absolute', // Absolute to the sticky container
        left: `${(coords.x * 100) + offset.x}%`,
        top: `${(coords.y * 100) + offset.y}%`,
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'auto',
        zIndex: 10,
        transition: 'left 0.05s linear, top 0.05s linear' // Sub-frame smoothing
    };

    return <div style={style}>{children}</div>;
};

export const useScrollCraft = () => {
    const context = useContext(ScrollCraftContext);
    if (!context) throw new Error('useScrollCraft must be used within a ScrollCraftProvider');
    return context;
};

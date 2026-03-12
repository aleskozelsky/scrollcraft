import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { CoreEngine } from '../core/CoreEngine';
import { ProjectConfiguration } from '../core/types';

interface SCFTContext {
    progress: number;
    frame: number;
    subjectCoords: { x: number; y: number };
    engine: CoreEngine | null;
}

const ScrollCraftContext = createContext<SCFTContext | null>(null);

export const ScrollCraftProvider: React.FC<{ project: ProjectConfiguration; children: React.ReactNode }> = ({ project, children }) => {
    const [state, setState] = useState<Omit<SCFTContext, 'engine'>>({ progress: 0, frame: -1, subjectCoords: { x: 0.5, y: 0.5 } });
    const engineRef = useRef<CoreEngine | null>(null);

    useEffect(() => {
        const engine = new CoreEngine(project);
        engineRef.current = engine;

        const handleScroll = () => {
            const scrollPos = window.scrollY;
            const maxScroll = document.body.scrollHeight - window.innerHeight;
            const progress = maxScroll <= 0 ? 0 : Math.max(0, Math.min(1, scrollPos / maxScroll));

            const update = engine.update(progress);
            if (update) {
                setState({
                    progress,
                    frame: update.frame,
                    subjectCoords: update.subjectCoords
                });
            }
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        // Initial sync
        setTimeout(handleScroll, 100); // Small delay to ensure DOM is ready

        return () => window.removeEventListener('scroll', handleScroll);
    }, [project]);

    return (
        <ScrollCraftContext.Provider value={{ ...state, engine: engineRef.current }}>
            <div className="scft-wrapper" style={{ position: 'relative' }}>
                {children}
            </div>
        </ScrollCraftContext.Provider>
    );
};

export const ScrollCraftCanvas: React.FC<{ assetId?: string; style?: React.CSSProperties }> = ({ style }) => {
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
                ...style
            }}
        />
    );
};

export const SubjectLayer: React.FC<{ offset?: { x: number; y: number }; children: React.ReactNode }> = ({ offset = { x: 0, y: 0 }, children }) => {
    const context = useContext(ScrollCraftContext);
    if (!context || context.frame === -1) return null;

    const style: React.CSSProperties = {
        position: 'fixed', // Stay sticky with the canvas
        left: `${(context.subjectCoords.x * 100) + offset.x}%`,
        top: `${(context.subjectCoords.y * 100) + offset.y}%`,
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'auto',
        zIndex: 10,
        transition: 'left 0.1s linear, top 0.1s linear'
    };

    return <div style={style}>{children}</div>;
};

export const useScrollCraft = () => {
    const context = useContext(ScrollCraftContext);
    if (!context) throw new Error('useScrollCraft must be used within a ScrollCraftProvider');
    return context;
};

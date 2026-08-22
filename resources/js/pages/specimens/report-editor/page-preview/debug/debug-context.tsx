import React, { createContext, useContext, useState } from 'react';

export type DebugLayerKey =
    | 'showMaster'
    | 'showMargins'
    | 'showRulers'
    | 'showBlockBounds'
    | 'showSubElements'
    | 'showPageGauges'
    | 'compactMode';

export interface DebugReportContextValue {
    isEnvDebugReportEnabled: boolean;
    showMaster: boolean;
    showMargins: boolean;
    showRulers: boolean;
    showBlockBounds: boolean;
    showSubElements: boolean;
    showPageGauges: boolean;
    compactMode: boolean;
    selectedBlockId: string | null;
    hoveredBlockId: string | null;
    setShowMaster: (val: boolean) => void;
    setSelectedBlockId: (id: string | null) => void;
    setHoveredBlockId: (id: string | null) => void;
    toggleLayer: (layer: DebugLayerKey) => void;
    resetDefaults: () => void;
}

const DebugReportContext = createContext<DebugReportContextValue | null>(null);

const STORAGE_KEY_PREFIX = 'patolab_debug_report_';

export function isDebugReportEnvActive(
    pagePropsDebugReport?: boolean,
): boolean {
    if (pagePropsDebugReport === true) {
        return true;
    }

    // Check Vite / import.meta.env
    const envVal = (import.meta as any).env?.DEBUG_REPORT;
    const viteEnvVal = (import.meta as any).env?.VITE_DEBUG_REPORT;

    if (envVal === 'true' || envVal === true || envVal === '1') {
        return true;
    }

    if (viteEnvVal === 'true' || viteEnvVal === true || viteEnvVal === '1') {
        return true;
    }

    // Check sessionStorage override
    if (typeof window !== 'undefined') {
        const sessionVal = window.sessionStorage.getItem('DEBUG_REPORT_ACTIVE');

        if (sessionVal === 'true') {
            return true;
        }
    }

    return false;
}

export function DebugReportProvider({
    children,
    pagePropsDebugReport,
}: {
    children: React.ReactNode;
    pagePropsDebugReport?: boolean;
}) {
    const isEnvDebugReportEnabled =
        isDebugReportEnvActive(pagePropsDebugReport);

    const getStored = (key: string, defVal: boolean): boolean => {
        if (typeof window === 'undefined') {
            return defVal;
        }

        const item = window.localStorage.getItem(STORAGE_KEY_PREFIX + key);

        return item !== null ? item === 'true' : defVal;
    };

    const [showMaster, setShowMasterState] = useState<boolean>(() =>
        getStored('showMaster', true),
    );
    const [showMargins, setShowMargins] = useState<boolean>(() =>
        getStored('showMargins', true),
    );
    const [showRulers, setShowRulers] = useState<boolean>(() =>
        getStored('showRulers', true),
    );
    const [showBlockBounds, setShowBlockBounds] = useState<boolean>(() =>
        getStored('showBlockBounds', true),
    );
    const [showSubElements, setShowSubElements] = useState<boolean>(() =>
        getStored('showSubElements', true),
    );
    const [showPageGauges, setShowPageGauges] = useState<boolean>(() =>
        getStored('showPageGauges', true),
    );
    const [compactMode, setCompactMode] = useState<boolean>(() =>
        getStored('compactMode', false),
    );

    const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
    const [hoveredBlockId, setHoveredBlockId] = useState<string | null>(null);

    const savePref = (key: string, val: boolean) => {
        if (typeof window !== 'undefined') {
            window.localStorage.setItem(STORAGE_KEY_PREFIX + key, String(val));
        }
    };

    const setShowMaster = (val: boolean) => {
        setShowMasterState(val);
        savePref('showMaster', val);
    };

    const toggleLayer = (layer: DebugLayerKey) => {
        switch (layer) {
            case 'showMaster':
                setShowMasterState((prev) => {
                    const next = !prev;
                    savePref('showMaster', next);

                    return next;
                });
                break;
            case 'showMargins':
                setShowMargins((prev) => {
                    const next = !prev;
                    savePref('showMargins', next);

                    return next;
                });
                break;
            case 'showRulers':
                setShowRulers((prev) => {
                    const next = !prev;
                    savePref('showRulers', next);

                    return next;
                });
                break;
            case 'showBlockBounds':
                setShowBlockBounds((prev) => {
                    const next = !prev;
                    savePref('showBlockBounds', next);

                    return next;
                });
                break;
            case 'showSubElements':
                setShowSubElements((prev) => {
                    const next = !prev;
                    savePref('showSubElements', next);

                    return next;
                });
                break;
            case 'showPageGauges':
                setShowPageGauges((prev) => {
                    const next = !prev;
                    savePref('showPageGauges', next);

                    return next;
                });
                break;
            case 'compactMode':
                setCompactMode((prev) => {
                    const next = !prev;
                    savePref('compactMode', next);

                    return next;
                });
                break;
        }
    };

    const resetDefaults = () => {
        setShowMaster(true);
        setShowMargins(true);
        setShowRulers(true);
        setShowBlockBounds(true);
        setShowSubElements(true);
        setShowPageGauges(true);
        setCompactMode(false);

        if (typeof window !== 'undefined') {
            [
                'showMaster',
                'showMargins',
                'showRulers',
                'showBlockBounds',
                'showSubElements',
                'showPageGauges',
                'compactMode',
            ].forEach((k) =>
                window.localStorage.removeItem(STORAGE_KEY_PREFIX + k),
            );
        }
    };

    return (
        <DebugReportContext.Provider
            value={{
                isEnvDebugReportEnabled,
                showMaster,
                showMargins,
                showRulers,
                showBlockBounds,
                showSubElements,
                showPageGauges,
                compactMode,
                selectedBlockId,
                hoveredBlockId,
                setShowMaster,
                setSelectedBlockId,
                setHoveredBlockId,
                toggleLayer,
                resetDefaults,
            }}
        >
            {children}
        </DebugReportContext.Provider>
    );
}

export function useDebugReport(): DebugReportContextValue {
    const ctx = useContext(DebugReportContext);

    if (!ctx) {
        return {
            isEnvDebugReportEnabled: false,
            showMaster: false,
            showMargins: false,
            showRulers: false,
            showBlockBounds: false,
            showSubElements: false,
            showPageGauges: false,
            compactMode: false,
            selectedBlockId: null,
            hoveredBlockId: null,
            setShowMaster: () => {},
            setSelectedBlockId: () => {},
            setHoveredBlockId: () => {},
            toggleLayer: () => {},
            resetDefaults: () => {},
        };
    }

    return ctx;
}

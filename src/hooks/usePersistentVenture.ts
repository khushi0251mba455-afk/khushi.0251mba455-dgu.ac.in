import { useCallback, useEffect, useState } from 'react';
import { VENTURE_BANK } from '../data/ventures';
import { StudioView, Venture } from '../types/venture';

const STORAGE_KEY = 'nexus_venture_studio_selected_venture_id';
const VIEW_STORAGE_KEY = 'nexus_venture_studio_active_view';

function readStoredVentureId(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return null;
    }
    const exists = VENTURE_BANK.some((venture) => venture.id === stored);
    return exists ? stored : null;
  } catch {
    return null;
  }
}

function readStoredView(hasSelectedVenture: boolean): StudioView {
  if (!hasSelectedVenture || typeof window === 'undefined') {
    return 'bank';
  }
  try {
    const stored = window.localStorage.getItem(VIEW_STORAGE_KEY);
    return stored === 'competition-lab' ? 'competition-lab' : 'bank';
  } catch {
    return 'bank';
  }
}

export function usePersistentVenture() {
  const [selectedVentureId, setSelectedVentureId] = useState<string | null>(() =>
    readStoredVentureId()
  );
  const [activeView, setActiveViewState] = useState<StudioView>(() =>
    readStoredView(readStoredVentureId() !== null)
  );

  const setActiveView = useCallback((view: StudioView) => {
    setActiveViewState(view);
    try {
      window.localStorage.setItem(VIEW_STORAGE_KEY, view);
    } catch {
      // Ignore storage write errors
    }
  }, []);

  const selectVenture = useCallback((ventureId: string) => {
    const exists = VENTURE_BANK.some((venture) => venture.id === ventureId);
    if (!exists) {
      return;
    }
    setSelectedVentureId(ventureId);
    try {
      window.localStorage.setItem(STORAGE_KEY, ventureId);
    } catch {
      // Ignore storage write errors in restricted browsing contexts
    }
  }, []);

  const clearVenture = useCallback(() => {
    setSelectedVentureId(null);
    setActiveView('bank');
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore storage removal errors in restricted browsing contexts
    }
  }, [setActiveView]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) {
        const nextId = readStoredVentureId();
        setSelectedVentureId(nextId);
        if (!nextId) {
          setActiveViewState('bank');
        }
      } else if (event.key === VIEW_STORAGE_KEY) {
        setActiveViewState(readStoredView(readStoredVentureId() !== null));
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const selectedVenture: Venture | null =
    VENTURE_BANK.find((venture) => venture.id === selectedVentureId) ?? null;

  return {
    selectedVenture,
    selectedVentureId,
    activeView: selectedVenture ? activeView : 'bank',
    setActiveView,
    selectVenture,
    clearVenture,
  };
}

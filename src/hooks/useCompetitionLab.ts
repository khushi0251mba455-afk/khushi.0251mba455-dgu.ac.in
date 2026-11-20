import { useCallback, useEffect, useState } from 'react';
import {
  AlternativeType,
  CompetitorAlternative,
  EvidenceQuality,
  EvidenceSourceType,
} from '../types/venture';

const STORAGE_KEY = 'nexus_venture_studio_competition_lab_v1';

export const MIN_ALTERNATIVES = 3;
export const MAX_ALTERNATIVES = 6;

export const ALTERNATIVE_TYPES: AlternativeType[] = [
  'Direct Competitor',
  'Indirect Competitor',
  'Substitute',
  'Do Nothing',
];

export const EVIDENCE_SOURCE_TYPES: EvidenceSourceType[] = [
  'Website URL',
  'Product Page',
  'Menu / Price Page',
  'App Listing',
  'Review Source',
  'Observation Note',
  'Other Relevant Evidence',
];

export const EVIDENCE_QUALITY_OPTIONS: {
  value: EvidenceQuality;
  label: string;
  description: string;
}[] = [
  {
    value: 'Strong',
    label: 'Strong',
    description: 'directly supported by a reliable current source',
  },
  {
    value: 'Moderate',
    label: 'Moderate',
    description: 'supported, but the evidence is indirect or incomplete',
  },
  {
    value: 'Weak',
    label: 'Weak',
    description:
      'assumption, informal observation or evidence that still needs validation',
  },
];

export function createBlankAlternative(index: number): CompetitorAlternative {
  return {
    id: `alt-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`,
    name: '',
    type: '',
    priceCost: '',
    priceNotApplicable: false,
    mainOffer: '',
    mainStrength: '',
    mainWeakness: '',
    evidenceSourceType: '',
    evidenceSource: '',
    evidenceQuality: '',
  };
}

function createInitialAlternatives(): CompetitorAlternative[] {
  return [
    createBlankAlternative(1),
    createBlankAlternative(2),
    createBlankAlternative(3),
  ];
}

type LabStorageMap = Record<string, CompetitorAlternative[]>;

function sanitizeAlternative(raw: Partial<CompetitorAlternative>, idx: number): CompetitorAlternative {
  return {
    id: typeof raw.id === 'string' && raw.id ? raw.id : `alt-restored-${idx}`,
    name: typeof raw.name === 'string' ? raw.name : '',
    type: ALTERNATIVE_TYPES.includes(raw.type as AlternativeType)
      ? (raw.type as AlternativeType)
      : '',
    priceCost: typeof raw.priceCost === 'string' ? raw.priceCost : '',
    priceNotApplicable: Boolean(raw.priceNotApplicable),
    mainOffer: typeof raw.mainOffer === 'string' ? raw.mainOffer : '',
    mainStrength: typeof raw.mainStrength === 'string' ? raw.mainStrength : '',
    mainWeakness: typeof raw.mainWeakness === 'string' ? raw.mainWeakness : '',
    evidenceSourceType: EVIDENCE_SOURCE_TYPES.includes(
      raw.evidenceSourceType as EvidenceSourceType
    )
      ? (raw.evidenceSourceType as EvidenceSourceType)
      : '',
    evidenceSource: typeof raw.evidenceSource === 'string' ? raw.evidenceSource : '',
    evidenceQuality:
      raw.evidenceQuality === 'Strong' ||
      raw.evidenceQuality === 'Moderate' ||
      raw.evidenceQuality === 'Weak'
        ? raw.evidenceQuality
        : '',
  };
}

function readLabStorage(): LabStorageMap {
  if (typeof window === 'undefined') {
    return {};
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }
    const map: LabStorageMap = {};
    for (const [ventureId, list] of Object.entries(parsed)) {
      if (Array.isArray(list) && list.length > 0) {
        const normalized = list
          .slice(0, MAX_ALTERNATIVES)
          .map((item, idx) => sanitizeAlternative(item as Partial<CompetitorAlternative>, idx));
        while (normalized.length < MIN_ALTERNATIVES) {
          normalized.push(createBlankAlternative(normalized.length + 1));
        }
        map[ventureId] = normalized;
      }
    }
    return map;
  } catch {
    return {};
  }
}

function writeLabStorage(map: LabStorageMap) {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // Ignore storage write errors in restricted browsing contexts
  }
}

export function isAlternativeCompleted(alt: CompetitorAlternative): boolean {
  return (
    alt.name.trim().length > 0 &&
    alt.type !== '' &&
    alt.mainOffer.trim().length > 0 &&
    alt.mainStrength.trim().length > 0 &&
    alt.mainWeakness.trim().length > 0 &&
    alt.evidenceSource.trim().length > 0 &&
    alt.evidenceQuality !== ''
  );
}

export function hasAnyAlternativeEntry(alt: CompetitorAlternative): boolean {
  return (
    alt.name.trim().length > 0 ||
    alt.type !== '' ||
    alt.priceCost.trim().length > 0 ||
    alt.priceNotApplicable ||
    alt.mainOffer.trim().length > 0 ||
    alt.mainStrength.trim().length > 0 ||
    alt.mainWeakness.trim().length > 0 ||
    alt.evidenceSourceType !== '' ||
    alt.evidenceSource.trim().length > 0 ||
    alt.evidenceQuality !== ''
  );
}

export interface CompetitorMatrixSummary {
  alternativesResearched: number;
  directCompetitors: number;
  indirectCompetitors: number;
  substitutes: number;
  doNothingAlternatives: number;
  overallEvidenceQuality: EvidenceQuality | null;
  qualityBreakdown: {
    strong: number;
    moderate: number;
    weak: number;
  };
}

export function computeCompetitorMatrixSummary(
  alternatives: CompetitorAlternative[]
): CompetitorMatrixSummary {
  const completed = alternatives.filter(isAlternativeCompleted);

  let directCompetitors = 0;
  let indirectCompetitors = 0;
  let substitutes = 0;
  let doNothingAlternatives = 0;
  let strong = 0;
  let moderate = 0;
  let weak = 0;

  for (const alt of completed) {
    if (alt.type === 'Direct Competitor') directCompetitors += 1;
    else if (alt.type === 'Indirect Competitor') indirectCompetitors += 1;
    else if (alt.type === 'Substitute') substitutes += 1;
    else if (alt.type === 'Do Nothing') doNothingAlternatives += 1;

    if (alt.evidenceQuality === 'Strong') strong += 1;
    else if (alt.evidenceQuality === 'Moderate') moderate += 1;
    else if (alt.evidenceQuality === 'Weak') weak += 1;
  }

  let overallEvidenceQuality: EvidenceQuality | null = null;
  if (completed.length > 0) {
    const score = (strong * 3 + moderate * 2 + weak * 1) / completed.length;
    if (score >= 2.5) {
      overallEvidenceQuality = 'Strong';
    } else if (score >= 1.67) {
      overallEvidenceQuality = 'Moderate';
    } else {
      overallEvidenceQuality = 'Weak';
    }
  }

  return {
    alternativesResearched: completed.length,
    directCompetitors,
    indirectCompetitors,
    substitutes,
    doNothingAlternatives,
    overallEvidenceQuality,
    qualityBreakdown: { strong, moderate, weak },
  };
}

export function useCompetitionLab(ventureId: string | null) {
  const [labMap, setLabMap] = useState<LabStorageMap>(() => readLabStorage());

  const alternatives: CompetitorAlternative[] = ventureId
    ? labMap[ventureId] ?? createInitialAlternatives()
    : [];

  const updateVentureAlternatives = useCallback(
    (
      updater: (current: CompetitorAlternative[]) => CompetitorAlternative[]
    ) => {
      if (!ventureId) return;
      setLabMap((prev) => {
        const current = prev[ventureId] ?? createInitialAlternatives();
        const nextList = updater(current);
        const nextMap = { ...prev, [ventureId]: nextList };
        writeLabStorage(nextMap);
        return nextMap;
      });
    },
    [ventureId]
  );

  const updateAlternative = useCallback(
    (
      alternativeId: string,
      patch: Partial<Omit<CompetitorAlternative, 'id'>>
    ) => {
      updateVentureAlternatives((current) =>
        current.map((item) =>
          item.id === alternativeId ? { ...item, ...patch } : item
        )
      );
    },
    [updateVentureAlternatives]
  );

  const addAlternative = useCallback(() => {
    updateVentureAlternatives((current) => {
      if (current.length >= MAX_ALTERNATIVES) {
        return current;
      }
      return [...current, createBlankAlternative(current.length + 1)];
    });
  }, [updateVentureAlternatives]);

  const removeAlternative = useCallback(
    (alternativeId: string) => {
      updateVentureAlternatives((current) => {
        if (current.length <= MIN_ALTERNATIVES) {
          return current;
        }
        return current.filter((item) => item.id !== alternativeId);
      });
    },
    [updateVentureAlternatives]
  );

  const clearAlternative = useCallback(
    (alternativeId: string) => {
      updateVentureAlternatives((current) =>
        current.map((item, idx) =>
          item.id === alternativeId
            ? { ...createBlankAlternative(idx + 1), id: item.id }
            : item
        )
      );
    },
    [updateVentureAlternatives]
  );

  const hasSavedResearchForVenture = useCallback(
    (targetVentureId: string | null): boolean => {
      if (!targetVentureId) return false;
      const list = labMap[targetVentureId];
      if (!list) return false;
      return list.some(hasAnyAlternativeEntry);
    },
    [labMap]
  );

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) {
        setLabMap(readLabStorage());
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  return {
    alternatives,
    updateAlternative,
    addAlternative,
    removeAlternative,
    clearAlternative,
    hasSavedResearchForVenture,
  };
}

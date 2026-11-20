import { useCallback, useEffect, useState } from 'react';
import {
  CompetitorAlternative,
  MarketBattlefieldState,
  PositioningAxes,
  PositioningScore,
} from '../types/venture';

const STORAGE_KEY = 'nexus_venture_studio_market_battlefield_v1';

export const EXAMPLE_AXES_LIST = [
  {
    dimension: 'Price / Cost',
    anchors: 'Low Price → High Price',
  },
  {
    dimension: 'Customization / Personalization',
    anchors: 'Low Customization → High Customization',
  },
  {
    dimension: 'Convenience',
    anchors: 'Low Convenience → High Convenience',
  },
  {
    dimension: 'Specialization',
    anchors: 'Generic → Specialized',
  },
  {
    dimension: 'Service Level',
    anchors: 'Basic Service → High Service',
  },
  {
    dimension: 'Technology',
    anchors: 'Low Technology → High Technology',
  },
];

export function createBlankAxes(): PositioningAxes {
  return {
    xName: '',
    xLeftLabel: '',
    xRightLabel: '',
    yName: '',
    yBottomLabel: '',
    yTopLabel: '',
  };
}

export function createBlankScore(): PositioningScore {
  return { x: null, y: null };
}

function createInitialBattlefieldState(): MarketBattlefieldState {
  return {
    axes: createBlankAxes(),
    ventureScore: createBlankScore(),
    alternativeScores: {},
  };
}

function sanitizeScoreValue(val: unknown): number | null {
  if (typeof val !== 'number' || !Number.isFinite(val)) {
    return null;
  }
  const rounded = Math.round(val);
  if (rounded < 1 || rounded > 10) {
    return null;
  }
  return rounded;
}

function sanitizeScore(raw: unknown): PositioningScore {
  if (!raw || typeof raw !== 'object') {
    return createBlankScore();
  }
  const obj = raw as Partial<PositioningScore>;
  return {
    x: sanitizeScoreValue(obj.x),
    y: sanitizeScoreValue(obj.y),
  };
}

function sanitizeState(raw: unknown): MarketBattlefieldState {
  if (!raw || typeof raw !== 'object') {
    return createInitialBattlefieldState();
  }
  const obj = raw as Partial<MarketBattlefieldState>;
  const rawAxes = (obj.axes ?? {}) as Partial<PositioningAxes>;
  const rawAltScores = (obj.alternativeScores ?? {}) as Record<string, unknown>;

  const alternativeScores: Record<string, PositioningScore> = {};
  for (const [id, score] of Object.entries(rawAltScores)) {
    alternativeScores[id] = sanitizeScore(score);
  }

  return {
    axes: {
      xName: typeof rawAxes.xName === 'string' ? rawAxes.xName : '',
      xLeftLabel:
        typeof rawAxes.xLeftLabel === 'string' ? rawAxes.xLeftLabel : '',
      xRightLabel:
        typeof rawAxes.xRightLabel === 'string' ? rawAxes.xRightLabel : '',
      yName: typeof rawAxes.yName === 'string' ? rawAxes.yName : '',
      yBottomLabel:
        typeof rawAxes.yBottomLabel === 'string' ? rawAxes.yBottomLabel : '',
      yTopLabel: typeof rawAxes.yTopLabel === 'string' ? rawAxes.yTopLabel : '',
    },
    ventureScore: sanitizeScore(obj.ventureScore),
    alternativeScores,
  };
}

type BattlefieldStorageMap = Record<string, MarketBattlefieldState>;

function readStorage(): BattlefieldStorageMap {
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
    const result: BattlefieldStorageMap = {};
    for (const [ventureId, state] of Object.entries(parsed)) {
      result[ventureId] = sanitizeState(state);
    }
    return result;
  } catch {
    return {};
  }
}

function writeStorage(map: BattlefieldStorageMap) {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // Ignore storage write errors
  }
}

export function areAxesDefined(axes: PositioningAxes): boolean {
  return (
    axes.xName.trim().length > 0 &&
    axes.xLeftLabel.trim().length > 0 &&
    axes.xRightLabel.trim().length > 0 &&
    axes.yName.trim().length > 0 &&
    axes.yBottomLabel.trim().length > 0 &&
    axes.yTopLabel.trim().length > 0
  );
}

export function isScoreComplete(score: PositioningScore | undefined): boolean {
  return (
    Boolean(score) &&
    typeof score?.x === 'number' &&
    score.x >= 1 &&
    score.x <= 10 &&
    typeof score?.y === 'number' &&
    score.y >= 1 &&
    score.y <= 10
  );
}

export interface PlottedPoint {
  id: string;
  name: string;
  type: string;
  isVenture: boolean;
  x: number;
  y: number;
}

export interface BattlefieldInterpretation {
  closestAlternatives: {
    name: string;
    type: string;
    x: number;
    y: number;
    distance: number;
  }[];
  clusters: {
    members: string[];
    quadrantLabel: string;
  }[];
  differentiation: {
    status: 'Differentiated' | 'Moderately Differentiated' | 'Close Overlap';
    summary: string;
  };
  lessCrowdedAreas: {
    quadrantLabel: string;
    count: number;
  }[];
}

function getQuadrantLabel(x: number, y: number, axes: PositioningAxes): string {
  const xAnchor =
    x >= 5.5 ? axes.xRightLabel.trim() : axes.xLeftLabel.trim();
  const yAnchor =
    y >= 5.5 ? axes.yTopLabel.trim() : axes.yBottomLabel.trim();
  return `${xAnchor} · ${yAnchor}`;
}

function euclideanDistance(
  a: { x: number; y: number },
  b: { x: number; y: number }
): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function computeBattlefieldInterpretation(
  axes: PositioningAxes,
  ventureName: string,
  ventureScore: PositioningScore,
  scoredAlternatives: PlottedPoint[]
): BattlefieldInterpretation | null {
  if (
    !areAxesDefined(axes) ||
    !isScoreComplete(ventureScore) ||
    scoredAlternatives.length === 0
  ) {
    return null;
  }

  const vx = ventureScore.x as number;
  const vy = ventureScore.y as number;

  const distances = scoredAlternatives.map((alt) => ({
    alt,
    distance: euclideanDistance({ x: vx, y: vy }, { x: alt.x, y: alt.y }),
  }));
  distances.sort((a, b) => a.distance - b.distance);

  const minDistance = distances[0].distance;
  const closestAlternatives = distances
    .filter((entry) => Math.abs(entry.distance - minDistance) < 0.001)
    .map((entry) => ({
      name: entry.alt.name,
      type: entry.alt.type,
      x: entry.alt.x,
      y: entry.alt.y,
      distance: Number(entry.distance.toFixed(2)),
    }));

  // Cluster detection via connected components within distance <= 2.5 units on 1-10 grid
  const CLUSTER_THRESHOLD = 2.5;
  const visited = new Set<string>();
  const clusters: { members: string[]; quadrantLabel: string }[] = [];

  for (let i = 0; i < scoredAlternatives.length; i += 1) {
    const start = scoredAlternatives[i];
    if (visited.has(start.id)) continue;

    const queue = [start];
    const component: PlottedPoint[] = [];
    visited.add(start.id);

    while (queue.length > 0) {
      const curr = queue.shift()!;
      component.push(curr);
      for (const candidate of scoredAlternatives) {
        if (visited.has(candidate.id)) continue;
        if (euclideanDistance(curr, candidate) <= CLUSTER_THRESHOLD) {
          visited.add(candidate.id);
          queue.push(candidate);
        }
      }
    }

    if (component.length >= 2) {
      const avgX =
        component.reduce((sum, item) => sum + item.x, 0) / component.length;
      const avgY =
        component.reduce((sum, item) => sum + item.y, 0) / component.length;
      clusters.push({
        members: component.map((item) => item.name),
        quadrantLabel: getQuadrantLabel(avgX, avgY, axes),
      });
    }
  }

  // Differentiation assessment based purely on venture distance & quadrant separation
  const ventureQuadrant = getQuadrantLabel(vx, vy, axes);
  const sameQuadrantAlts = scoredAlternatives.filter(
    (alt) => getQuadrantLabel(alt.x, alt.y, axes) === ventureQuadrant
  );

  let differentiationStatus:
    | 'Differentiated'
    | 'Moderately Differentiated'
    | 'Close Overlap';
  let differentiationSummary: string;

  const roundedMinDist = Number(minDistance.toFixed(2));
  const nearestNames = closestAlternatives.map((c) => c.name).join(' and ');

  if (minDistance >= 3 || (sameQuadrantAlts.length === 0 && minDistance >= 2.2)) {
    differentiationStatus = 'Differentiated';
    differentiationSummary = `${ventureName} is separated by ${roundedMinDist} units from the closest alternative (${nearestNames}) and sits ${
      sameQuadrantAlts.length === 0
        ? `alone in the ${ventureQuadrant} quadrant.`
        : `in the ${ventureQuadrant} quadrant.`
    }`;
  } else if (minDistance >= 1.5) {
    differentiationStatus = 'Moderately Differentiated';
    differentiationSummary = `${ventureName} sits ${roundedMinDist} units from ${nearestNames}${
      sameQuadrantAlts.length > 0
        ? ` and shares the ${ventureQuadrant} quadrant with ${sameQuadrantAlts.length} ${
            sameQuadrantAlts.length === 1 ? 'alternative' : 'alternatives'
          }.`
        : `, while occupying the ${ventureQuadrant} quadrant.`
    }`;
  } else {
    differentiationStatus = 'Close Overlap';
    differentiationSummary = `${ventureName} sits within ${roundedMinDist} units of ${nearestNames} in the ${ventureQuadrant} quadrant, indicating direct positioning overlap.`;
  }

  // Evaluate all 4 quadrants using user's actual axis anchors
  const allPoints: { x: number; y: number }[] = [
    { x: vx, y: vy },
    ...scoredAlternatives.map((a) => ({ x: a.x, y: a.y })),
  ];

  const quadrants = [
    {
      label: `${axes.xLeftLabel.trim()} · ${axes.yTopLabel.trim()}`,
      match: (p: { x: number; y: number }) => p.x < 5.5 && p.y >= 5.5,
    },
    {
      label: `${axes.xRightLabel.trim()} · ${axes.yTopLabel.trim()}`,
      match: (p: { x: number; y: number }) => p.x >= 5.5 && p.y >= 5.5,
    },
    {
      label: `${axes.xLeftLabel.trim()} · ${axes.yBottomLabel.trim()}`,
      match: (p: { x: number; y: number }) => p.x < 5.5 && p.y < 5.5,
    },
    {
      label: `${axes.xRightLabel.trim()} · ${axes.yBottomLabel.trim()}`,
      match: (p: { x: number; y: number }) => p.x >= 5.5 && p.y < 5.5,
    },
  ].map((q) => ({
    quadrantLabel: q.label,
    count: allPoints.filter(q.match).length,
  }));

  const emptyQuadrants = quadrants.filter((q) => q.count === 0);
  const minQuadCount = Math.min(...quadrants.map((q) => q.count));
  const lessCrowdedAreas =
    emptyQuadrants.length > 0
      ? emptyQuadrants
      : quadrants.filter((q) => q.count === minQuadCount);

  return {
    closestAlternatives,
    clusters,
    differentiation: {
      status: differentiationStatus,
      summary: differentiationSummary,
    },
    lessCrowdedAreas,
  };
}

export function isMarketBattlefieldComplete(
  state: MarketBattlefieldState,
  completedAlternatives: CompetitorAlternative[]
): boolean {
  if (!areAxesDefined(state.axes)) return false;
  if (!isScoreComplete(state.ventureScore)) return false;
  if (completedAlternatives.length < 3) return false;
  return completedAlternatives.every((alt) =>
    isScoreComplete(state.alternativeScores[alt.id])
  );
}

export function useMarketBattlefield(ventureId: string | null) {
  const [storageMap, setStorageMap] = useState<BattlefieldStorageMap>(() =>
    readStorage()
  );

  const state: MarketBattlefieldState = ventureId
    ? storageMap[ventureId] ?? createInitialBattlefieldState()
    : createInitialBattlefieldState();

  const updateState = useCallback(
    (updater: (current: MarketBattlefieldState) => MarketBattlefieldState) => {
      if (!ventureId) return;
      setStorageMap((prev) => {
        const current = prev[ventureId] ?? createInitialBattlefieldState();
        const next = updater(current);
        const nextMap = { ...prev, [ventureId]: next };
        writeStorage(nextMap);
        return nextMap;
      });
    },
    [ventureId]
  );

  const updateAxes = useCallback(
    (patch: Partial<PositioningAxes>) => {
      updateState((current) => ({
        ...current,
        axes: { ...current.axes, ...patch },
      }));
    },
    [updateState]
  );

  const updateVentureScore = useCallback(
    (patch: Partial<PositioningScore>) => {
      updateState((current) => ({
        ...current,
        ventureScore: { ...current.ventureScore, ...patch },
      }));
    },
    [updateState]
  );

  const updateAlternativeScore = useCallback(
    (alternativeId: string, patch: Partial<PositioningScore>) => {
      updateState((current) => {
        const existing =
          current.alternativeScores[alternativeId] ?? createBlankScore();
        return {
          ...current,
          alternativeScores: {
            ...current.alternativeScores,
            [alternativeId]: { ...existing, ...patch },
          },
        };
      });
    },
    [updateState]
  );

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) {
        setStorageMap(readStorage());
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  return {
    axes: state.axes,
    ventureScore: state.ventureScore,
    alternativeScores: state.alternativeScores,
    state,
    updateAxes,
    updateVentureScore,
    updateAlternativeScore,
  };
}

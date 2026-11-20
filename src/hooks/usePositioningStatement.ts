import { useCallback, useEffect, useState } from 'react';
import {
  CompetitorAlternative,
  MarketBattlefieldState,
  PositioningCheckItem,
  PositioningStatementState,
  Venture,
} from '../types/venture';

const STORAGE_KEY = 'nexus_venture_studio_positioning_statement_v1';

const STOP_WORDS = new Set([
  'the',
  'and',
  'for',
  'with',
  'that',
  'this',
  'from',
  'your',
  'their',
  'they',
  'have',
  'more',
  'than',
  'into',
  'only',
  'very',
  'also',
  'when',
  'what',
  'where',
  'which',
  'will',
  'can',
  'are',
  'our',
  'because',
  'unlike',
  'provides',
  'offer',
  'offers',
  'using',
  'based',
  'through',
  'without',
]);

function extractKeywords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length >= 3 && !STOP_WORDS.has(word));
}

function countKeywordOverlap(source: string, reference: string): number {
  const srcWords = extractKeywords(source);
  const refWords = new Set(extractKeywords(reference));
  if (srcWords.length === 0 || refWords.size === 0) return 0;

  let hits = 0;
  for (const word of srcWords) {
    if (refWords.has(word)) {
      hits += 1;
      continue;
    }
    for (const ref of refWords) {
      if (
        word.length >= 4 &&
        ref.length >= 4 &&
        (word.startsWith(ref.slice(0, 4)) || ref.startsWith(word.slice(0, 4)))
      ) {
        hits += 1;
        break;
      }
    }
  }
  return hits;
}

export function createInitialStatementState(
  ventureTargetCustomer: string
): PositioningStatementState {
  return {
    targetCustomer: ventureTargetCustomer,
    category: '',
    primaryBenefit: '',
    mainAlternativeId: '',
    reasonToBelieve: '',
    manualStatement: null,
    savedStatement: null,
    savedAt: null,
  };
}

function sanitizeStatementState(
  raw: unknown,
  fallbackTargetCustomer: string
): PositioningStatementState {
  if (!raw || typeof raw !== 'object') {
    return createInitialStatementState(fallbackTargetCustomer);
  }
  const obj = raw as Partial<PositioningStatementState>;
  return {
    targetCustomer:
      typeof obj.targetCustomer === 'string'
        ? obj.targetCustomer
        : fallbackTargetCustomer,
    category: typeof obj.category === 'string' ? obj.category : '',
    primaryBenefit:
      typeof obj.primaryBenefit === 'string' ? obj.primaryBenefit : '',
    mainAlternativeId:
      typeof obj.mainAlternativeId === 'string' ? obj.mainAlternativeId : '',
    reasonToBelieve:
      typeof obj.reasonToBelieve === 'string' ? obj.reasonToBelieve : '',
    manualStatement:
      typeof obj.manualStatement === 'string' ? obj.manualStatement : null,
    savedStatement:
      typeof obj.savedStatement === 'string' ? obj.savedStatement : null,
    savedAt: typeof obj.savedAt === 'string' ? obj.savedAt : null,
  };
}

type StatementStorageMap = Record<string, PositioningStatementState>;

function readStorage(): StatementStorageMap {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }
    return parsed as StatementStorageMap;
  } catch {
    return {};
  }
}

function writeStorage(map: StatementStorageMap) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // Ignore storage errors
  }
}

export function formatPositioningStatement(
  state: PositioningStatementState,
  ventureName: string,
  mainAlternativeName: string
): string {
  const tc = state.targetCustomer.trim() || '[Target Customer]';
  const cat = state.category.trim() || '[Category / Type of Solution]';
  const ben = state.primaryBenefit.trim() || '[Primary Benefit]';
  const alt = mainAlternativeName.trim() || '[Main Alternative]';
  const rtb = state.reasonToBelieve.trim() || '[Reason to Believe]';

  return `For ${tc}, ${ventureName} is a ${cat} that provides ${ben}, unlike ${alt}, because ${rtb}.`;
}

export function isStatementFieldsComplete(
  state: PositioningStatementState,
  validAlternatives: CompetitorAlternative[]
): boolean {
  const hasValidAlt = validAlternatives.some(
    (alt) => alt.id === state.mainAlternativeId
  );
  return (
    state.targetCustomer.trim().length > 0 &&
    state.category.trim().length > 0 &&
    state.primaryBenefit.trim().length > 0 &&
    hasValidAlt &&
    state.reasonToBelieve.trim().length > 0
  );
}

export function isPositioningStatementSaved(
  state: PositioningStatementState,
  validAlternatives: CompetitorAlternative[]
): boolean {
  return (
    Boolean(state.savedStatement && state.savedStatement.trim().length > 0) &&
    Boolean(state.savedAt) &&
    isStatementFieldsComplete(state, validAlternatives)
  );
}

export function evaluatePositioningStatement(params: {
  venture: Venture;
  state: PositioningStatementState;
  enteredAlternatives: CompetitorAlternative[];
  battlefieldState: MarketBattlefieldState;
  finalStatementText: string;
}): PositioningCheckItem[] {
  const {
    venture,
    state,
    enteredAlternatives,
    battlefieldState,
    finalStatementText,
  } = params;

  const selectedAlt =
    enteredAlternatives.find((a) => a.id === state.mainAlternativeId) ?? null;

  const tc = state.targetCustomer.trim();
  const cat = state.category.trim();
  const ben = state.primaryBenefit.trim();
  const rtb = state.reasonToBelieve.trim();

  // 1. Target Customer Clarity
  let targetCheck: PositioningCheckItem;
  const overlyBroadPattern = /^(everyone|anyone|all people|people|consumers|users|customers)$/i;
  if (!tc) {
    targetCheck = {
      dimension: 'Target Customer Clarity',
      rating: 'Weak',
      explanation: `Target Customer is missing. Specify the exact customer segment from your Venture Profile (${venture.targetCustomer}).`,
    };
  } else if (overlyBroadPattern.test(tc) || tc.split(/\s+/).length < 2) {
    targetCheck = {
      dimension: 'Target Customer Clarity',
      rating: 'Needs Improvement',
      explanation: `"${tc}" is too broad. Narrow it to the specific customer group in ${venture.geography} (for example, "${venture.targetCustomer}").`,
    };
  } else {
    targetCheck = {
      dimension: 'Target Customer Clarity',
      rating: 'Strong',
      explanation: `Clearly identifies "${tc}", aligned with your Venture Profile segment.`,
    };
  }

  // 2. Primary Benefit Clarity
  let benefitCheck: PositioningCheckItem;
  const vagueBenefitPattern =
    /^(good|better|best|nice|great|quality|affordable|cheap|fast)(\s+(service|product|solution|option|quality))?$/i;
  if (!ben) {
    benefitCheck = {
      dimension: 'Primary Benefit Clarity',
      rating: 'Weak',
      explanation: `Primary Benefit is empty. State the concrete customer outcome that solves: "${venture.problem}".`,
    };
  } else if (vagueBenefitPattern.test(ben) || ben.split(/\s+/).length < 3) {
    benefitCheck = {
      dimension: 'Primary Benefit Clarity',
      rating: 'Needs Improvement',
      explanation: `"${ben}" is too general. Describe the specific value customers receive from "${venture.offer}" to address "${venture.problem}".`,
    };
  } else {
    benefitCheck = {
      dimension: 'Primary Benefit Clarity',
      rating: 'Strong',
      explanation: `States a specific customer benefit ("${ben}") connected to the problem your venture addresses.`,
    };
  }

  // 3. Differentiation
  let diffCheck: PositioningCheckItem;
  const vx = battlefieldState.ventureScore.x;
  const vy = battlefieldState.ventureScore.y;
  const altScore = selectedAlt
    ? battlefieldState.alternativeScores[selectedAlt.id]
    : undefined;
  const hasMapComparison =
    typeof vx === 'number' &&
    typeof vy === 'number' &&
    typeof altScore?.x === 'number' &&
    typeof altScore?.y === 'number';
  const mapDistance = hasMapComparison
    ? Number(
        Math.hypot(vx - (altScore!.x as number), vy - (altScore!.y as number)).toFixed(2)
      )
    : null;

  if (!selectedAlt) {
    diffCheck = {
      dimension: 'Differentiation',
      rating: 'Weak',
      explanation:
        'No Main Alternative selected. Choose one alternative from your Competitor Matrix so your contrast is explicit.',
    };
  } else if (!selectedAlt.mainWeakness.trim()) {
    diffCheck = {
      dimension: 'Differentiation',
      rating: 'Needs Improvement',
      explanation: `${selectedAlt.name} is missing a documented Main Weakness in your Competitor Matrix. Add what falls short in ${selectedAlt.name} to sharpen differentiation.`,
    };
  } else if (mapDistance !== null && mapDistance < 1.5) {
    diffCheck = {
      dimension: 'Differentiation',
      rating: 'Needs Improvement',
      explanation: `On your Positioning Map, ${venture.name} sits only ${mapDistance} units from ${selectedAlt.name}. Clarify why customers would switch despite close overlap.`,
    };
  } else {
    diffCheck = {
      dimension: 'Differentiation',
      rating: 'Strong',
      explanation: `Contrasts directly against ${selectedAlt.name} (${selectedAlt.type || 'Competitor'})${
        mapDistance !== null ? `, separated by ${mapDistance} units on the Positioning Map` : ''
      }, targeting its documented weakness ("${selectedAlt.mainWeakness}").`,
    };
  }

  // 4. Evidence / Reason to Believe (Strict Evidence Rule)
  let rtbCheck: PositioningCheckItem;
  const appEvidenceCorpus = [
    venture.offer,
    venture.problem,
    venture.geography,
    ...enteredAlternatives.flatMap((a) => [
      a.mainWeakness,
      a.mainOffer,
      a.evidenceSource,
    ]),
  ].join(' ');

  const unsubstantiatedClaimPattern =
    /\b(cheapest|lowest price|fastest|guaranteed|100%|#1|number one|patent|patented|exclusive|proven|always|never fails|ai-powered accuracy|verified network)\b/i;

  if (!rtb) {
    rtbCheck = {
      dimension: 'Evidence / Reason to Believe',
      rating: 'Weak',
      needsEvidence: true,
      explanation: `NEEDS EVIDENCE — Reason to Believe is empty. Support it strictly using your Venture Profile offer ("${venture.offer}") or documented Competitor Matrix evidence.`,
    };
  } else {
    const overlapWithOffer = countKeywordOverlap(rtb, venture.offer);
    const overlapWithMatrix = countKeywordOverlap(rtb, appEvidenceCorpus);
    const hasUnverifiedClaimWords = unsubstantiatedClaimPattern.test(rtb);
    const selectedAltWeakOrMissingEvidence =
      selectedAlt !== null &&
      (!selectedAlt.evidenceSource.trim() ||
        selectedAlt.evidenceQuality === 'Weak');

    if (overlapWithMatrix === 0) {
      rtbCheck = {
        dimension: 'Evidence / Reason to Believe',
        rating: 'Weak',
        needsEvidence: true,
        explanation: `NEEDS EVIDENCE — Your Reason to Believe is currently an unsupported assumption because it does not reference capabilities in your Venture Profile offer ("${venture.offer}") or documented Competitor Matrix findings.`,
      };
    } else if (
      hasUnverifiedClaimWords &&
      overlapWithOffer === 0
    ) {
      rtbCheck = {
        dimension: 'Evidence / Reason to Believe',
        rating: 'Needs Improvement',
        needsEvidence: true,
        explanation: `NEEDS EVIDENCE — Your claim relies on unverified assertion language that is not backed by your entered Venture Profile or Competitor Matrix data; treat this part as an assumption until validated.`,
      };
    } else if (selectedAltWeakOrMissingEvidence) {
      rtbCheck = {
        dimension: 'Evidence / Reason to Believe',
        rating: 'Needs Improvement',
        needsEvidence: true,
        explanation: `NEEDS EVIDENCE — While connected to your venture offer ("${venture.offer}"), the comparison against ${selectedAlt!.name} relies on ${
          selectedAlt!.evidenceQuality || 'missing'
        } evidence in your Competitor Matrix and remains an assumption until stronger source evidence is added.`,
      };
    } else {
      rtbCheck = {
        dimension: 'Evidence / Reason to Believe',
        rating: 'Strong',
        needsEvidence: false,
        explanation: `Anchored in your existing Venture Profile offer ("${venture.offer}") and supported by ${
          selectedAlt?.evidenceQuality ?? 'documented'
        } Competitor Matrix research.`,
      };
    }
  }

  // 5. Consistency with the Positioning Map
  let mapCheck: PositioningCheckItem;
  const xName = battlefieldState.axes.xName.trim();
  const yName = battlefieldState.axes.yName.trim();
  const axisCorpus = [
    xName,
    battlefieldState.axes.xLeftLabel,
    battlefieldState.axes.xRightLabel,
    yName,
    battlefieldState.axes.yBottomLabel,
    battlefieldState.axes.yTopLabel,
  ].join(' ');

  if (!cat || !ben) {
    mapCheck = {
      dimension: 'Consistency with the Positioning Map',
      rating: 'Weak',
      explanation: `Complete Category and Primary Benefit to verify consistency with your Positioning Map dimensions (${xName || 'X-axis'} and ${yName || 'Y-axis'}).`,
    };
  } else if (typeof vx !== 'number' || typeof vy !== 'number') {
    mapCheck = {
      dimension: 'Consistency with the Positioning Map',
      rating: 'Needs Improvement',
      explanation: `Venture Positioning Map scores are incomplete. Score ${venture.name} on ${xName} and ${yName} to verify consistency.`,
    };
  } else {
    const combinedStatementText = `${cat} ${ben} ${rtb} ${finalStatementText}`;
    const axisOverlap = countKeywordOverlap(combinedStatementText, axisCorpus);

    if (axisOverlap > 0 && (mapDistance === null || mapDistance >= 1.5)) {
      mapCheck = {
        dimension: 'Consistency with the Positioning Map',
        rating: 'Strong',
        explanation: `Consistent with your Positioning Map (${xName}: ${vx}/10, ${yName}: ${vy}/10) and reflects the positioning dimensions you chose.`,
      };
    } else if (mapDistance !== null && mapDistance < 1.5) {
      mapCheck = {
        dimension: 'Consistency with the Positioning Map',
        rating: 'Needs Improvement',
        explanation: `Your statement claims separation from ${selectedAlt?.name}, but your Positioning Map places ${venture.name} (${vx}/10, ${vy}/10) within ${mapDistance} units of ${selectedAlt?.name} (${altScore?.x}/10, ${altScore?.y}/10).`,
      };
    } else {
      mapCheck = {
        dimension: 'Consistency with the Positioning Map',
        rating: 'Needs Improvement',
        explanation: `Your Positioning Map tracks "${xName}" (${vx}/10) and "${yName}" (${vy}/10), but those dimensions are not explicitly reflected in your Benefit or Reason to Believe.`,
      };
    }
  }

  return [targetCheck, benefitCheck, diffCheck, rtbCheck, mapCheck];
}

export function usePositioningStatement(
  ventureId: string | null,
  ventureTargetCustomer: string
) {
  const [storageMap, setStorageMap] = useState<StatementStorageMap>(() =>
    readStorage()
  );

  const state: PositioningStatementState = ventureId
    ? sanitizeStatementState(storageMap[ventureId], ventureTargetCustomer)
    : createInitialStatementState(ventureTargetCustomer);

  const updateState = useCallback(
    (
      updater: (
        current: PositioningStatementState
      ) => PositioningStatementState
    ) => {
      if (!ventureId) return;
      setStorageMap((prev) => {
        const current = sanitizeStatementState(
          prev[ventureId],
          ventureTargetCustomer
        );
        const next = updater(current);
        const nextMap = { ...prev, [ventureId]: next };
        writeStorage(nextMap);
        return nextMap;
      });
    },
    [ventureId, ventureTargetCustomer]
  );

  const updateField = useCallback(
    (
      patch: Partial<
        Pick<
          PositioningStatementState,
          | 'targetCustomer'
          | 'category'
          | 'primaryBenefit'
          | 'mainAlternativeId'
          | 'reasonToBelieve'
        >
      >
    ) => {
      updateState((current) => ({
        ...current,
        ...patch,
        // Automatically resync final statement when any component changes
        manualStatement: null,
      }));
    },
    [updateState]
  );

  const setManualStatement = useCallback(
    (text: string | null) => {
      updateState((current) => ({
        ...current,
        manualStatement: text,
      }));
    },
    [updateState]
  );

  const saveStatement = useCallback(
    (statementText: string) => {
      updateState((current) => ({
        ...current,
        savedStatement: statementText.trim(),
        savedAt: new Date().toISOString(),
      }));
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
    state,
    updateField,
    setManualStatement,
    saveStatement,
  };
}

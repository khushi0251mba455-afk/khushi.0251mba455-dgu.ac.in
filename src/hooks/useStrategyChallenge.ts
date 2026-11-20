import { useCallback, useEffect, useState } from 'react';
import {
  CompetitorMatrixSummary,
  computeCompetitorMatrixSummary,
} from './useCompetitionLab';
import {
  PlottedPoint,
  computeBattlefieldInterpretation,
  isScoreComplete,
} from './useMarketBattlefield';
import {
  ChallengeFeedback,
  ChallengeQuestion,
  CompetitorAlternative,
  MarketBattlefieldState,
  PositioningStatementState,
  StrategyChallengeReview,
  StrategyChallengeState,
  Venture,
} from '../types/venture';

const STORAGE_KEY = 'nexus_venture_studio_ai_challenge_v1';

export function createInitialChallengeState(): StrategyChallengeState {
  return {
    questions: [],
    responses: {},
    feedbacks: {},
    currentIndex: 0,
    finalReview: null,
    completedAt: null,
  };
}

function sanitizeChallengeState(raw: unknown): StrategyChallengeState {
  if (!raw || typeof raw !== 'object') {
    return createInitialChallengeState();
  }
  const obj = raw as Partial<StrategyChallengeState>;

  const questions: ChallengeQuestion[] = Array.isArray(obj.questions)
    ? obj.questions
        .slice(0, 3)
        .filter(
          (q): q is ChallengeQuestion =>
            Boolean(q) &&
            typeof q.id === 'string' &&
            typeof q.focusArea === 'string' &&
            typeof q.question === 'string'
        )
    : [];

  const responses: Record<string, string> = {};
  if (obj.responses && typeof obj.responses === 'object') {
    for (const [k, v] of Object.entries(obj.responses)) {
      if (typeof v === 'string') {
        responses[k] = v;
      }
    }
  }

  const feedbacks: Record<string, ChallengeFeedback> = {};
  if (obj.feedbacks && typeof obj.feedbacks === 'object') {
    for (const [k, v] of Object.entries(obj.feedbacks)) {
      if (
        v &&
        typeof v === 'object' &&
        typeof v.supported === 'string' &&
        typeof v.assumption === 'string' &&
        typeof v.nextEvidenceNeeded === 'string'
      ) {
        feedbacks[k] = {
          supported: v.supported,
          assumption: v.assumption,
          nextEvidenceNeeded: v.nextEvidenceNeeded,
        };
      }
    }
  }

  const currentIndex =
    typeof obj.currentIndex === 'number' &&
    obj.currentIndex >= 0 &&
    obj.currentIndex <= 2
      ? obj.currentIndex
      : 0;

  const finalReview: StrategyChallengeReview | null =
    obj.finalReview &&
    typeof obj.finalReview === 'object' &&
    typeof obj.finalReview.strongestPart === 'string' &&
    typeof obj.finalReview.biggestAssumption === 'string' &&
    typeof obj.finalReview.nextValidationPriority === 'string'
      ? {
          strongestPart: obj.finalReview.strongestPart,
          biggestAssumption: obj.finalReview.biggestAssumption,
          nextValidationPriority: obj.finalReview.nextValidationPriority,
        }
      : null;

  return {
    questions,
    responses,
    feedbacks,
    currentIndex,
    finalReview,
    completedAt: typeof obj.completedAt === 'string' ? obj.completedAt : null,
  };
}

type ChallengeStorageMap = Record<string, StrategyChallengeState>;

function readStorage(): ChallengeStorageMap {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }
    const result: ChallengeStorageMap = {};
    for (const [ventureId, st] of Object.entries(parsed)) {
      result[ventureId] = sanitizeChallengeState(st);
    }
    return result;
  } catch {
    return {};
  }
}

function writeStorage(map: ChallengeStorageMap) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // Ignore storage write errors
  }
}

export function isStrategyChallengeComplete(
  state: StrategyChallengeState
): boolean {
  if (state.questions.length !== 3 || !state.finalReview) {
    return false;
  }
  return state.questions.every(
    (q) =>
      Boolean(state.responses[q.id]?.trim()) &&
      Boolean(state.feedbacks[q.id])
  );
}

export interface VentureStrategyDossier {
  ventureProfile: {
    name: string;
    targetCustomer: string;
    problem: string;
    geography: string;
    offer: string;
  };
  competitorMatrixSummary: CompetitorMatrixSummary;
  competitorResearch: Array<{
    name: string;
    type: string;
    priceCost: string;
    mainOffer: string;
    mainStrength: string;
    mainWeakness: string;
    evidenceSourceType: string;
    evidenceSource: string;
    evidenceQuality: string;
  }>;
  positioningMap: {
    xAxis: string;
    xAnchors: string;
    yAxis: string;
    yAnchors: string;
    ventureScores: { x: number | null; y: number | null };
    alternativeScores: Array<{
      name: string;
      type: string;
      x: number | null;
      y: number | null;
    }>;
    interpretation: ReturnType<typeof computeBattlefieldInterpretation>;
  };
  positioningStatement: {
    targetCustomer: string;
    category: string;
    primaryBenefit: string;
    mainAlternative: string;
    reasonToBelieve: string;
    savedStatement: string;
  };
}

export function buildStrategyDossier(params: {
  venture: Venture;
  enteredAlternatives: CompetitorAlternative[];
  battlefieldState: MarketBattlefieldState;
  statementState: PositioningStatementState;
}): VentureStrategyDossier {
  const { venture, enteredAlternatives, battlefieldState, statementState } =
    params;

  const matrixSummary = computeCompetitorMatrixSummary(enteredAlternatives);

  const scoredAlternatives: PlottedPoint[] = [];
  for (const alt of enteredAlternatives) {
    const sc = battlefieldState.alternativeScores[alt.id];
    if (isScoreComplete(sc)) {
      scoredAlternatives.push({
        id: alt.id,
        name: alt.name.trim() || 'Untitled Alternative',
        type: alt.type || 'Type not selected',
        isVenture: false,
        x: sc.x as number,
        y: sc.y as number,
      });
    }
  }

  const interpretation = computeBattlefieldInterpretation(
    battlefieldState.axes,
    venture.name,
    battlefieldState.ventureScore,
    scoredAlternatives
  );

  const mainAlt = enteredAlternatives.find(
    (a) => a.id === statementState.mainAlternativeId
  );

  return {
    ventureProfile: {
      name: venture.name,
      targetCustomer: venture.targetCustomer,
      problem: venture.problem,
      geography: venture.geography,
      offer: venture.offer,
    },
    competitorMatrixSummary: matrixSummary,
    competitorResearch: enteredAlternatives.map((alt) => ({
      name: alt.name.trim() || 'Evidence required',
      type: alt.type || 'Evidence required',
      priceCost: alt.priceNotApplicable
        ? 'Not applicable'
        : alt.priceCost.trim() || 'Evidence required',
      mainOffer: alt.mainOffer.trim() || 'Evidence required',
      mainStrength: alt.mainStrength.trim() || 'Evidence required',
      mainWeakness: alt.mainWeakness.trim() || 'Evidence required',
      evidenceSourceType: alt.evidenceSourceType || 'Not specified',
      evidenceSource: alt.evidenceSource.trim() || 'Evidence required',
      evidenceQuality: alt.evidenceQuality || 'Evidence required',
    })),
    positioningMap: {
      xAxis: battlefieldState.axes.xName.trim(),
      xAnchors: `${battlefieldState.axes.xLeftLabel.trim()} (1) to ${battlefieldState.axes.xRightLabel.trim()} (10)`,
      yAxis: battlefieldState.axes.yName.trim(),
      yAnchors: `${battlefieldState.axes.yBottomLabel.trim()} (1) to ${battlefieldState.axes.yTopLabel.trim()} (10)`,
      ventureScores: battlefieldState.ventureScore,
      alternativeScores: enteredAlternatives.map((alt) => {
        const sc = battlefieldState.alternativeScores[alt.id];
        return {
          name: alt.name.trim() || 'Untitled Alternative',
          type: alt.type || 'Type not selected',
          x: sc?.x ?? null,
          y: sc?.y ?? null,
        };
      }),
      interpretation,
    },
    positioningStatement: {
      targetCustomer: statementState.targetCustomer.trim(),
      category: statementState.category.trim(),
      primaryBenefit: statementState.primaryBenefit.trim(),
      mainAlternative: mainAlt?.name.trim() || '',
      reasonToBelieve: statementState.reasonToBelieve.trim(),
      savedStatement: (statementState.savedStatement ?? '').trim(),
    },
  };
}

export function useStrategyChallenge(ventureId: string | null) {
  const [storageMap, setStorageMap] = useState<ChallengeStorageMap>(() =>
    readStorage()
  );
  const [loadingStep, setLoadingStep] = useState<
    'questions' | 'feedback' | 'review' | null
  >(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const state: StrategyChallengeState = ventureId
    ? storageMap[ventureId] ?? createInitialChallengeState()
    : createInitialChallengeState();

  const updateState = useCallback(
    (
      updater: (current: StrategyChallengeState) => StrategyChallengeState
    ) => {
      if (!ventureId) return;
      setStorageMap((prev) => {
        const current = prev[ventureId] ?? createInitialChallengeState();
        const next = updater(current);
        const nextMap = { ...prev, [ventureId]: next };
        writeStorage(nextMap);
        return nextMap;
      });
    },
    [ventureId]
  );

  const updateDraftResponse = useCallback(
    (questionId: string, text: string) => {
      updateState((current) => ({
        ...current,
        responses: {
          ...current.responses,
          [questionId]: text,
        },
      }));
    },
    [updateState]
  );

  const generateQuestions = useCallback(
    async (dossier: VentureStrategyDossier) => {
      setErrorMessage(null);
      setLoadingStep('questions');
      try {
        const res = await fetch('/api/strategy-challenge/questions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dossier }),
        });
        const data = (await res.json()) as {
          questions?: ChallengeQuestion[];
          error?: string;
        };
        if (!res.ok || !data.questions) {
          throw new Error(
            data.error || 'Failed to generate strategy challenge questions.'
          );
        }
        updateState(() => ({
          questions: data.questions!,
          responses: {},
          feedbacks: {},
          currentIndex: 0,
          finalReview: null,
          completedAt: null,
        }));
      } catch (err) {
        setErrorMessage(
          err instanceof Error ? err.message : 'Unable to generate questions.'
        );
      } finally {
        setLoadingStep(null);
      }
    },
    [updateState]
  );

  const submitDefense = useCallback(
    async (
      dossier: VentureStrategyDossier,
      question: ChallengeQuestion,
      defenseText: string
    ) => {
      setErrorMessage(null);
      setLoadingStep('feedback');
      try {
        const res = await fetch('/api/strategy-challenge/feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dossier,
            question: question.question,
            userDefense: defenseText,
          }),
        });
        const data = (await res.json()) as Partial<ChallengeFeedback> & {
          error?: string;
        };
        if (
          !res.ok ||
          !data.supported ||
          !data.assumption ||
          !data.nextEvidenceNeeded
        ) {
          throw new Error(
            data.error || 'Failed to evaluate your defence response.'
          );
        }

        updateState((current) => ({
          ...current,
          responses: {
            ...current.responses,
            [question.id]: defenseText,
          },
          feedbacks: {
            ...current.feedbacks,
            [question.id]: {
              supported: data.supported!,
              assumption: data.assumption!,
              nextEvidenceNeeded: data.nextEvidenceNeeded!,
            },
          },
        }));
      } catch (err) {
        setErrorMessage(
          err instanceof Error ? err.message : 'Unable to evaluate defence.'
        );
      } finally {
        setLoadingStep(null);
      }
    },
    [updateState]
  );

  const goToNextChallenge = useCallback(() => {
    setErrorMessage(null);
    updateState((current) => ({
      ...current,
      currentIndex: Math.min(2, current.currentIndex + 1),
    }));
  }, [updateState]);

  const generateFinalReview = useCallback(
    async (dossier: VentureStrategyDossier) => {
      setErrorMessage(null);
      setLoadingStep('review');
      try {
        const rounds = state.questions.map((q) => ({
          focusArea: q.focusArea,
          question: q.question,
          defense: state.responses[q.id] ?? '',
          feedback: state.feedbacks[q.id] ?? null,
        }));

        const res = await fetch('/api/strategy-challenge/review', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dossier, rounds }),
        });
        const data = (await res.json()) as Partial<StrategyChallengeReview> & {
          error?: string;
        };
        if (
          !res.ok ||
          !data.strongestPart ||
          !data.biggestAssumption ||
          !data.nextValidationPriority
        ) {
          throw new Error(
            data.error || 'Failed to generate final strategy review.'
          );
        }

        updateState((current) => ({
          ...current,
          finalReview: {
            strongestPart: data.strongestPart!,
            biggestAssumption: data.biggestAssumption!,
            nextValidationPriority: data.nextValidationPriority!,
          },
          completedAt: new Date().toISOString(),
        }));
      } catch (err) {
        setErrorMessage(
          err instanceof Error ? err.message : 'Unable to complete review.'
        );
      } finally {
        setLoadingStep(null);
      }
    },
    [state.questions, state.responses, state.feedbacks, updateState]
  );

  const resetChallenge = useCallback(() => {
    setErrorMessage(null);
    updateState(() => createInitialChallengeState());
  }, [updateState]);

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
    loadingStep,
    errorMessage,
    updateDraftResponse,
    generateQuestions,
    submitDefense,
    goToNextChallenge,
    generateFinalReview,
    resetChallenge,
  };
}

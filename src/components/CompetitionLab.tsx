import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Lock,
  Plus,
  RefreshCw,
  Trash2,
  Unlock,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  ALTERNATIVE_TYPES,
  EVIDENCE_QUALITY_OPTIONS,
  EVIDENCE_SOURCE_TYPES,
  MAX_ALTERNATIVES,
  MIN_ALTERNATIVES,
  computeCompetitorMatrixSummary,
  hasAnyAlternativeEntry,
  isAlternativeCompleted,
  useCompetitionLab,
} from '../hooks/useCompetitionLab';
import {
  isMarketBattlefieldComplete,
  useMarketBattlefield,
} from '../hooks/useMarketBattlefield';
import {
  isPositioningStatementSaved,
  usePositioningStatement,
} from '../hooks/usePositioningStatement';
import {
  isStrategyChallengeComplete,
  useStrategyChallenge,
} from '../hooks/useStrategyChallenge';
import {
  AlternativeType,
  CompetitionLabTab,
  EvidenceQuality,
  EvidenceSourceType,
  Venture,
} from '../types/venture';
import { AIStrategyChallenge } from './AIStrategyChallenge';
import { MarketBattlefield } from './MarketBattlefield';
import { PositioningStatement } from './PositioningStatement';

const LAB_TAB_STORAGE_KEY = 'nexus_venture_studio_lab_tab_v1';

function readStoredLabTab(): CompetitionLabTab {
  if (typeof window === 'undefined') return 'research';
  try {
    const val = window.localStorage.getItem(LAB_TAB_STORAGE_KEY);
    if (
      val === 'market-battlefield' ||
      val === 'positioning-statement' ||
      val === 'ai-strategy-challenge'
    ) {
      return val;
    }
    return 'research';
  } catch {
    return 'research';
  }
}

interface CompetitionLabProps {
  venture: Venture;
  onBackToBank: () => void;
  onConfirmSwitchVenture: () => void;
}

export function CompetitionLab({
  venture,
  onBackToBank,
  onConfirmSwitchVenture,
}: CompetitionLabProps) {
  const {
    alternatives,
    updateAlternative,
    addAlternative,
    removeAlternative,
    clearAlternative,
  } = useCompetitionLab(venture.id);

  const { state: battlefieldState } = useMarketBattlefield(venture.id);
  const { state: statementState } = usePositioningStatement(
    venture.id,
    venture.targetCustomer
  );
  const { state: challengeState } = useStrategyChallenge(venture.id);

  const [collapsedIds, setCollapsedIds] = useState<Record<string, boolean>>({});
  const [switchWarningOpen, setSwitchWarningOpen] = useState(false);
  const [activeTab, setActiveTabState] = useState<CompetitionLabTab>(() =>
    readStoredLabTab()
  );

  const summary = useMemo(
    () => computeCompetitorMatrixSummary(alternatives),
    [alternatives]
  );

  const enteredAlternatives = useMemo(
    () => alternatives.filter(hasAnyAlternativeEntry),
    [alternatives]
  );

  const completedAlternatives = useMemo(
    () => alternatives.filter(isAlternativeCompleted),
    [alternatives]
  );

  const isPositioningMapUnlocked = summary.alternativesResearched >= 3;
  const isBattlefieldComplete = useMemo(
    () => isMarketBattlefieldComplete(battlefieldState, completedAlternatives),
    [battlefieldState, completedAlternatives]
  );
  const isStatementSaved = useMemo(
    () => isPositioningStatementSaved(statementState, enteredAlternatives),
    [statementState, enteredAlternatives]
  );
  const isChallengeComplete = useMemo(
    () => isStrategyChallengeComplete(challengeState),
    [challengeState]
  );

  const resolvedTab: CompetitionLabTab =
    activeTab === 'ai-strategy-challenge' &&
    isPositioningMapUnlocked &&
    isBattlefieldComplete &&
    isStatementSaved
      ? 'ai-strategy-challenge'
      : activeTab === 'positioning-statement' &&
          isPositioningMapUnlocked &&
          isBattlefieldComplete
        ? 'positioning-statement'
        : activeTab === 'market-battlefield' && isPositioningMapUnlocked
          ? 'market-battlefield'
          : 'research';

  const setActiveTab = (tab: CompetitionLabTab) => {
    setActiveTabState(tab);
    try {
      window.localStorage.setItem(LAB_TAB_STORAGE_KEY, tab);
    } catch {
      // Ignore storage write errors
    }
  };

  useEffect(() => {
    if (!isPositioningMapUnlocked && activeTab !== 'research') {
      setActiveTabState('research');
    } else if (
      !isBattlefieldComplete &&
      (activeTab === 'positioning-statement' ||
        activeTab === 'ai-strategy-challenge')
    ) {
      setActiveTabState(
        isPositioningMapUnlocked ? 'market-battlefield' : 'research'
      );
    } else if (!isStatementSaved && activeTab === 'ai-strategy-challenge') {
      setActiveTabState(
        isBattlefieldComplete ? 'positioning-statement' : 'research'
      );
    }
  }, [
    isPositioningMapUnlocked,
    isBattlefieldComplete,
    isStatementSaved,
    activeTab,
  ]);

  const toggleCollapse = (id: string) => {
    setCollapsedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-6">
      <section
        aria-label="Competition Lab Controls"
        className="rounded-xl border border-slate-200 bg-white px-5 py-4 lg:px-6"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onBackToBank}
              className="inline-flex min-h-[40px] items-center rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-800 transition-colors duration-150 hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 whitespace-nowrap shrink-0"
            >
              <span>← Back to Venture Bank</span>
            </button>

            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500">
                Competition Lab · Active Venture
              </p>
              <p className="text-base font-bold text-slate-900 truncate">
                {venture.name}{' '}
                <span className="font-normal text-slate-500">
                  · {venture.geography}
                </span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setSwitchWarningOpen(true)}
            className="inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 transition-colors duration-150 hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 whitespace-nowrap shrink-0 self-start sm:self-auto"
          >
            <RefreshCw className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
            <span>Switch Venture</span>
          </button>
        </div>

        <dl className="mt-4 grid grid-cols-1 gap-3 border-t border-slate-100 pt-3.5 text-xs sm:grid-cols-3">
          <div>
            <dt className="font-medium text-slate-500">Target Customer</dt>
            <dd className="mt-0.5 text-slate-800">{venture.targetCustomer}</dd>
          </div>
          <div>
            <dt className="font-medium text-slate-500">Problem</dt>
            <dd className="mt-0.5 text-slate-800">{venture.problem}</dd>
          </div>
          <div>
            <dt className="font-medium text-slate-500">Offer</dt>
            <dd className="mt-0.5 text-slate-800">{venture.offer}</dd>
          </div>
        </dl>

        <div
          role="tablist"
          aria-label="Competition Lab Sub-Stages"
          className="mt-4 grid grid-cols-1 gap-2 border-t border-slate-100 pt-4 sm:grid-cols-2 lg:grid-cols-5"
        >
          <button
            type="button"
            role="tab"
            aria-selected={resolvedTab === 'research'}
            onClick={() => setActiveTab('research')}
            className={`flex min-h-[42px] items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-xs font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
              resolvedTab === 'research'
                ? 'border-blue-600 bg-blue-50/70 text-slate-900'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            <span className="truncate font-semibold">
              01. Competitor Research
            </span>
            <span className="font-mono text-[11px] text-slate-500 tabular-nums shrink-0">
              {summary.alternativesResearched}/3
            </span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={resolvedTab === 'market-battlefield'}
            disabled={!isPositioningMapUnlocked}
            onClick={() => {
              if (isPositioningMapUnlocked) {
                setActiveTab('market-battlefield');
              }
            }}
            className={`flex min-h-[42px] items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-xs font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
              !isPositioningMapUnlocked
                ? 'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400'
                : resolvedTab === 'market-battlefield'
                  ? 'border-blue-600 bg-blue-50/70 text-slate-900'
                  : 'border-emerald-200 bg-emerald-50/40 text-slate-800 hover:bg-emerald-50'
            }`}
          >
            <span className="flex items-center gap-1.5 truncate font-semibold">
              {isPositioningMapUnlocked ? (
                <Unlock className="h-3.5 w-3.5 text-emerald-700 shrink-0" aria-hidden="true" />
              ) : (
                <Lock className="h-3.5 w-3.5 text-slate-400 shrink-0" aria-hidden="true" />
              )}
              <span className="truncate">02. Market Battlefield</span>
            </span>
            <span
              className={`text-[11px] whitespace-nowrap shrink-0 ${
                isPositioningMapUnlocked ? 'text-emerald-700' : 'text-slate-400'
              }`}
            >
              {isPositioningMapUnlocked ? 'Unlocked' : 'Locked'}
            </span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={resolvedTab === 'positioning-statement'}
            disabled={!isBattlefieldComplete}
            onClick={() => {
              if (isBattlefieldComplete) {
                setActiveTab('positioning-statement');
              }
            }}
            className={`flex min-h-[42px] items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-xs font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
              !isBattlefieldComplete
                ? 'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400'
                : resolvedTab === 'positioning-statement'
                  ? 'border-blue-600 bg-blue-50/70 text-slate-900'
                  : 'border-emerald-200 bg-emerald-50/40 text-slate-800 hover:bg-emerald-50'
            }`}
          >
            <span className="flex items-center gap-1.5 truncate font-semibold">
              {isBattlefieldComplete ? (
                <Unlock className="h-3.5 w-3.5 text-emerald-700 shrink-0" aria-hidden="true" />
              ) : (
                <Lock className="h-3.5 w-3.5 text-slate-400 shrink-0" aria-hidden="true" />
              )}
              <span className="truncate">03. Positioning Statement</span>
            </span>
            <span
              className={`text-[11px] whitespace-nowrap shrink-0 ${
                isBattlefieldComplete ? 'text-emerald-700' : 'text-slate-400'
              }`}
            >
              {isBattlefieldComplete ? 'Unlocked' : 'Locked'}
            </span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={resolvedTab === 'ai-strategy-challenge'}
            disabled={!isStatementSaved}
            onClick={() => {
              if (isStatementSaved) {
                setActiveTab('ai-strategy-challenge');
              }
            }}
            className={`flex min-h-[42px] items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-xs font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
              !isStatementSaved
                ? 'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400'
                : resolvedTab === 'ai-strategy-challenge'
                  ? 'border-blue-600 bg-blue-50/70 text-slate-900'
                  : 'border-emerald-200 bg-emerald-50/40 text-slate-800 hover:bg-emerald-50'
            }`}
          >
            <span className="flex items-center gap-1.5 truncate font-semibold">
              {isStatementSaved ? (
                <Unlock className="h-3.5 w-3.5 text-emerald-700 shrink-0" aria-hidden="true" />
              ) : (
                <Lock className="h-3.5 w-3.5 text-slate-400 shrink-0" aria-hidden="true" />
              )}
              <span className="truncate">04. AI Strategy Challenge</span>
            </span>
            <span
              className={`text-[11px] whitespace-nowrap shrink-0 ${
                isStatementSaved ? 'text-emerald-700' : 'text-slate-400'
              }`}
            >
              {isStatementSaved ? 'Unlocked' : 'Locked'}
            </span>
          </button>

          <div
            aria-disabled="true"
            className={`flex min-h-[42px] items-center justify-between gap-2 rounded-lg border px-3 py-2 text-xs font-medium ${
              isChallengeComplete
                ? 'border-emerald-200 bg-emerald-50/40 text-slate-800'
                : 'border-slate-200 bg-slate-50 text-slate-400'
            }`}
          >
            <span className="flex items-center gap-1.5 truncate font-semibold">
              {isChallengeComplete ? (
                <Unlock className="h-3.5 w-3.5 text-emerald-700 shrink-0" aria-hidden="true" />
              ) : (
                <Lock className="h-3.5 w-3.5 text-slate-400 shrink-0" aria-hidden="true" />
              )}
              <span className="truncate">05. Competition War Room</span>
            </span>
            <span
              className={`text-[11px] whitespace-nowrap shrink-0 ${
                isChallengeComplete ? 'text-emerald-700' : 'text-slate-400'
              }`}
            >
              {isChallengeComplete ? 'Unlocked' : 'Locked'}
            </span>
          </div>
        </div>
      </section>

      {resolvedTab === 'ai-strategy-challenge' && isStatementSaved ? (
        <AIStrategyChallenge
          venture={venture}
          enteredAlternatives={enteredAlternatives}
          battlefieldState={battlefieldState}
          statementState={statementState}
          onBackToStatement={() => setActiveTab('positioning-statement')}
        />
      ) : resolvedTab === 'positioning-statement' && isBattlefieldComplete ? (
        <PositioningStatement
          venture={venture}
          enteredAlternatives={enteredAlternatives}
          battlefieldState={battlefieldState}
          isChallengeComplete={isChallengeComplete}
          onBackToResearch={() => setActiveTab('research')}
          onBackToBattlefield={() => setActiveTab('market-battlefield')}
          onOpenStrategyChallenge={() => setActiveTab('ai-strategy-challenge')}
        />
      ) : resolvedTab === 'market-battlefield' && isPositioningMapUnlocked ? (
        <MarketBattlefield
          venture={venture}
          enteredAlternatives={enteredAlternatives}
          completedAlternatives={completedAlternatives}
          isStatementSaved={isStatementSaved}
          onBackToResearch={() => setActiveTab('research')}
          onOpenPositioningStatement={() => setActiveTab('positioning-statement')}
        />
      ) : (
        <>
      <section
        aria-labelledby="competitor-research-heading"
        className="rounded-xl border border-slate-200 bg-white"
      >
        <div className="border-b border-slate-200 px-5 py-4 lg:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500">
                <span>Competitor Research Workspace</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums text-slate-700">
                  {summary.alternativesResearched} / 3 required completed
                </span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">
                  {alternatives.length} / {MAX_ALTERNATIVES} slots
                </span>
              </div>
              <h2
                id="competitor-research-heading"
                className="mt-1 text-lg font-semibold tracking-tight text-slate-900"
              >
                Research Real Market Alternatives
              </h2>
            </div>

            <button
              type="button"
              onClick={addAlternative}
              disabled={alternatives.length >= MAX_ALTERNATIVES}
              className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-medium transition-colors duration-150 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                alternatives.length >= MAX_ALTERNATIVES
                  ? 'cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400'
                  : 'bg-blue-700 text-white hover:bg-blue-800'
              }`}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              <span>
                {alternatives.length >= MAX_ALTERNATIVES
                  ? 'Maximum 6 Alternatives'
                  : 'Add Alternative'}
              </span>
            </button>
          </div>

          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50/70 px-4 py-3 text-xs text-slate-700">
            <p className="font-semibold text-slate-900">
              Evidence Quality Guide
            </p>
            <ul className="mt-1.5 grid grid-cols-1 gap-1.5 lg:grid-cols-3 lg:gap-4">
              {EVIDENCE_QUALITY_OPTIONS.map((option) => (
                <li key={option.value} className="leading-relaxed">
                  <span className="font-semibold text-slate-900">
                    {option.label}
                  </span>{' '}
                  = {option.description}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="divide-y divide-slate-200">
          {alternatives.map((alt, index) => {
            const completed = isAlternativeCompleted(alt);
            const hasEntry = hasAnyAlternativeEntry(alt);
            const isCollapsed = Boolean(collapsedIds[alt.id]);
            const canRemove = alternatives.length > MIN_ALTERNATIVES;
            const slotNumber = String(index + 1).padStart(2, '0');

            return (
              <div key={alt.id} className="px-5 py-5 lg:px-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2.5 min-w-0">
                    <span className="font-mono text-xs font-semibold text-slate-500 tabular-nums">
                      Alternative {slotNumber}
                    </span>
                    <span className="text-slate-300" aria-hidden="true">
                      ·
                    </span>
                    <h3 className="text-base font-semibold text-slate-900 truncate">
                      {alt.name.trim() || 'Untitled Alternative'}
                    </h3>
                    {alt.type && (
                      <>
                        <span className="text-slate-300" aria-hidden="true">
                          ·
                        </span>
                        <span className="text-xs font-medium text-slate-600">
                          {alt.type}
                        </span>
                      </>
                    )}
                    <span className="text-slate-300" aria-hidden="true">
                      ·
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 text-xs font-medium ${
                        completed ? 'text-emerald-700' : 'text-amber-700'
                      }`}
                    >
                      {completed ? (
                        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                      ) : (
                        <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
                      )}
                      <span>{completed ? 'Completed' : 'Evidence required'}</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {hasEntry && (
                      <button
                        type="button"
                        onClick={() => clearAlternative(alt.id)}
                        className="rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 whitespace-nowrap"
                      >
                        Clear Fields
                      </button>
                    )}

                    {canRemove && (
                      <button
                        type="button"
                        onClick={() => removeAlternative(alt.id)}
                        aria-label={`Remove alternative ${index + 1}`}
                        className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 whitespace-nowrap"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Remove</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => toggleCollapse(alt.id)}
                      aria-expanded={!isCollapsed}
                      className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 whitespace-nowrap"
                    >
                      <span>{isCollapsed ? 'Expand' : 'Collapse'}</span>
                      {isCollapsed ? (
                        <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                      ) : (
                        <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                </div>

                {!isCollapsed && (
                  <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <div>
                      <label
                        htmlFor={`${alt.id}-name`}
                        className="block text-xs font-medium text-slate-700"
                      >
                        1. Competitor / Alternative Name
                      </label>
                      <input
                        id={`${alt.id}-name`}
                        type="text"
                        value={alt.name}
                        onChange={(e) =>
                          updateAlternative(alt.id, { name: e.target.value })
                        }
                        placeholder="Enter competitor or alternative name"
                        className="mt-1.5 min-h-[40px] w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor={`${alt.id}-type`}
                        className="block text-xs font-medium text-slate-700"
                      >
                        2. Type
                      </label>
                      <select
                        id={`${alt.id}-type`}
                        value={alt.type}
                        onChange={(e) =>
                          updateAlternative(alt.id, {
                            type: e.target.value as AlternativeType | '',
                          })
                        }
                        className="mt-1.5 min-h-[40px] w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                      >
                        <option value="">Select type...</option>
                        {ALTERNATIVE_TYPES.map((typeOption) => (
                          <option key={typeOption} value={typeOption}>
                            {typeOption}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <label
                          htmlFor={`${alt.id}-price`}
                          className="block text-xs font-medium text-slate-700"
                        >
                          3. Approximate Price / Cost
                        </label>
                        <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-slate-600">
                          <input
                            type="checkbox"
                            checked={alt.priceNotApplicable}
                            onChange={(e) =>
                              updateAlternative(alt.id, {
                                priceNotApplicable: e.target.checked,
                              })
                            }
                            className="h-3.5 w-3.5 rounded border-slate-300 text-blue-700 focus:ring-blue-600"
                          />
                          <span>Not applicable</span>
                        </label>
                      </div>
                      <input
                        id={`${alt.id}-price`}
                        type="text"
                        value={
                          alt.priceNotApplicable ? 'Not applicable' : alt.priceCost
                        }
                        disabled={alt.priceNotApplicable}
                        onChange={(e) =>
                          updateAlternative(alt.id, {
                            priceCost: e.target.value,
                          })
                        }
                        placeholder="Enter approximate price or cost"
                        className={`mt-1.5 min-h-[40px] w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/20 ${
                          alt.priceNotApplicable
                            ? 'border-slate-200 bg-slate-100 text-slate-500'
                            : 'border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-blue-600'
                        }`}
                      />
                    </div>

                    <div>
                      <label
                        htmlFor={`${alt.id}-offer`}
                        className="block text-xs font-medium text-slate-700"
                      >
                        4. Main Offer
                      </label>
                      <textarea
                        id={`${alt.id}-offer`}
                        rows={2}
                        value={alt.mainOffer}
                        onChange={(e) =>
                          updateAlternative(alt.id, {
                            mainOffer: e.target.value,
                          })
                        }
                        placeholder="Describe what this alternative offers"
                        className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor={`${alt.id}-strength`}
                        className="block text-xs font-medium text-slate-700"
                      >
                        5. Main Strength
                      </label>
                      <textarea
                        id={`${alt.id}-strength`}
                        rows={2}
                        value={alt.mainStrength}
                        onChange={(e) =>
                          updateAlternative(alt.id, {
                            mainStrength: e.target.value,
                          })
                        }
                        placeholder="Enter primary strength observed"
                        className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor={`${alt.id}-weakness`}
                        className="block text-xs font-medium text-slate-700"
                      >
                        6. Main Weakness
                      </label>
                      <textarea
                        id={`${alt.id}-weakness`}
                        rows={2}
                        value={alt.mainWeakness}
                        onChange={(e) =>
                          updateAlternative(alt.id, {
                            mainWeakness: e.target.value,
                          })
                        }
                        placeholder="Enter primary weakness observed"
                        className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label
                        htmlFor={`${alt.id}-evidence`}
                        className="block text-xs font-medium text-slate-700"
                      >
                        7. Evidence / Source
                      </label>
                      <div className="mt-1.5 flex flex-col gap-2 sm:flex-row">
                        <select
                          aria-label={`Evidence source type for alternative ${index + 1}`}
                          value={alt.evidenceSourceType}
                          onChange={(e) =>
                            updateAlternative(alt.id, {
                              evidenceSourceType: e.target
                                .value as EvidenceSourceType | '',
                            })
                          }
                          className="min-h-[40px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 sm:w-52 sm:shrink-0"
                        >
                          <option value="">Source type (optional)...</option>
                          {EVIDENCE_SOURCE_TYPES.map((sourceType) => (
                            <option key={sourceType} value={sourceType}>
                              {sourceType}
                            </option>
                          ))}
                        </select>
                        <input
                          id={`${alt.id}-evidence`}
                          type="text"
                          value={alt.evidenceSource}
                          onChange={(e) =>
                            updateAlternative(alt.id, {
                              evidenceSource: e.target.value,
                            })
                          }
                          placeholder="Paste website URL, product/price page, app listing, review source, or observation note"
                          className="min-h-[40px] w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                        />
                      </div>
                    </div>

                    <div>
                      <span className="block text-xs font-medium text-slate-700">
                        8. Evidence Quality
                      </span>
                      <div
                        role="group"
                        aria-label={`Evidence quality for alternative ${index + 1}`}
                        className="mt-1.5 grid grid-cols-3 gap-1 rounded-lg bg-slate-100 p-1"
                      >
                        {(['Strong', 'Moderate', 'Weak'] as EvidenceQuality[]).map(
                          (quality) => {
                            const selected = alt.evidenceQuality === quality;
                            return (
                              <button
                                key={quality}
                                type="button"
                                aria-pressed={selected}
                                onClick={() =>
                                  updateAlternative(alt.id, {
                                    evidenceQuality: selected ? '' : quality,
                                  })
                                }
                                className={`min-h-[34px] rounded-md px-2 py-1.5 text-xs font-medium transition-colors duration-150 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                                  selected
                                    ? quality === 'Strong'
                                      ? 'bg-emerald-700 text-white shadow-xs'
                                      : quality === 'Moderate'
                                        ? 'bg-amber-600 text-white shadow-xs'
                                        : 'bg-slate-800 text-white shadow-xs'
                                    : 'text-slate-600 hover:text-slate-900'
                                }`}
                              >
                                {quality}
                              </button>
                            );
                          }
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section
        aria-labelledby="competitor-matrix-heading"
        className="rounded-xl border border-slate-200 bg-white"
      >
        <div className="border-b border-slate-200 px-5 py-4 lg:px-6">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
            <h2
              id="competitor-matrix-heading"
              className="text-lg font-semibold tracking-tight text-slate-900"
            >
              Competitor Matrix
            </h2>
            <p className="text-xs text-slate-500">
              Built strictly from your entered research · Missing fields display
              Evidence required
            </p>
          </div>

          <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 sm:grid-cols-3 lg:grid-cols-6">
            <div>
              <dt className="text-xs font-medium text-slate-500">
                Alternatives researched
              </dt>
              <dd className="mt-1 font-mono text-xl font-semibold text-slate-900 tabular-nums">
                {summary.alternativesResearched}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">
                Direct competitors
              </dt>
              <dd className="mt-1 font-mono text-xl font-semibold text-slate-900 tabular-nums">
                {summary.directCompetitors}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">
                Indirect competitors
              </dt>
              <dd className="mt-1 font-mono text-xl font-semibold text-slate-900 tabular-nums">
                {summary.indirectCompetitors}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">Substitutes</dt>
              <dd className="mt-1 font-mono text-xl font-semibold text-slate-900 tabular-nums">
                {summary.substitutes}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">
                Do-Nothing alternatives
              </dt>
              <dd className="mt-1 font-mono text-xl font-semibold text-slate-900 tabular-nums">
                {summary.doNothingAlternatives}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">
                Overall evidence quality
              </dt>
              <dd className="mt-1 text-base font-semibold text-slate-900">
                {summary.overallEvidenceQuality ?? (
                  <span className="text-sm font-medium text-amber-700">
                    Evidence required
                  </span>
                )}
              </dd>
              {summary.alternativesResearched > 0 && (
                <p className="mt-0.5 text-[11px] text-slate-500 tabular-nums">
                  {summary.qualityBreakdown.strong} Strong ·{' '}
                  {summary.qualityBreakdown.moderate} Moderate ·{' '}
                  {summary.qualityBreakdown.weak} Weak
                </p>
              )}
            </div>
          </dl>
        </div>

        {enteredAlternatives.length === 0 ? (
          <div className="px-5 py-10 text-center lg:px-6">
            <p className="text-sm font-medium text-slate-900">
              No competitor entries recorded yet.
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Enter real market alternatives in the workspace above to populate
              your Competitor Matrix.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-medium text-slate-500">
                  <th scope="col" className="py-3 pl-5 pr-3 min-w-[150px] lg:pl-6">
                    Competitor / Alternative
                  </th>
                  <th scope="col" className="py-3 px-3 min-w-[130px]">
                    Type
                  </th>
                  <th scope="col" className="py-3 px-3 min-w-[120px]">
                    Price / Cost
                  </th>
                  <th scope="col" className="py-3 px-3 min-w-[180px]">
                    Main Offer
                  </th>
                  <th scope="col" className="py-3 px-3 min-w-[170px]">
                    Main Strength
                  </th>
                  <th scope="col" className="py-3 px-3 min-w-[170px]">
                    Main Weakness
                  </th>
                  <th scope="col" className="py-3 px-3 min-w-[190px]">
                    Evidence / Source
                  </th>
                  <th scope="col" className="py-3 pl-3 pr-5 min-w-[120px] lg:pr-6">
                    Evidence Quality
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                {enteredAlternatives.map((alt) => {
                  const renderField = (value: string) =>
                    value.trim() ? (
                      <span className="text-slate-800">{value}</span>
                    ) : (
                      <span className="font-medium text-amber-700">
                        Evidence required
                      </span>
                    );

                  const priceDisplay = alt.priceNotApplicable ? (
                    <span className="text-slate-600">Not applicable</span>
                  ) : (
                    renderField(alt.priceCost)
                  );

                  const evidenceDisplay = alt.evidenceSource.trim() ? (
                    <span className="text-slate-700 break-words">
                      {alt.evidenceSourceType ? (
                        <span className="font-medium text-slate-900">
                          {alt.evidenceSourceType}:{' '}
                        </span>
                      ) : null}
                      {alt.evidenceSource}
                    </span>
                  ) : (
                    <span className="font-medium text-amber-700">
                      Evidence required
                    </span>
                  );

                  return (
                    <tr key={alt.id} className="align-top hover:bg-slate-50/70">
                      <td className="py-3.5 pl-5 pr-3 font-semibold text-slate-900 lg:pl-6">
                        {renderField(alt.name)}
                      </td>
                      <td className="py-3.5 px-3 text-slate-700">
                        {alt.type ? (
                          alt.type
                        ) : (
                          <span className="font-medium text-amber-700">
                            Evidence required
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-3">{priceDisplay}</td>
                      <td className="py-3.5 px-3 leading-snug">
                        {renderField(alt.mainOffer)}
                      </td>
                      <td className="py-3.5 px-3 leading-snug">
                        {renderField(alt.mainStrength)}
                      </td>
                      <td className="py-3.5 px-3 leading-snug">
                        {renderField(alt.mainWeakness)}
                      </td>
                      <td className="py-3.5 px-3 leading-snug">
                        {evidenceDisplay}
                      </td>
                      <td className="py-3.5 pl-3 pr-5 lg:pr-6">
                        {alt.evidenceQuality ? (
                          <span
                            className={`font-semibold ${
                              alt.evidenceQuality === 'Strong'
                                ? 'text-emerald-700'
                                : alt.evidenceQuality === 'Moderate'
                                  ? 'text-amber-700'
                                  : 'text-slate-700'
                            }`}
                          >
                            {alt.evidenceQuality}
                          </span>
                        ) : (
                          <span className="font-medium text-amber-700">
                            Evidence required
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section aria-labelledby="lab-progression-heading">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2
            id="lab-progression-heading"
            className="text-base font-semibold tracking-tight text-slate-900"
          >
            Competition & Positioning Progression
          </h2>
          <span className="text-xs text-slate-500 tabular-nums">
            {isPositioningMapUnlocked
              ? 'Market Battlefield (Positioning Map) unlocked'
              : `Complete ${Math.max(0, 3 - summary.alternativesResearched)} more ${
                  3 - summary.alternativesResearched === 1
                    ? 'alternative'
                    : 'alternatives'
                } to unlock Market Battlefield`}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div
            className={`rounded-xl border p-4 ${
              isPositioningMapUnlocked
                ? 'border-emerald-200 bg-emerald-50/40'
                : 'border-slate-200 bg-white'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {isPositioningMapUnlocked ? (
                  <Unlock
                    className="h-4 w-4 text-emerald-700 shrink-0"
                    aria-hidden="true"
                  />
                ) : (
                  <Lock
                    className="h-4 w-4 text-slate-400 shrink-0"
                    aria-hidden="true"
                  />
                )}
                <h3 className="text-sm font-semibold text-slate-900">
                  Market Battlefield · Positioning Map
                </h3>
              </div>
              <span
                className={`text-xs font-medium ${
                  isPositioningMapUnlocked
                    ? 'text-emerald-700'
                    : 'text-slate-400'
                }`}
              >
                {isPositioningMapUnlocked ? 'Unlocked' : 'Locked'}
              </span>
            </div>
            <p className="mt-2 text-xs text-slate-600 leading-relaxed">
              {isPositioningMapUnlocked
                ? `Unlocked with ${summary.alternativesResearched} completed alternatives. Define your axes and plot your positioning map.`
                : 'Complete competitor research first.'}
            </p>
            {isPositioningMapUnlocked && (
              <button
                type="button"
                onClick={() => setActiveTab('market-battlefield')}
                className="mt-3 inline-flex min-h-[36px] items-center gap-1.5 rounded-lg bg-blue-700 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 whitespace-nowrap"
              >
                <span>Open Market Battlefield</span>
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}
          </div>

          <div
            className={`rounded-xl border p-4 ${
              isBattlefieldComplete
                ? 'border-emerald-200 bg-emerald-50/40'
                : 'border-slate-200 bg-white'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {isBattlefieldComplete ? (
                  <Unlock
                    className="h-4 w-4 text-emerald-700 shrink-0"
                    aria-hidden="true"
                  />
                ) : (
                  <Lock
                    className="h-4 w-4 text-slate-400 shrink-0"
                    aria-hidden="true"
                  />
                )}
                <h3 className="text-sm font-semibold text-slate-900">
                  Positioning Statement
                </h3>
              </div>
              <span
                className={`text-xs font-medium ${
                  isBattlefieldComplete ? 'text-emerald-700' : 'text-slate-400'
                }`}
              >
                {isBattlefieldComplete ? 'Unlocked' : 'Locked'}
              </span>
            </div>
            <p className="mt-2 text-xs text-slate-600 leading-relaxed">
              {isBattlefieldComplete
                ? 'Positioning map complete. Build and validate your positioning statement.'
                : 'Complete positioning map first.'}
            </p>
            {isBattlefieldComplete && (
              <button
                type="button"
                onClick={() => setActiveTab('positioning-statement')}
                className="mt-3 inline-flex min-h-[36px] items-center gap-1.5 rounded-lg bg-blue-700 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 whitespace-nowrap"
              >
                <span>Open Positioning Statement</span>
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}
          </div>

          <div
            className={`rounded-xl border p-4 ${
              isStatementSaved
                ? 'border-emerald-200 bg-emerald-50/40'
                : 'border-slate-200 bg-white'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {isStatementSaved ? (
                  <Unlock
                    className="h-4 w-4 text-emerald-700 shrink-0"
                    aria-hidden="true"
                  />
                ) : (
                  <Lock
                    className="h-4 w-4 text-slate-400 shrink-0"
                    aria-hidden="true"
                  />
                )}
                <h3 className="text-sm font-semibold text-slate-900">
                  AI Strategy Challenge
                </h3>
              </div>
              <span
                className={`text-xs font-medium ${
                  isStatementSaved ? 'text-emerald-700' : 'text-slate-400'
                }`}
              >
                {isStatementSaved ? 'Unlocked' : 'Locked'}
              </span>
            </div>
            <p className="mt-2 text-xs text-slate-600 leading-relaxed">
              {isStatementSaved
                ? 'Positioning statement saved. Stress-test your strategy against Gemini’s 3-question challenge.'
                : 'Complete positioning statement first.'}
            </p>
            {isStatementSaved && (
              <button
                type="button"
                onClick={() => setActiveTab('ai-strategy-challenge')}
                className="mt-3 inline-flex min-h-[36px] items-center gap-1.5 rounded-lg bg-blue-700 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 whitespace-nowrap"
              >
                <span>Open AI Strategy Challenge</span>
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      </section>
      </>
      )}

      {switchWarningOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="switch-venture-title"
          aria-describedby="switch-venture-description"
        >
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle
                className="mt-0.5 h-5 w-5 text-amber-600 shrink-0"
                aria-hidden="true"
              />
              <div>
                <h3
                  id="switch-venture-title"
                  className="text-base font-semibold text-slate-900"
                >
                  Switch Venture
                </h3>
                <p
                  id="switch-venture-description"
                  className="mt-2 text-sm text-slate-600 leading-relaxed"
                >
                  Changing venture may make the existing competitor research
                  irrelevant. Continue?
                </p>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setSwitchWarningOpen(false)}
                className="min-h-[40px] rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setSwitchWarningOpen(false);
                  onConfirmSwitchVenture();
                }}
                className="min-h-[40px] rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

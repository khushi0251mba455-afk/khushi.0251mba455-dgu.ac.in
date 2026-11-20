import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  FileText,
  Lock,
  RotateCcw,
  Save,
  Unlock,
} from 'lucide-react';
import { useMemo } from 'react';
import {
  evaluatePositioningStatement,
  formatPositioningStatement,
  isPositioningStatementSaved,
  isStatementFieldsComplete,
  usePositioningStatement,
} from '../hooks/usePositioningStatement';
import {
  CompetitorAlternative,
  MarketBattlefieldState,
  PositioningCheckRating,
  Venture,
} from '../types/venture';

interface PositioningStatementProps {
  venture: Venture;
  enteredAlternatives: CompetitorAlternative[];
  battlefieldState: MarketBattlefieldState;
  isChallengeComplete?: boolean;
  onBackToResearch: () => void;
  onBackToBattlefield: () => void;
  onOpenStrategyChallenge: () => void;
}

function getRatingStyles(rating: PositioningCheckRating) {
  if (rating === 'Strong') {
    return {
      textClass: 'text-emerald-700',
      borderClass: 'border-emerald-200 bg-emerald-50/40',
      Icon: CheckCircle2,
    };
  }
  if (rating === 'Needs Improvement') {
    return {
      textClass: 'text-amber-700',
      borderClass: 'border-amber-200 bg-amber-50/40',
      Icon: AlertTriangle,
    };
  }
  return {
    textClass: 'text-red-700',
    borderClass: 'border-red-200 bg-red-50/40',
    Icon: AlertCircle,
  };
}

export function PositioningStatement({
  venture,
  enteredAlternatives,
  battlefieldState,
  isChallengeComplete = false,
  onBackToResearch,
  onBackToBattlefield,
  onOpenStrategyChallenge,
}: PositioningStatementProps) {
  const { state, updateField, setManualStatement, saveStatement } =
    usePositioningStatement(venture.id, venture.targetCustomer);

  const selectedAlternative = useMemo(
    () =>
      enteredAlternatives.find((a) => a.id === state.mainAlternativeId) ?? null,
    [enteredAlternatives, state.mainAlternativeId]
  );

  const generatedStatement = useMemo(
    () =>
      formatPositioningStatement(
        state,
        venture.name,
        selectedAlternative?.name.trim() || ''
      ),
    [state, venture.name, selectedAlternative]
  );

  const displayedStatement =
    state.manualStatement !== null ? state.manualStatement : generatedStatement;

  const fieldsComplete = useMemo(
    () => isStatementFieldsComplete(state, enteredAlternatives),
    [state, enteredAlternatives]
  );

  const canSave = fieldsComplete && displayedStatement.trim().length > 0;
  const isSaved = useMemo(
    () => isPositioningStatementSaved(state, enteredAlternatives),
    [state, enteredAlternatives]
  );
  const hasUnsavedChanges =
    isSaved && state.savedStatement?.trim() !== displayedStatement.trim();

  const evaluations = useMemo(
    () =>
      evaluatePositioningStatement({
        venture,
        state,
        enteredAlternatives,
        battlefieldState,
        finalStatementText: displayedStatement,
      }),
    [venture, state, enteredAlternatives, battlefieldState, displayedStatement]
  );

  return (
    <div className="space-y-6">
      {/* PURPOSE */}
      <section
        aria-labelledby="positioning-statement-purpose-heading"
        className="rounded-xl border border-slate-200 bg-white px-5 py-5 lg:px-6"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 text-xs font-medium text-blue-700">
              <FileText className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Stage 01 · Positioning Statement</span>
            </div>
            <h2
              id="positioning-statement-purpose-heading"
              className="mt-1.5 text-xl font-bold tracking-tight text-slate-900"
            >
              Build & Validate Your Positioning Statement
            </h2>
            <p className="mt-2 text-sm text-slate-700 leading-relaxed">
              “A positioning statement defines how the venture should be
              understood by its target customer relative to competing
              alternatives.”
            </p>
            <p className="mt-2.5 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-700 leading-relaxed">
              <span className="font-semibold text-slate-900">Structure:</span>{' '}
              For [Target Customer], our venture is a [Category / Type of
              Solution] that provides [Primary Benefit], unlike [Main
              Alternative], because [Reason to Believe].
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onBackToResearch}
              className="inline-flex min-h-[38px] items-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 whitespace-nowrap"
            >
              Competitor Matrix
            </button>
            <button
              type="button"
              onClick={onBackToBattlefield}
              className="inline-flex min-h-[38px] items-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 whitespace-nowrap"
            >
              Positioning Map
            </button>
          </div>
        </div>

        {/* Grounded Existing Evidence Reference */}
        <dl className="mt-4 grid grid-cols-1 gap-3 border-t border-slate-100 pt-4 text-xs md:grid-cols-3">
          <div>
            <dt className="font-medium text-slate-500">
              Venture Offer (from Profile)
            </dt>
            <dd className="mt-0.5 text-slate-800">{venture.offer}</dd>
          </div>
          <div>
            <dt className="font-medium text-slate-500">
              Problem Addressed (from Profile)
            </dt>
            <dd className="mt-0.5 text-slate-800">{venture.problem}</dd>
          </div>
          <div>
            <dt className="font-medium text-slate-500">
              Positioning Map Coordinates
            </dt>
            <dd className="mt-0.5 font-mono text-slate-800 tabular-nums">
              {battlefieldState.axes.xName.trim()}:{' '}
              {battlefieldState.ventureScore.x}/10 ·{' '}
              {battlefieldState.axes.yName.trim()}:{' '}
              {battlefieldState.ventureScore.y}/10
            </dd>
          </div>
        </dl>
      </section>

      {/* STEP 1 — BUILD THE STATEMENT */}
      <section
        aria-labelledby="step1-build-statement-heading"
        className="rounded-xl border border-slate-200 bg-white"
      >
        <div className="border-b border-slate-200 px-5 py-4 lg:px-6">
          <p className="text-xs font-medium text-slate-500">
            Step 1 & Step 4 · Build & Revise Components
          </p>
          <h3
            id="step1-build-statement-heading"
            className="mt-0.5 text-lg font-semibold tracking-tight text-slate-900"
          >
            Enter the Five Positioning Components
          </h3>
          <p className="mt-1 text-xs text-slate-600">
            Only information already in your Venture Profile is pre-filled. Any
            component change automatically updates the statement below.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 p-5 lg:grid-cols-2 lg:p-6">
          <div>
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor="ps-target-customer"
                className="block text-xs font-semibold text-slate-800"
              >
                1. Target Customer
              </label>
              {state.targetCustomer.trim() !== venture.targetCustomer.trim() && (
                <button
                  type="button"
                  onClick={() =>
                    updateField({ targetCustomer: venture.targetCustomer })
                  }
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded"
                >
                  <RotateCcw className="h-3 w-3" aria-hidden="true" />
                  <span>Reset to Venture Profile</span>
                </button>
              )}
            </div>
            <input
              id="ps-target-customer"
              type="text"
              value={state.targetCustomer}
              onChange={(e) =>
                updateField({ targetCustomer: e.target.value })
              }
              placeholder="Enter your target customer"
              className="mt-1.5 min-h-[40px] w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
            />
          </div>

          <div>
            <label
              htmlFor="ps-category"
              className="block text-xs font-semibold text-slate-800"
            >
              2. Category / Type of Solution
            </label>
            <input
              id="ps-category"
              type="text"
              value={state.category}
              onChange={(e) => updateField({ category: e.target.value })}
              placeholder="Describe what kind of solution your venture is"
              className="mt-1.5 min-h-[40px] w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
            />
          </div>

          <div>
            <label
              htmlFor="ps-primary-benefit"
              className="block text-xs font-semibold text-slate-800"
            >
              3. Primary Benefit
            </label>
            <textarea
              id="ps-primary-benefit"
              rows={2}
              value={state.primaryBenefit}
              onChange={(e) =>
                updateField({ primaryBenefit: e.target.value })
              }
              placeholder="State the single most important benefit for the target customer"
              className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
            />
          </div>

          <div>
            <label
              htmlFor="ps-main-alternative"
              className="block text-xs font-semibold text-slate-800"
            >
              4. Main Alternative (from Competitor Matrix)
            </label>
            <select
              id="ps-main-alternative"
              value={state.mainAlternativeId}
              onChange={(e) =>
                updateField({ mainAlternativeId: e.target.value })
              }
              className="mt-1.5 min-h-[40px] w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
            >
              <option value="">
                Select one alternative from your Competitor Matrix...
              </option>
              {enteredAlternatives.map((alt) => (
                <option key={alt.id} value={alt.id}>
                  {alt.name.trim() || 'Untitled Alternative'} (
                  {alt.type || 'Type not selected'})
                </option>
              ))}
            </select>

            {selectedAlternative && (
              <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs text-slate-600 space-y-1">
                <p>
                  <span className="font-semibold text-slate-800">
                    Documented Weakness:
                  </span>{' '}
                  {selectedAlternative.mainWeakness.trim() || (
                    <span className="font-medium text-amber-700">
                      Evidence required
                    </span>
                  )}
                </p>
                <p>
                  <span className="font-semibold text-slate-800">
                    Evidence Quality:
                  </span>{' '}
                  {selectedAlternative.evidenceQuality || (
                    <span className="font-medium text-amber-700">
                      Evidence required
                    </span>
                  )}
                </p>
              </div>
            )}
          </div>

          <div className="lg:col-span-2">
            <label
              htmlFor="ps-reason-to-believe"
              className="block text-xs font-semibold text-slate-800"
            >
              5. Reason to Believe (must be grounded in actual venture features,
              evidence, or capabilities)
            </label>
            <textarea
              id="ps-reason-to-believe"
              rows={2}
              value={state.reasonToBelieve}
              onChange={(e) =>
                updateField({ reasonToBelieve: e.target.value })
              }
              placeholder="Explain why customers should believe the primary benefit using real features, capabilities, or research evidence"
              className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
            />
          </div>
        </div>
      </section>

      {/* STEP 2 — GENERATED & MANUALLY EDITABLE HIGHLIGHTED STATEMENT CARD */}
      <section
        aria-labelledby="step2-generated-statement-heading"
        className="rounded-xl border-2 border-blue-300 bg-blue-50/40 p-5 lg:p-6"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-blue-800">
              <span>Step 2 · Generated Positioning Statement</span>
              {state.manualStatement !== null && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>Manually Edited</span>
                </>
              )}
              {isSaved && !hasUnsavedChanges && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-emerald-700">Saved</span>
                </>
              )}
              {hasUnsavedChanges && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-amber-700">Unsaved revisions</span>
                </>
              )}
            </div>
            <h3
              id="step2-generated-statement-heading"
              className="mt-1 text-base font-bold text-slate-900"
            >
              Positioning Statement Draft
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {state.manualStatement !== null && (
              <button
                type="button"
                onClick={() => setManualStatement(null)}
                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-xs font-medium text-blue-800 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 whitespace-nowrap"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Sync from 5 Fields</span>
              </button>
            )}

            <button
              type="button"
              disabled={!canSave}
              onClick={() => saveStatement(displayedStatement)}
              className={`inline-flex min-h-[40px] items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors duration-150 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                canSave
                  ? 'bg-blue-700 text-white hover:bg-blue-800'
                  : 'cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400'
              }`}
            >
              <Save className="h-4 w-4" aria-hidden="true" />
              <span>Save Positioning Statement</span>
            </button>
          </div>
        </div>

        <div className="mt-4">
          <label htmlFor="ps-final-statement" className="sr-only">
            Edit final positioning statement
          </label>
          <textarea
            id="ps-final-statement"
            rows={3}
            value={displayedStatement}
            onChange={(e) => setManualStatement(e.target.value)}
            className="w-full rounded-lg border border-blue-200 bg-white px-4 py-3 text-base font-medium text-slate-900 leading-relaxed focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
          />
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
            <span>
              You can edit the statement directly above, or revise any of the 5
              fields in Step 1 to regenerate it automatically.
            </span>
            {!fieldsComplete && (
              <span className="font-medium text-amber-700">
                Complete all 5 fields in Step 1 to save your positioning
                statement.
              </span>
            )}
          </div>
        </div>
      </section>

      {/* STEP 3 — CHECK THE POSITIONING */}
      <section
        aria-labelledby="step3-check-positioning-heading"
        className="rounded-xl border border-slate-200 bg-white"
      >
        <div className="border-b border-slate-200 px-5 py-4 lg:px-6">
          <p className="text-xs font-medium text-slate-500">Step 3 of 4</p>
          <h3
            id="step3-check-positioning-heading"
            className="mt-0.5 text-lg font-semibold tracking-tight text-slate-900"
          >
            Check the Positioning
          </h3>
          <p className="mt-1 text-xs text-slate-600">
            Evaluates your statement strictly against your Venture Profile,
            Competitor Matrix, and Positioning Map without automatically
            rewriting your text.
          </p>
        </div>

        <div className="divide-y divide-slate-200">
          {evaluations.map((item) => {
            const { textClass, Icon } = getRatingStyles(item.rating);

            return (
              <div
                key={item.dimension}
                className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-start sm:justify-between lg:px-6"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h4 className="text-sm font-semibold text-slate-900">
                      {item.dimension}
                    </h4>
                    {item.needsEvidence && (
                      <span className="inline-flex items-center gap-1 rounded border border-red-200 bg-red-50 px-2 py-0.5 font-mono text-[11px] font-semibold text-red-700">
                        NEEDS EVIDENCE
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                    {item.explanation}
                  </p>
                </div>

                <div
                  className={`inline-flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap shrink-0 ${textClass}`}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{item.rating}</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* PROGRESSION RULE — AI STRATEGY CHALLENGE & COMPETITION WAR ROOM */}
      <section aria-labelledby="statement-progression-heading">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h3
            id="statement-progression-heading"
            className="text-base font-semibold tracking-tight text-slate-900"
          >
            Next Stage Progression
          </h3>
          <span className="text-xs text-slate-500">
            {isSaved
              ? 'AI Strategy Challenge is unlocked'
              : 'Save a complete positioning statement to unlock AI Strategy Challenge'}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div
            className={`rounded-xl border p-4 ${
              isSaved
                ? 'border-emerald-200 bg-emerald-50/40'
                : 'border-slate-200 bg-white'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {isSaved ? (
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
                <h4 className="text-sm font-semibold text-slate-900">
                  AI Strategy Challenge
                </h4>
              </div>
              <span
                className={`text-xs font-medium ${
                  isSaved ? 'text-emerald-700' : 'text-slate-400'
                }`}
              >
                {isSaved ? 'Unlocked' : 'Locked'}
              </span>
            </div>
            <p className="mt-2 text-xs text-slate-600 leading-relaxed">
              {isSaved
                ? 'Your positioning statement is saved. Test whether your competitive position holds up under Gemini’s 3-question strategy challenge.'
                : 'Complete and save your positioning statement first.'}
            </p>
            {isSaved && (
              <button
                type="button"
                onClick={onOpenStrategyChallenge}
                className="mt-3 inline-flex min-h-[36px] items-center gap-1.5 rounded-lg bg-blue-700 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 whitespace-nowrap"
              >
                <span>Open AI Strategy Challenge</span>
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}
          </div>

          <div
            className={`rounded-xl border p-4 ${
              isChallengeComplete
                ? 'border-emerald-200 bg-emerald-50/40'
                : 'border-slate-200 bg-white'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {isChallengeComplete ? (
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
                <h4 className="text-sm font-semibold text-slate-900">
                  Competition War Room
                </h4>
              </div>
              <span
                className={`text-xs font-medium ${
                  isChallengeComplete ? 'text-emerald-700' : 'text-slate-400'
                }`}
              >
                {isChallengeComplete ? 'Unlocked' : 'Locked'}
              </span>
            </div>
            <p className="mt-2 text-xs text-slate-600 leading-relaxed">
              {isChallengeComplete
                ? 'AI Strategy Challenge complete. Competition War Room will open in the next studio session.'
                : 'Complete AI Strategy Challenge first.'}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

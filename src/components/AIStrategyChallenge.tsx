import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Lock,
  RotateCcw,
  ShieldAlert,
  Unlock,
} from 'lucide-react';
import { useMemo } from 'react';
import {
  buildStrategyDossier,
  isStrategyChallengeComplete,
  useStrategyChallenge,
} from '../hooks/useStrategyChallenge';
import {
  CompetitorAlternative,
  MarketBattlefieldState,
  PositioningStatementState,
  Venture,
} from '../types/venture';

interface AIStrategyChallengeProps {
  venture: Venture;
  enteredAlternatives: CompetitorAlternative[];
  battlefieldState: MarketBattlefieldState;
  statementState: PositioningStatementState;
  onBackToStatement: () => void;
}

export function AIStrategyChallenge({
  venture,
  enteredAlternatives,
  battlefieldState,
  statementState,
  onBackToStatement,
}: AIStrategyChallengeProps) {
  const {
    state,
    loadingStep,
    errorMessage,
    updateDraftResponse,
    generateQuestions,
    submitDefense,
    goToNextChallenge,
    generateFinalReview,
    resetChallenge,
  } = useStrategyChallenge(venture.id);

  const dossier = useMemo(
    () =>
      buildStrategyDossier({
        venture,
        enteredAlternatives,
        battlefieldState,
        statementState,
      }),
    [venture, enteredAlternatives, battlefieldState, statementState]
  );

  const hasQuestions = state.questions.length === 3;
  const isComplete = isStrategyChallengeComplete(state);
  const activeQuestion = hasQuestions
    ? state.questions[state.currentIndex] ?? state.questions[0]
    : null;
  const activeDefense = activeQuestion
    ? state.responses[activeQuestion.id] ?? ''
    : '';
  const activeFeedback = activeQuestion
    ? state.feedbacks[activeQuestion.id] ?? null
    : null;

  return (
    <div className="space-y-6">
      {/* PURPOSE & STEP 1 — REVIEW EXISTING INFORMATION */}
      <section
        aria-labelledby="ai-challenge-purpose-heading"
        className="rounded-xl border border-slate-200 bg-white px-5 py-5 lg:px-6"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 text-xs font-medium text-blue-700">
              <ShieldAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Stage 01 · AI Strategy Challenge</span>
            </div>
            <h2
              id="ai-challenge-purpose-heading"
              className="mt-1.5 text-xl font-bold tracking-tight text-slate-900"
            >
              AI Strategy Challenge
            </h2>
            <p className="mt-2 text-sm text-slate-700 leading-relaxed">
              “The AI Strategy Challenge tests whether your competitive position
              is logically defensible and supported by evidence.”
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Gemini acts strictly as a strategy challenger using only your
              entered Venture Profile, Competitor Research, Competitor Matrix,
              Positioning Map, and Positioning Statement.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onBackToStatement}
              className="inline-flex min-h-[38px] items-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 whitespace-nowrap"
            >
              Review Positioning Statement
            </button>
            {hasQuestions && (
              <button
                type="button"
                onClick={resetChallenge}
                disabled={loadingStep !== null}
                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 whitespace-nowrap"
              >
                <RotateCcw className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
                <span>Restart Challenge</span>
              </button>
            )}
          </div>
        </div>

        {/* Step 1 Dossier Snapshot */}
        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50/70 p-4">
          <p className="text-xs font-semibold text-slate-900">
            Step 1 · Existing Information Reviewed for This Challenge
          </p>
          <dl className="mt-2.5 grid grid-cols-1 gap-3 text-xs md:grid-cols-4">
            <div>
              <dt className="font-medium text-slate-500">Venture & Offer</dt>
              <dd className="mt-0.5 text-slate-800">
                {dossier.ventureProfile.name} · {dossier.ventureProfile.offer}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">Competitor Matrix</dt>
              <dd className="mt-0.5 text-slate-800 tabular-nums">
                {dossier.competitorMatrixSummary.alternativesResearched}{' '}
                researched · Overall Evidence:{' '}
                {dossier.competitorMatrixSummary.overallEvidenceQuality ??
                  'Evidence required'}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">Positioning Map</dt>
              <dd className="mt-0.5 text-slate-800 tabular-nums">
                {dossier.positioningMap.xAxis} (
                {dossier.positioningMap.ventureScores.x}/10) ·{' '}
                {dossier.positioningMap.yAxis} (
                {dossier.positioningMap.ventureScores.y}/10)
              </dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">
                Saved Positioning Statement
              </dt>
              <dd className="mt-0.5 text-slate-800 line-clamp-2" title={dossier.positioningStatement.savedStatement}>
                {dossier.positioningStatement.savedStatement}
              </dd>
            </div>
          </dl>
        </div>
      </section>

      {errorMessage && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-900"
        >
          <AlertCircle className="mt-0.5 h-5 w-5 text-red-700 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-semibold">Unable to complete Gemini request</p>
            <p className="mt-0.5 text-xs text-red-800">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* STEP 2 INITIAL LAUNCH */}
      {!hasQuestions && (
        <section
          aria-labelledby="start-challenge-heading"
          className="rounded-xl border border-slate-200 bg-white px-6 py-10 text-center"
        >
          <h3
            id="start-challenge-heading"
            className="text-lg font-semibold text-slate-900"
          >
            Ready to Stress-Test Your Competitive Position
          </h3>
          <p className="mx-auto mt-2 max-w-xl text-sm text-slate-600 leading-relaxed">
            Gemini will examine your entered research, positioning map scores,
            and positioning statement to generate 3 hard, venture-specific
            challenge questions. You will defend each one in your own words.
          </p>

          <div className="mt-6">
            <button
              type="button"
              disabled={loadingStep === 'questions'}
              onClick={() => generateQuestions(dossier)}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-blue-700 px-6 py-2.5 text-sm font-medium text-white transition-colors duration-150 hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-blue-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
            >
              {loadingStep === 'questions' ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  <span>Reviewing Dossier & Generating Challenges...</span>
                </>
              ) : (
                <>
                  <span>Challenge My Strategy</span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </>
              )}
            </button>
          </div>
        </section>
      )}

      {/* STEPS 2–5: ACTIVE ONE-AT-A-TIME CHALLENGE */}
      {hasQuestions && !isComplete && activeQuestion && (
        <section
          aria-labelledby="active-challenge-heading"
          className="rounded-xl border border-slate-200 bg-white"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4 lg:px-6">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="font-mono text-xs font-semibold text-blue-700 tabular-nums">
                Challenge {state.currentIndex + 1} of 3
              </span>
              <span className="text-slate-300" aria-hidden="true">
                ·
              </span>
              <span className="text-xs font-medium text-slate-600">
                {activeQuestion.focusArea}
              </span>
            </div>

            <div className="flex items-center gap-1.5" aria-hidden="true">
              {state.questions.map((q, idx) => {
                const done = Boolean(state.feedbacks[q.id]);
                const current = idx === state.currentIndex;
                return (
                  <span
                    key={q.id}
                    className={`h-2 w-8 rounded-sm ${
                      done
                        ? 'bg-emerald-600'
                        : current
                          ? 'bg-blue-700'
                          : 'bg-slate-200'
                    }`}
                  />
                );
              })}
            </div>
          </div>

          <div className="space-y-5 p-5 lg:p-6">
            <div>
              <h3
                id="active-challenge-heading"
                className="text-lg font-semibold text-slate-900 leading-snug"
              >
                {activeQuestion.question}
              </h3>
            </div>

            {/* STEP 3 — DEFENCE INPUT */}
            <div>
              <label
                htmlFor={`defence-${activeQuestion.id}`}
                className="block text-xs font-semibold text-slate-700"
              >
                Your Strategy Defence
              </label>
              <textarea
                id={`defence-${activeQuestion.id}`}
                rows={4}
                value={activeDefense}
                disabled={loadingStep === 'feedback' || loadingStep === 'review'}
                onChange={(e) =>
                  updateDraftResponse(activeQuestion.id, e.target.value)
                }
                placeholder="Write your defence using logic and evidence from your research..."
                className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 disabled:bg-slate-50"
              />

              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  disabled={
                    !activeDefense.trim() ||
                    loadingStep === 'feedback' ||
                    loadingStep === 'review'
                  }
                  onClick={() =>
                    submitDefense(dossier, activeQuestion, activeDefense)
                  }
                  className="inline-flex min-h-[40px] items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                >
                  {loadingStep === 'feedback' ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      <span>Evaluating Defence...</span>
                    </>
                  ) : (
                    <span>
                      {activeFeedback
                        ? 'Resubmit My Defence'
                        : 'Submit My Defence'}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* STEP 4 — GEMINI FEEDBACK */}
            {activeFeedback && (
              <div className="space-y-4 border-t border-slate-200 pt-5">
                <p className="text-xs font-semibold text-slate-500">
                  Gemini Challenger Feedback
                </p>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50/40 p-4">
                    <div className="flex items-center gap-1.5 text-xs font-bold tracking-wide text-emerald-800">
                      <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                      <span>SUPPORTED</span>
                    </div>
                    <p className="mt-2 text-xs text-slate-800 leading-relaxed">
                      {activeFeedback.supported}
                    </p>
                  </div>

                  <div className="rounded-lg border border-amber-200 bg-amber-50/40 p-4">
                    <div className="flex items-center gap-1.5 text-xs font-bold tracking-wide text-amber-800">
                      <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
                      <span>ASSUMPTION</span>
                    </div>
                    <p className="mt-2 text-xs text-slate-800 leading-relaxed">
                      {activeFeedback.assumption}
                    </p>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center gap-1.5 text-xs font-bold tracking-wide text-slate-800">
                      <AlertCircle className="h-4 w-4 shrink-0 text-blue-700" aria-hidden="true" />
                      <span>NEXT EVIDENCE NEEDED</span>
                    </div>
                    <p className="mt-2 text-xs text-slate-800 leading-relaxed">
                      {activeFeedback.nextEvidenceNeeded}
                    </p>
                  </div>
                </div>

                {/* STEP 5 — MOVE TO NEXT QUESTION / FINISH */}
                <div className="flex items-center justify-end pt-1">
                  {state.currentIndex < 2 ? (
                    <button
                      type="button"
                      onClick={goToNextChallenge}
                      className="inline-flex min-h-[40px] items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                    >
                      <span>Next Challenge</span>
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={loadingStep === 'review'}
                      onClick={() => generateFinalReview(dossier)}
                      className="inline-flex min-h-[40px] items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
                    >
                      {loadingStep === 'review' ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                          <span>Generating Final Strategy Review...</span>
                        </>
                      ) : (
                        <>
                          <span>Complete Strategy Challenge</span>
                          <ArrowRight className="h-4 w-4" aria-hidden="true" />
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* STEP 6 — FINAL STRATEGY REVIEW */}
      {isComplete && state.finalReview && (
        <div className="space-y-6">
          <section
            aria-labelledby="final-strategy-review-heading"
            className="rounded-xl border border-emerald-200 bg-white"
          >
            <div className="border-b border-emerald-100 bg-emerald-50/40 px-5 py-4 lg:px-6">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700">
                <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>All 3 Challenges Completed</span>
              </div>
              <h3
                id="final-strategy-review-heading"
                className="mt-1 text-xl font-bold tracking-tight text-slate-900"
              >
                Strategy Challenge Complete
              </h3>
            </div>

            <div className="grid grid-cols-1 gap-4 p-5 lg:grid-cols-3 lg:p-6">
              <div className="rounded-lg border border-emerald-200 bg-emerald-50/30 p-4">
                <h4 className="text-xs font-bold tracking-wide text-emerald-800">
                  STRONGEST PART OF MY STRATEGY
                </h4>
                <p className="mt-2 text-sm text-slate-800 leading-relaxed">
                  {state.finalReview.strongestPart}
                </p>
              </div>

              <div className="rounded-lg border border-amber-200 bg-amber-50/30 p-4">
                <h4 className="text-xs font-bold tracking-wide text-amber-800">
                  BIGGEST ASSUMPTION
                </h4>
                <p className="mt-2 text-sm text-slate-800 leading-relaxed">
                  {state.finalReview.biggestAssumption}
                </p>
              </div>

              <div className="rounded-lg border border-blue-200 bg-blue-50/30 p-4">
                <h4 className="text-xs font-bold tracking-wide text-blue-800">
                  NEXT VALIDATION PRIORITY
                </h4>
                <p className="mt-2 text-sm text-slate-800 leading-relaxed">
                  {state.finalReview.nextValidationPriority}
                </p>
              </div>
            </div>
          </section>

          {/* Saved Transcript of all 3 Challenge Rounds */}
          <section
            aria-labelledby="challenge-transcript-heading"
            className="rounded-xl border border-slate-200 bg-white"
          >
            <div className="border-b border-slate-200 px-5 py-4 lg:px-6">
              <h3
                id="challenge-transcript-heading"
                className="text-base font-semibold text-slate-900"
              >
                Saved Strategy Challenge Transcript
              </h3>
            </div>
            <div className="divide-y divide-slate-200">
              {state.questions.map((q, idx) => {
                const fb = state.feedbacks[q.id];
                return (
                  <div key={q.id} className="p-5 space-y-3 lg:px-6">
                    <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500">
                      <span className="font-mono font-semibold text-blue-700 tabular-nums">
                        Challenge {idx + 1} of 3
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{q.focusArea}</span>
                    </div>
                    <p className="text-sm font-semibold text-slate-900">
                      {q.question}
                    </p>
                    <div className="rounded-lg border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-xs text-slate-800">
                      <span className="font-semibold text-slate-900">
                        Your Defence:
                      </span>{' '}
                      {state.responses[q.id]}
                    </div>
                    {fb && (
                      <div className="grid grid-cols-1 gap-3 text-xs md:grid-cols-3">
                        <div className="rounded-lg border border-emerald-200 bg-emerald-50/30 p-3">
                          <p className="font-bold text-emerald-800">SUPPORTED</p>
                          <p className="mt-1 text-slate-700 leading-relaxed">
                            {fb.supported}
                          </p>
                        </div>
                        <div className="rounded-lg border border-amber-200 bg-amber-50/30 p-3">
                          <p className="font-bold text-amber-800">ASSUMPTION</p>
                          <p className="mt-1 text-slate-700 leading-relaxed">
                            {fb.assumption}
                          </p>
                        </div>
                        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                          <p className="font-bold text-slate-800">
                            NEXT EVIDENCE NEEDED
                          </p>
                          <p className="mt-1 text-slate-700 leading-relaxed">
                            {fb.nextEvidenceNeeded}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      )}

      {/* PROGRESSION RULE — COMPETITION WAR ROOM */}
      <section aria-labelledby="war-room-progression-heading">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h3
            id="war-room-progression-heading"
            className="text-base font-semibold tracking-tight text-slate-900"
          >
            Next Stage Progression
          </h3>
          <span className="text-xs text-slate-500">
            {isComplete
              ? 'Competition War Room is now unlocked for the next studio session'
              : 'Complete all 3 AI Strategy Challenge questions to unlock Competition War Room'}
          </span>
        </div>

        <div
          className={`rounded-xl border p-4 ${
            isComplete
              ? 'border-emerald-200 bg-emerald-50/40'
              : 'border-slate-200 bg-white'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {isComplete ? (
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
                isComplete ? 'text-emerald-700' : 'text-slate-400'
              }`}
            >
              {isComplete ? 'Unlocked' : 'Locked'}
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-600 leading-relaxed">
            {isComplete
              ? 'All 3 strategy challenges and the Final Strategy Review are complete. Competition War Room will open in the next studio session.'
              : 'Complete the 3-question AI Strategy Challenge first.'}
          </p>
        </div>
      </section>
    </div>
  );
}

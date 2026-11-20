import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Compass,
  Info,
  Lock,
  Unlock,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  EXAMPLE_AXES_LIST,
  PlottedPoint,
  areAxesDefined,
  computeBattlefieldInterpretation,
  isMarketBattlefieldComplete,
  isScoreComplete,
  useMarketBattlefield,
} from '../hooks/useMarketBattlefield';
import { isAlternativeCompleted } from '../hooks/useCompetitionLab';
import {
  CompetitorAlternative,
  PositioningScore,
  Venture,
} from '../types/venture';

interface MarketBattlefieldProps {
  venture: Venture;
  enteredAlternatives: CompetitorAlternative[];
  completedAlternatives: CompetitorAlternative[];
  isStatementSaved?: boolean;
  onBackToResearch: () => void;
  onOpenPositioningStatement: () => void;
}

const SCORE_SCALE = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

interface ScoreSelectorProps {
  label: string;
  lowAnchor: string;
  highAnchor: string;
  value: number | null;
  onChange: (val: number | null) => void;
  ariaPrefix: string;
}

function ScoreSelector({
  label,
  lowAnchor,
  highAnchor,
  value,
  onChange,
  ariaPrefix,
}: ScoreSelectorProps) {
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-semibold text-slate-800">{label}</span>
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs tabular-nums text-slate-600">
            {value !== null ? `${value} / 10` : 'Not scored'}
          </span>
          {value !== null && (
            <button
              type="button"
              onClick={() => onChange(null)}
              className="text-[11px] font-medium text-slate-500 hover:text-slate-800 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <div
        role="group"
        aria-label={`${ariaPrefix} ${label} score from 1 to 10`}
        className="mt-1.5 grid grid-cols-10 gap-1"
      >
        {SCORE_SCALE.map((num) => {
          const isSelected = value === num;
          return (
            <button
              key={num}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onChange(isSelected ? null : num)}
              className={`min-h-[34px] rounded-md border font-mono text-xs font-medium tabular-nums transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                isSelected
                  ? 'border-blue-700 bg-blue-700 text-white'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              {num}
            </button>
          );
        })}
      </div>

      <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-slate-500">
        <span className="truncate" title={lowAnchor}>
          1 = {lowAnchor}
        </span>
        <span className="truncate text-right" title={highAnchor}>
          10 = {highAnchor}
        </span>
      </div>
    </div>
  );
}

function getMarkerColor(type: string, isVenture: boolean): string {
  if (isVenture) return '#1D4ED8';
  if (type === 'Direct Competitor') return '#0F172A';
  if (type === 'Indirect Competitor') return '#0F766E';
  if (type === 'Substitute') return '#B45309';
  return '#64748B';
}

export function MarketBattlefield({
  venture,
  enteredAlternatives,
  completedAlternatives,
  isStatementSaved = false,
  onBackToResearch,
  onOpenPositioningStatement,
}: MarketBattlefieldProps) {
  const {
    axes,
    ventureScore,
    alternativeScores,
    state,
    updateAxes,
    updateVentureScore,
    updateAlternativeScore,
  } = useMarketBattlefield(venture.id);

  const [hoveredPointId, setHoveredPointId] = useState<string | null>(null);

  const axesReady = areAxesDefined(axes);

  const scoredAlternatives: PlottedPoint[] = useMemo(() => {
    const list: PlottedPoint[] = [];
    for (const alt of enteredAlternatives) {
      const score = alternativeScores[alt.id];
      if (isScoreComplete(score)) {
        list.push({
          id: alt.id,
          name: alt.name.trim() || 'Untitled Alternative',
          type: alt.type || 'Type not selected',
          isVenture: false,
          x: score.x as number,
          y: score.y as number,
        });
      }
    }
    return list;
  }, [enteredAlternatives, alternativeScores]);

  const plottedPoints: PlottedPoint[] = useMemo(() => {
    const points = [...scoredAlternatives];
    if (isScoreComplete(ventureScore)) {
      points.push({
        id: `venture-${venture.id}`,
        name: venture.name,
        type: 'Selected Venture',
        isVenture: true,
        x: ventureScore.x as number,
        y: ventureScore.y as number,
      });
    }
    return points;
  }, [scoredAlternatives, ventureScore, venture.id, venture.name]);

  const completedScoredCount = useMemo(
    () =>
      completedAlternatives.filter((alt) =>
        isScoreComplete(alternativeScores[alt.id])
      ).length,
    [completedAlternatives, alternativeScores]
  );

  const isAllComplete = useMemo(
    () => isMarketBattlefieldComplete(state, completedAlternatives),
    [state, completedAlternatives]
  );

  const interpretation = useMemo(
    () =>
      computeBattlefieldInterpretation(
        axes,
        venture.name,
        ventureScore,
        scoredAlternatives
      ),
    [axes, venture.name, ventureScore, scoredAlternatives]
  );

  const hoveredPoint = useMemo(
    () => plottedPoints.find((p) => p.id === hoveredPointId) ?? null,
    [plottedPoints, hoveredPointId]
  );

  // SVG plot geometry
  const svgWidth = 760;
  const svgHeight = 520;
  const margin = { top: 44, right: 36, bottom: 72, left: 88 };
  const plotWidth = svgWidth - margin.left - margin.right;
  const plotHeight = svgHeight - margin.top - margin.bottom;

  const mapX = (xVal: number) =>
    margin.left + ((xVal - 1) / 9) * plotWidth;
  const mapY = (yVal: number) =>
    margin.top + plotHeight - ((yVal - 1) / 9) * plotHeight;

  const midX = mapX(5.5);
  const midY = mapY(5.5);

  // Deterministic label staggering when markers share close coordinates
  const labelOffsets = useMemo(() => {
    const offsets: Record<string, { dx: number; dy: number }> = {};
    const placed: { px: number; py: number }[] = [];

    for (const pt of plottedPoints) {
      const px = mapX(pt.x);
      const py = mapY(pt.y);
      let collisionCount = 0;
      for (const prev of placed) {
        if (Math.abs(prev.px - px) < 70 && Math.abs(prev.py - py) < 26) {
          collisionCount += 1;
        }
      }
      placed.push({ px, py });

      const dy =
        collisionCount === 0
          ? pt.isVenture
            ? -16
            : -13
          : collisionCount % 2 === 1
            ? 20
            : -26;
      const dx = pt.x >= 9 ? -8 : pt.x <= 2 ? 8 : 0;
      offsets[pt.id] = { dx, dy };
    }
    return offsets;
  }, [plottedPoints]);

  return (
    <div className="space-y-6">
      {/* PURPOSE */}
      <section
        aria-labelledby="market-battlefield-purpose-heading"
        className="rounded-xl border border-slate-200 bg-white px-5 py-5 lg:px-6"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-blue-700">
              <Compass className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Stage 01 · Market Battlefield</span>
            </div>
            <h2
              id="market-battlefield-purpose-heading"
              className="mt-1.5 text-xl font-bold tracking-tight text-slate-900"
            >
              Positioning Map & Market Battlefield
            </h2>
            <p className="mt-2 text-sm text-slate-700 leading-relaxed max-w-3xl">
              “A positioning map compares how customers may perceive competing
              alternatives on two dimensions that matter to the customer.”
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Objective: Decide how <span className="font-semibold text-slate-700">{venture.name}</span> is
              positioned relative to the real alternatives you researched in
              Competition Lab.
            </p>
          </div>

          <button
            type="button"
            onClick={onBackToResearch}
            className="inline-flex min-h-[38px] items-center rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 whitespace-nowrap shrink-0 self-start"
          >
            Edit Competitor Research
          </button>
        </div>
      </section>

      {/* STEP 1 — CHOOSE THE POSITIONING AXES */}
      <section
        aria-labelledby="step1-axes-heading"
        className="rounded-xl border border-slate-200 bg-white"
      >
        <div className="border-b border-slate-200 px-5 py-4 lg:px-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-medium text-slate-500">Step 1 of 4</p>
              <h3
                id="step1-axes-heading"
                className="mt-0.5 text-lg font-semibold tracking-tight text-slate-900"
              >
                Choose the Positioning Axes
              </h3>
            </div>
            <span
              className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                axesReady ? 'text-emerald-700' : 'text-amber-700'
              }`}
            >
              {axesReady ? (
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              ) : (
                <AlertCircle className="h-4 w-4" aria-hidden="true" />
              )}
              <span>{axesReady ? 'Axes defined' : 'Define both axes first'}</span>
            </span>
          </div>

          <p className="mt-2 text-xs font-medium text-slate-700">
            “Good positioning axes should matter to customers and meaningfully
            differentiate alternatives.”
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 p-5 lg:grid-cols-12 lg:p-6">
          <div className="space-y-5 lg:col-span-7">
            <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
              <p className="text-xs font-semibold text-slate-900">
                Horizontal Axis (X-Axis)
              </p>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="sm:col-span-3">
                  <label
                    htmlFor="x-axis-name"
                    className="block text-xs font-medium text-slate-700"
                  >
                    X-axis dimension name
                  </label>
                  <input
                    id="x-axis-name"
                    type="text"
                    value={axes.xName}
                    onChange={(e) => updateAxes({ xName: e.target.value })}
                    placeholder="Enter your chosen horizontal dimension"
                    className="mt-1 min-h-[40px] w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                  />
                </div>
                <div className="sm:col-span-1">
                  <label
                    htmlFor="x-left-label"
                    className="block text-xs font-medium text-slate-700"
                  >
                    Left-side label (1)
                  </label>
                  <input
                    id="x-left-label"
                    type="text"
                    value={axes.xLeftLabel}
                    onChange={(e) => updateAxes({ xLeftLabel: e.target.value })}
                    placeholder="Low-end anchor"
                    className="mt-1 min-h-[40px] w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label
                    htmlFor="x-right-label"
                    className="block text-xs font-medium text-slate-700"
                  >
                    Right-side label (10)
                  </label>
                  <input
                    id="x-right-label"
                    type="text"
                    value={axes.xRightLabel}
                    onChange={(e) =>
                      updateAxes({ xRightLabel: e.target.value })
                    }
                    placeholder="High-end anchor"
                    className="mt-1 min-h-[40px] w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
              <p className="text-xs font-semibold text-slate-900">
                Vertical Axis (Y-Axis)
              </p>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="sm:col-span-3">
                  <label
                    htmlFor="y-axis-name"
                    className="block text-xs font-medium text-slate-700"
                  >
                    Y-axis dimension name
                  </label>
                  <input
                    id="y-axis-name"
                    type="text"
                    value={axes.yName}
                    onChange={(e) => updateAxes({ yName: e.target.value })}
                    placeholder="Enter your chosen vertical dimension"
                    className="mt-1 min-h-[40px] w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                  />
                </div>
                <div className="sm:col-span-1">
                  <label
                    htmlFor="y-bottom-label"
                    className="block text-xs font-medium text-slate-700"
                  >
                    Bottom label (1)
                  </label>
                  <input
                    id="y-bottom-label"
                    type="text"
                    value={axes.yBottomLabel}
                    onChange={(e) =>
                      updateAxes({ yBottomLabel: e.target.value })
                    }
                    placeholder="Low-end anchor"
                    className="mt-1 min-h-[40px] w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label
                    htmlFor="y-top-label"
                    className="block text-xs font-medium text-slate-700"
                  >
                    Top label (10)
                  </label>
                  <input
                    id="y-top-label"
                    type="text"
                    value={axes.yTopLabel}
                    onChange={(e) => updateAxes({ yTopLabel: e.target.value })}
                    placeholder="High-end anchor"
                    className="mt-1 min-h-[40px] w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                  />
                </div>
              </div>
            </div>
          </div>

          <aside className="space-y-4 lg:col-span-5">
            <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4">
              <p className="text-xs font-semibold text-slate-900">
                Example Dimensions (Reference Only)
              </p>
              <ul className="mt-2.5 space-y-1.5 text-xs text-slate-700">
                {EXAMPLE_AXES_LIST.map((ex) => (
                  <li key={ex.dimension}>
                    <span className="font-semibold text-slate-900">
                      {ex.dimension}:
                    </span>{' '}
                    {ex.anchors}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 text-xs text-slate-700">
              <div className="flex items-center gap-1.5 font-semibold text-slate-900">
                <Info className="h-3.5 w-3.5 text-slate-500 shrink-0" aria-hidden="true" />
                <span>Healthy Tiffin Subscription example (Illustration Only)</span>
              </div>
              <div className="mt-2.5 space-y-2 leading-relaxed">
                <div>
                  <p className="font-semibold text-slate-800">
                    X-axis = Price / Cost
                  </p>
                  <p>1 = Very Low Price · 5 = Medium Price · 10 = Very High Price</p>
                </div>
                <div>
                  <p className="font-semibold text-slate-800">
                    Y-axis = Customization / Personalization
                  </p>
                  <p>
                    1 = Standardized offer with almost no customer choice · 5 =
                    Some customer choice or flexibility · 10 = Highly customized
                    or personalized offer
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </section>

      {/* STEP 2 — SCORE MY VENTURE AND EACH ALTERNATIVE */}
      <section
        aria-labelledby="step2-scoring-heading"
        className="rounded-xl border border-slate-200 bg-white"
      >
        <div className="border-b border-slate-200 px-5 py-4 lg:px-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-medium text-slate-500">Step 2 of 4</p>
              <h3
                id="step2-scoring-heading"
                className="mt-0.5 text-lg font-semibold tracking-tight text-slate-900"
              >
                {axesReady
                  ? `Score ${venture.name} & Alternatives on ${axes.xName} and ${axes.yName}`
                  : 'Score Your Venture and Each Alternative'}
              </h3>
            </div>
            {axesReady && (
              <span className="font-mono text-xs text-slate-600 tabular-nums">
                Venture: {isScoreComplete(ventureScore) ? 'Scored' : 'Pending'} ·{' '}
                Completed alternatives: {completedScoredCount} /{' '}
                {completedAlternatives.length}
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-slate-600">
            Assign scores manually from 1 to 10 based on your research and
            judgement. Scores are never generated automatically.
          </p>
        </div>

        {!axesReady ? (
          <div className="px-5 py-8 text-center lg:px-6">
            <p className="text-sm font-medium text-slate-900">
              Define both positioning axes in Step 1 before scoring.
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Once your X-axis and Y-axis dimension names and anchor labels are
              filled in, scoring controls will use your exact dimension names.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {/* Selected Venture */}
            <div className="bg-blue-50/40 px-5 py-5 lg:px-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-semibold text-blue-700">
                    Selected Venture
                  </span>
                  <h4 className="mt-0.5 text-base font-bold text-slate-900">
                    {venture.name}
                  </h4>
                </div>
                <span
                  className={`text-xs font-medium ${
                    isScoreComplete(ventureScore)
                      ? 'text-emerald-700'
                      : 'text-amber-700'
                  }`}
                >
                  {isScoreComplete(ventureScore)
                    ? 'Both axes scored'
                    : 'Score required on both axes'}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-5 lg:grid-cols-2">
                <ScoreSelector
                  label={axes.xName.trim()}
                  lowAnchor={axes.xLeftLabel.trim()}
                  highAnchor={axes.xRightLabel.trim()}
                  value={ventureScore.x}
                  onChange={(val) => updateVentureScore({ x: val })}
                  ariaPrefix={venture.name}
                />
                <ScoreSelector
                  label={axes.yName.trim()}
                  lowAnchor={axes.yBottomLabel.trim()}
                  highAnchor={axes.yTopLabel.trim()}
                  value={ventureScore.y}
                  onChange={(val) => updateVentureScore({ y: val })}
                  ariaPrefix={venture.name}
                />
              </div>
            </div>

            {/* Alternatives from Competition Lab */}
            {enteredAlternatives.map((alt) => {
              const altScore: PositioningScore =
                alternativeScores[alt.id] ?? { x: null, y: null };
              const scored = isScoreComplete(altScore);
              const altCompleted = isAlternativeCompleted(alt);
              const altName = alt.name.trim() || 'Untitled Alternative';

              return (
                <div key={alt.id} className="px-5 py-5 lg:px-6">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-sm font-semibold text-slate-900">
                        {altName}
                      </h4>
                      <span className="text-slate-300" aria-hidden="true">
                        ·
                      </span>
                      <span className="text-xs text-slate-600">
                        {alt.type || 'Type not selected'}
                      </span>
                      {!altCompleted && (
                        <>
                          <span className="text-slate-300" aria-hidden="true">
                            ·
                          </span>
                          <span className="text-xs font-medium text-amber-700">
                            Incomplete in Competitor Research
                          </span>
                        </>
                      )}
                    </div>
                    <span
                      className={`text-xs font-medium ${
                        scored ? 'text-emerald-700' : 'text-amber-700'
                      }`}
                    >
                      {scored ? 'Both axes scored' : 'Score required on both axes'}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-5 lg:grid-cols-2">
                    <ScoreSelector
                      label={axes.xName.trim()}
                      lowAnchor={axes.xLeftLabel.trim()}
                      highAnchor={axes.xRightLabel.trim()}
                      value={altScore.x}
                      onChange={(val) =>
                        updateAlternativeScore(alt.id, { x: val })
                      }
                      ariaPrefix={altName}
                    />
                    <ScoreSelector
                      label={axes.yName.trim()}
                      lowAnchor={axes.yBottomLabel.trim()}
                      highAnchor={axes.yTopLabel.trim()}
                      value={altScore.y}
                      onChange={(val) =>
                        updateAlternativeScore(alt.id, { y: val })
                      }
                      ariaPrefix={altName}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* STEP 3 — INTERACTIVE 2x2 POSITIONING MAP */}
      <section
        aria-labelledby="step3-map-heading"
        className="rounded-xl border border-slate-200 bg-white"
      >
        <div className="border-b border-slate-200 px-5 py-4 lg:px-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-medium text-slate-500">Step 3 of 4</p>
              <h3
                id="step3-map-heading"
                className="mt-0.5 text-lg font-semibold tracking-tight text-slate-900"
              >
                {axesReady
                  ? `2×2 Positioning Map: ${axes.xName} vs ${axes.yName}`
                  : '2×2 Positioning Map'}
              </h3>
            </div>
            {axesReady && (
              <span className="font-mono text-xs text-slate-500 tabular-nums">
                {plottedPoints.length} plotted
              </span>
            )}
          </div>
        </div>

        {!axesReady || plottedPoints.length === 0 ? (
          <div className="px-5 py-10 text-center lg:px-6">
            <p className="text-sm font-medium text-slate-900">
              {!axesReady
                ? 'Define both positioning axes in Step 1 to generate your 2×2 map.'
                : 'Score your venture and alternatives in Step 2 to plot them on the map.'}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Every marker appears here as soon as both axis scores are assigned.
            </p>
          </div>
        ) : (
          <div className="p-5 lg:p-6">
            <div className="relative mx-auto max-w-[820px]">
              <svg
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                className="w-full h-auto select-none"
                role="img"
                aria-label={`2 by 2 positioning map comparing ${axes.xName} and ${axes.yName}`}
              >
                {/* Plot background */}
                <rect
                  x={margin.left}
                  y={margin.top}
                  width={plotWidth}
                  height={plotHeight}
                  fill="#F8FAFC"
                  stroke="#CBD5E1"
                  strokeWidth={1}
                />

                {/* Grid lines 1..10 */}
                {SCORE_SCALE.map((tick) => {
                  const gx = mapX(tick);
                  const gy = mapY(tick);
                  return (
                    <g key={tick}>
                      <line
                        x1={gx}
                        y1={margin.top}
                        x2={gx}
                        y2={margin.top + plotHeight}
                        stroke="#E2E8F0"
                        strokeWidth={1}
                      />
                      <line
                        x1={margin.left}
                        y1={gy}
                        x2={margin.left + plotWidth}
                        y2={gy}
                        stroke="#E2E8F0"
                        strokeWidth={1}
                      />
                      <text
                        x={gx}
                        y={margin.top + plotHeight + 18}
                        textAnchor="middle"
                        className="fill-slate-400 font-mono text-[10px]"
                      >
                        {tick}
                      </text>
                      <text
                        x={margin.left - 12}
                        y={gy + 3}
                        textAnchor="end"
                        className="fill-slate-400 font-mono text-[10px]"
                      >
                        {tick}
                      </text>
                    </g>
                  );
                })}

                {/* Quadrant center lines (midpoint 5.5) */}
                <line
                  x1={midX}
                  y1={margin.top}
                  x2={midX}
                  y2={margin.top + plotHeight}
                  stroke="#94A3B8"
                  strokeWidth={1.5}
                  strokeDasharray="5 4"
                />
                <line
                  x1={margin.left}
                  y1={midY}
                  x2={margin.left + plotWidth}
                  y2={midY}
                  stroke="#94A3B8"
                  strokeWidth={1.5}
                  strokeDasharray="5 4"
                />

                {/* Quadrant corner anchors */}
                <text
                  x={margin.left + 10}
                  y={margin.top + 18}
                  textAnchor="start"
                  className="fill-slate-400 text-[11px] font-medium"
                >
                  {axes.xLeftLabel} · {axes.yTopLabel}
                </text>
                <text
                  x={margin.left + plotWidth - 10}
                  y={margin.top + 18}
                  textAnchor="end"
                  className="fill-slate-400 text-[11px] font-medium"
                >
                  {axes.xRightLabel} · {axes.yTopLabel}
                </text>
                <text
                  x={margin.left + 10}
                  y={margin.top + plotHeight - 10}
                  textAnchor="start"
                  className="fill-slate-400 text-[11px] font-medium"
                >
                  {axes.xLeftLabel} · {axes.yBottomLabel}
                </text>
                <text
                  x={margin.left + plotWidth - 10}
                  y={margin.top + plotHeight - 10}
                  textAnchor="end"
                  className="fill-slate-400 text-[11px] font-medium"
                >
                  {axes.xRightLabel} · {axes.yBottomLabel}
                </text>

                {/* X-axis title and anchors */}
                <text
                  x={margin.left}
                  y={margin.top + plotHeight + 38}
                  textAnchor="start"
                  className="fill-slate-600 text-[11px] font-medium"
                >
                  ← {axes.xLeftLabel} (1)
                </text>
                <text
                  x={margin.left + plotWidth / 2}
                  y={margin.top + plotHeight + 56}
                  textAnchor="middle"
                  className="fill-slate-900 text-xs font-bold"
                >
                  {axes.xName}
                </text>
                <text
                  x={margin.left + plotWidth}
                  y={margin.top + plotHeight + 38}
                  textAnchor="end"
                  className="fill-slate-600 text-[11px] font-medium"
                >
                  {axes.xRightLabel} (10) →
                </text>

                {/* Y-axis title and anchors */}
                <text
                  x={margin.left - 8}
                  y={margin.top - 14}
                  textAnchor="start"
                  className="fill-slate-600 text-[11px] font-medium"
                >
                  ↑ {axes.yTopLabel} (10)
                </text>
                <text
                  x={margin.left - 8}
                  y={margin.top + plotHeight + 16}
                  textAnchor="end"
                  className="fill-slate-600 text-[11px] font-medium"
                >
                  {axes.yBottomLabel} (1)
                </text>
                <text
                  transform={`translate(22, ${margin.top + plotHeight / 2}) rotate(-90)`}
                  textAnchor="middle"
                  className="fill-slate-900 text-xs font-bold"
                >
                  {axes.yName}
                </text>

                {/* Alternative markers first, venture marker on top */}
                {[...plottedPoints]
                  .sort((a, b) => Number(a.isVenture) - Number(b.isVenture))
                  .map((pt) => {
                    const cx = mapX(pt.x);
                    const cy = mapY(pt.y);
                    const isHovered = hoveredPointId === pt.id;
                    const fill = getMarkerColor(pt.type, pt.isVenture);
                    const offset = labelOffsets[pt.id] ?? { dx: 0, dy: -14 };

                    return (
                      <g
                        key={pt.id}
                        tabIndex={0}
                        role="button"
                        aria-label={`${pt.name}, ${pt.type}, ${axes.xName} ${pt.x} out of 10, ${axes.yName} ${pt.y} out of 10`}
                        className="cursor-pointer outline-none"
                        onMouseEnter={() => setHoveredPointId(pt.id)}
                        onMouseLeave={() => setHoveredPointId(null)}
                        onFocus={() => setHoveredPointId(pt.id)}
                        onBlur={() => setHoveredPointId(null)}
                      >
                        {pt.isVenture ? (
                          <>
                            <circle
                              cx={cx}
                              cy={cy}
                              r={isHovered ? 18 : 15}
                              fill="#DBEAFE"
                              fillOpacity={0.85}
                              stroke="#1D4ED8"
                              strokeWidth={1.5}
                            />
                            <polygon
                              points={`${cx},${cy - 9} ${cx + 9},${cy} ${cx},${cy + 9} ${cx - 9},${cy}`}
                              fill={fill}
                              stroke="#FFFFFF"
                              strokeWidth={2}
                            />
                          </>
                        ) : (
                          <circle
                            cx={cx}
                            cy={cy}
                            r={isHovered ? 9 : 7}
                            fill={fill}
                            stroke="#FFFFFF"
                            strokeWidth={2}
                          />
                        )}

                        <text
                          x={cx + offset.dx}
                          y={cy + offset.dy}
                          textAnchor={
                            pt.x >= 9
                              ? 'end'
                              : pt.x <= 2
                                ? 'start'
                                : 'middle'
                          }
                          className={
                            pt.isVenture
                              ? 'fill-blue-800 text-[12px] font-bold'
                              : 'fill-slate-800 text-[11px] font-medium'
                          }
                        >
                          {pt.isVenture ? `${pt.name} (You)` : pt.name}
                        </text>
                      </g>
                    );
                  })}
              </svg>

              {/* Hover / Focus Tooltip */}
              {hoveredPoint && (
                <div
                  role="status"
                  className="pointer-events-none absolute right-4 top-4 z-10 w-64 rounded-lg border border-slate-200 bg-white p-3.5 shadow-md"
                >
                  <p className="text-sm font-bold text-slate-900 leading-snug">
                    {hoveredPoint.name}
                  </p>
                  <p className="mt-0.5 text-xs font-medium text-slate-500">
                    {hoveredPoint.type}
                  </p>
                  <dl className="mt-2.5 space-y-1 border-t border-slate-100 pt-2 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <dt className="text-slate-600 truncate">
                        {axes.xName.trim()}
                      </dt>
                      <dd className="font-mono font-semibold text-slate-900 tabular-nums shrink-0">
                        {hoveredPoint.x} / 10
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <dt className="text-slate-600 truncate">
                        {axes.yName.trim()}
                      </dt>
                      <dd className="font-mono font-semibold text-slate-900 tabular-nums shrink-0">
                        {hoveredPoint.y} / 10
                      </dd>
                    </div>
                  </dl>
                </div>
              )}
            </div>

            {/* Map Legend */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 border-t border-slate-100 pt-4 text-xs text-slate-600">
              <span className="inline-flex items-center gap-2 font-semibold text-blue-800">
                <span
                  className="inline-block h-3 w-3 rotate-45 bg-blue-700"
                  aria-hidden="true"
                />
                <span>{venture.name} (Selected Venture)</span>
              </span>
              <span className="inline-flex items-center gap-2">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full bg-slate-900"
                  aria-hidden="true"
                />
                <span>Direct Competitor</span>
              </span>
              <span className="inline-flex items-center gap-2">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full bg-teal-700"
                  aria-hidden="true"
                />
                <span>Indirect Competitor</span>
              </span>
              <span className="inline-flex items-center gap-2">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full bg-amber-700"
                  aria-hidden="true"
                />
                <span>Substitute</span>
              </span>
              <span className="inline-flex items-center gap-2">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full bg-slate-500"
                  aria-hidden="true"
                />
                <span>Do Nothing</span>
              </span>
            </div>
          </div>
        )}
      </section>

      {/* STEP 4 — INTERPRET THE MAP */}
      <section
        aria-labelledby="step4-interpret-heading"
        className="rounded-xl border border-slate-200 bg-white"
      >
        <div className="border-b border-slate-200 px-5 py-4 lg:px-6">
          <p className="text-xs font-medium text-slate-500">Step 4 of 4</p>
          <h3
            id="step4-interpret-heading"
            className="mt-0.5 text-lg font-semibold tracking-tight text-slate-900"
          >
            Interpret the Map
          </h3>
        </div>

        {!interpretation ? (
          <div className="px-5 py-8 text-center lg:px-6">
            <p className="text-sm font-medium text-slate-900">
              Map interpretation appears once your venture and scored
              alternatives are plotted.
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Complete Step 1 and Step 2 to calculate proximity, clusters,
              differentiation, and less-crowded areas.
            </p>
          </div>
        ) : (
          <div className="p-5 space-y-5 lg:p-6">
            {!isAllComplete && (
              <div className="rounded-lg border border-amber-200 bg-amber-50/70 px-4 py-3 text-xs text-amber-900">
                Preliminary view based on {scoredAlternatives.length} scored{' '}
                {scoredAlternatives.length === 1
                  ? 'alternative'
                  : 'alternatives'}
                . Score all {completedAlternatives.length} completed
                alternatives in Step 2 to complete the battlefield analysis.
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-slate-200 p-4">
                <p className="text-xs font-medium text-slate-500">
                  Closest Alternative to {venture.name}
                </p>
                <ul className="mt-2 space-y-1.5 text-sm text-slate-800">
                  {interpretation.closestAlternatives.map((closest) => (
                    <li key={closest.name}>
                      <span className="font-semibold text-slate-900">
                        {closest.name}
                      </span>{' '}
                      <span className="text-xs text-slate-500">
                        ({closest.type})
                      </span>
                      <p className="mt-0.5 font-mono text-xs text-slate-600 tabular-nums">
                        {axes.xName.trim()}: {closest.x}/10 · {axes.yName.trim()}
                        : {closest.y}/10 · Distance: {closest.distance} units
                      </p>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-lg border border-slate-200 p-4">
                <p className="text-xs font-medium text-slate-500">
                  Competitors Clustered Together
                </p>
                {interpretation.clusters.length === 0 ? (
                  <p className="mt-2 text-sm text-slate-700 leading-relaxed">
                    No tight clusters detected among scored alternatives (all
                    pairs sit more than 2.5 units apart).
                  </p>
                ) : (
                  <ul className="mt-2 space-y-2 text-sm text-slate-800">
                    {interpretation.clusters.map((cluster, idx) => (
                      <li key={idx}>
                        <p className="font-semibold text-slate-900">
                          {cluster.members.join(', ')}
                        </p>
                        <p className="text-xs text-slate-500">
                          Clustered in {cluster.quadrantLabel}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="rounded-lg border border-slate-200 p-4">
                <p className="text-xs font-medium text-slate-500">
                  Differentiation Check
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-900">
                  {interpretation.differentiation.status}
                </p>
                <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                  {interpretation.differentiation.summary}
                </p>
              </div>

              <div className="rounded-lg border border-slate-200 p-4">
                <p className="text-xs font-medium text-slate-500">
                  Apparently Less-Crowded Area(s)
                </p>
                <ul className="mt-2 space-y-1.5 text-sm text-slate-800">
                  {interpretation.lessCrowdedAreas.map((area) => (
                    <li key={area.quadrantLabel} className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-slate-900">
                        {area.quadrantLabel}
                      </span>
                      <span className="font-mono text-xs text-slate-500 tabular-nums shrink-0">
                        {area.count} plotted
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50/70 px-4 py-3.5 text-xs text-amber-950">
              <AlertTriangle
                className="mt-0.5 h-4 w-4 text-amber-700 shrink-0"
                aria-hidden="true"
              />
              <p className="leading-relaxed font-medium">
                “An empty position may represent an opportunity, or it may
                indicate weak customer demand. Validate before making a
                strategic decision.”
              </p>
            </div>
          </div>
        )}
      </section>

      {/* DOWNSTREAM PROGRESSION */}
      <section aria-labelledby="battlefield-progression-heading">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h3
            id="battlefield-progression-heading"
            className="text-base font-semibold tracking-tight text-slate-900"
          >
            Next Stage Progression
          </h3>
          <span className="text-xs text-slate-500">
            {isAllComplete
              ? 'Positioning Statement is now unlocked for the next session'
              : 'Score your venture and all completed alternatives to unlock Positioning Statement'}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div
            className={`rounded-xl border p-4 ${
              isAllComplete
                ? 'border-emerald-200 bg-emerald-50/40'
                : 'border-slate-200 bg-white'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {isAllComplete ? (
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
                  Positioning Statement
                </h4>
              </div>
              <span
                className={`text-xs font-medium ${
                  isAllComplete ? 'text-emerald-700' : 'text-slate-400'
                }`}
              >
                {isAllComplete ? 'Unlocked' : 'Locked'}
              </span>
            </div>
            <p className="mt-2 text-xs text-slate-600 leading-relaxed">
              {isAllComplete
                ? 'Your positioning axes, scores, and 2×2 map are complete. Build and validate your positioning statement.'
                : 'Complete the 2×2 positioning map scores for your venture and all completed alternatives first.'}
            </p>
            {isAllComplete && (
              <button
                type="button"
                onClick={onOpenPositioningStatement}
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
                <h4 className="text-sm font-semibold text-slate-900">
                  AI Strategy Challenge
                </h4>
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
                ? 'Positioning statement saved. AI Strategy Challenge will open in the next studio session.'
                : 'Complete positioning statement first.'}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

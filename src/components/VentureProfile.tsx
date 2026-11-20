import { ArrowRight, RotateCcw } from 'lucide-react';
import { Venture } from '../types/venture';

interface VentureProfileProps {
  venture: Venture | null;
  totalVentures: number;
  hasCompetitionResearch?: boolean;
  onClearSelection: () => void;
  onContinueToLab: () => void;
}

export function VentureProfile({
  venture,
  totalVentures,
  hasCompetitionResearch = false,
  onClearSelection,
  onContinueToLab,
}: VentureProfileProps) {
  if (!venture) {
    return null;
  }

  const indexLabel = String(venture.number).padStart(2, '0');
  const totalLabel = String(totalVentures).padStart(2, '0');

  return (
    <section
      id="my-selected-venture"
      aria-labelledby="selected-venture-heading"
      className="rounded-xl border border-blue-200 bg-white shadow-xs"
    >
      <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between lg:px-6">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold tracking-wide text-blue-700">
            <span>MY SELECTED VENTURE</span>
            <span className="text-slate-300" aria-hidden="true">
              ·
            </span>
            <span className="font-mono font-medium text-slate-500 tabular-nums">
              {indexLabel} / {totalLabel}
            </span>
            {hasCompetitionResearch && (
              <>
                <span className="text-slate-300" aria-hidden="true">
                  ·
                </span>
                <span className="font-medium normal-case tracking-normal text-emerald-700">
                  Competition Lab work saved
                </span>
              </>
            )}
          </div>
          <h2
            id="selected-venture-heading"
            className="mt-1 text-xl font-bold tracking-tight text-slate-900"
          >
            {venture.name}
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onClearSelection}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 transition-colors duration-150 hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 whitespace-nowrap shrink-0"
          >
            <RotateCcw className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
            <span>Change Venture</span>
          </button>

          <button
            type="button"
            onClick={onContinueToLab}
            className="inline-flex min-h-[40px] items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 whitespace-nowrap shrink-0"
          >
            <span>Continue to Competition Lab</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      <dl className="grid grid-cols-1 divide-y divide-slate-100 sm:grid-cols-2 lg:grid-cols-5 lg:divide-y-0 lg:divide-x">
        <div className="px-5 py-3.5 lg:px-6">
          <dt className="text-xs font-medium text-slate-500">Venture Name</dt>
          <dd className="mt-1 text-sm font-semibold text-slate-900 leading-snug">
            {venture.name}
          </dd>
        </div>

        <div className="px-5 py-3.5 lg:px-6">
          <dt className="text-xs font-medium text-slate-500">Target Customer</dt>
          <dd className="mt-1 text-sm text-slate-800 leading-snug">
            {venture.targetCustomer}
          </dd>
        </div>

        <div className="px-5 py-3.5 lg:px-6">
          <dt className="text-xs font-medium text-slate-500">Problem</dt>
          <dd className="mt-1 text-sm text-slate-800 leading-snug">
            {venture.problem}
          </dd>
        </div>

        <div className="px-5 py-3.5 lg:px-6">
          <dt className="text-xs font-medium text-slate-500">Geography</dt>
          <dd className="mt-1 text-sm font-medium text-slate-900 leading-snug">
            {venture.geography}
          </dd>
        </div>

        <div className="px-5 py-3.5 sm:col-span-2 lg:col-span-1 lg:px-6">
          <dt className="text-xs font-medium text-slate-500">Offer</dt>
          <dd className="mt-1 text-sm text-slate-800 leading-snug">
            {venture.offer}
          </dd>
        </div>
      </dl>
    </section>
  );
}

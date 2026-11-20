import { AlertTriangle } from 'lucide-react';
import { useState } from 'react';
import { CompetitionLab } from './components/CompetitionLab';
import { VentureBank } from './components/VentureBank';
import { VentureProfile } from './components/VentureProfile';
import { STUDIO_STAGES, VENTURE_BANK } from './data/ventures';
import { useCompetitionLab } from './hooks/useCompetitionLab';
import { usePersistentVenture } from './hooks/usePersistentVenture';

export default function App() {
  const {
    selectedVenture,
    selectedVentureId,
    activeView,
    setActiveView,
    selectVenture,
    clearVenture,
  } = usePersistentVenture();

  const { hasSavedResearchForVenture } = useCompetitionLab(selectedVentureId);
  const [pendingSwitchAction, setPendingSwitchAction] = useState<
    { type: 'select'; ventureId: string } | { type: 'clear' } | null
  >(null);

  const activeStage = STUDIO_STAGES[0];
  const currentHasResearch = hasSavedResearchForVenture(selectedVentureId);

  const handleSelectVentureFromBank = (ventureId: string) => {
    if (
      selectedVentureId &&
      ventureId !== selectedVentureId &&
      currentHasResearch
    ) {
      setPendingSwitchAction({ type: 'select', ventureId });
      return;
    }
    selectVenture(ventureId);
  };

  const handleClearVenture = () => {
    if (currentHasResearch) {
      setPendingSwitchAction({ type: 'clear' });
      return;
    }
    clearVenture();
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-[1360px] px-5 py-5 sm:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="font-display text-sm font-bold tracking-tight text-blue-700">
                NEXUS Venture Studio
              </p>
              <h1
                className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl"
                style={{ textWrap: 'balance' }}
              >
                {activeStage.title}
              </h1>
              <p className="mt-1.5 text-sm text-slate-600">
                <span className="font-semibold text-slate-800">Mission:</span>{' '}
                Understand the competitive battlefield and build a defendable
                market position.
              </p>
            </div>

            {!selectedVenture && (
              <p className="text-xs font-medium text-slate-500">
                Select one venture below to inspect its full profile.
              </p>
            )}
          </div>

          <nav
            aria-label="Venture Journey Stages"
            className="mt-5 grid grid-cols-1 gap-2.5 border-t border-slate-100 pt-4 sm:grid-cols-2 lg:grid-cols-4"
          >
            {STUDIO_STAGES.map((stage) => {
              const isActive = stage.status === 'active';
              const orderLabel = String(stage.order).padStart(2, '0');

              return (
                <div
                  key={stage.id}
                  aria-current={isActive ? 'step' : undefined}
                  aria-disabled={!isActive ? 'true' : undefined}
                  className={`flex items-center justify-between gap-3 rounded-lg border px-3.5 py-2.5 ${
                    isActive
                      ? 'border-blue-200 bg-blue-50/70 text-slate-900'
                      : 'border-slate-200 bg-slate-50/70 text-slate-500'
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className={`font-mono text-xs tabular-nums shrink-0 ${
                        isActive ? 'font-semibold text-blue-700' : 'text-slate-400'
                      }`}
                    >
                      {orderLabel}
                    </span>
                    <span className="truncate text-xs font-semibold sm:text-sm">
                      {stage.title}
                    </span>
                  </div>
                  <span
                    className={`text-xs font-medium whitespace-nowrap shrink-0 ${
                      isActive ? 'text-blue-700' : 'text-slate-400'
                    }`}
                  >
                    {isActive ? 'Active' : 'Coming Next'}
                  </span>
                </div>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-[1360px] px-5 py-6 sm:px-8">
        {activeView === 'competition-lab' && selectedVenture ? (
          <CompetitionLab
            venture={selectedVenture}
            onBackToBank={() => setActiveView('bank')}
            onConfirmSwitchVenture={() => {
              clearVenture();
            }}
          />
        ) : (
          <div className="space-y-6">
            <VentureProfile
              venture={selectedVenture}
              totalVentures={VENTURE_BANK.length}
              hasCompetitionResearch={currentHasResearch}
              onClearSelection={handleClearVenture}
              onContinueToLab={() => setActiveView('competition-lab')}
            />

            <VentureBank
              ventures={VENTURE_BANK}
              selectedVentureId={selectedVentureId}
              onSelectVenture={handleSelectVentureFromBank}
            />
          </div>
        )}
      </main>

      {pendingSwitchAction && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="bank-switch-venture-title"
          aria-describedby="bank-switch-venture-description"
        >
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle
                className="mt-0.5 h-5 w-5 text-amber-600 shrink-0"
                aria-hidden="true"
              />
              <div>
                <h3
                  id="bank-switch-venture-title"
                  className="text-base font-semibold text-slate-900"
                >
                  Switch Venture
                </h3>
                <p
                  id="bank-switch-venture-description"
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
                onClick={() => setPendingSwitchAction(null)}
                className="min-h-[40px] rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (pendingSwitchAction.type === 'select') {
                    selectVenture(pendingSwitchAction.ventureId);
                  } else {
                    clearVenture();
                  }
                  setPendingSwitchAction(null);
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

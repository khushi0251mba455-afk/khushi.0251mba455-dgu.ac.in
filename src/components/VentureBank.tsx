import { Check, Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { GeographyGroup, Venture } from '../types/venture';

interface VentureBankProps {
  ventures: Venture[];
  selectedVentureId: string | null;
  onSelectVenture: (ventureId: string) => void;
}

const FILTER_OPTIONS: { id: GeographyGroup; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'dehradun', label: 'Dehradun' },
  { id: 'campuses', label: 'Campuses' },
  { id: 'india-regional', label: 'Regional & India' },
];

export function VentureBank({
  ventures,
  selectedVentureId,
  onSelectVenture,
}: VentureBankProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [geographyFilter, setGeographyFilter] = useState<GeographyGroup>('all');

  const filteredVentures = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return ventures.filter((venture) => {
      const matchesGroup =
        geographyFilter === 'all' || venture.geographyGroup === geographyFilter;
      if (!matchesGroup) {
        return false;
      }
      if (!query) {
        return true;
      }
      return (
        venture.name.toLowerCase().includes(query) ||
        venture.targetCustomer.toLowerCase().includes(query) ||
        venture.problem.toLowerCase().includes(query) ||
        venture.geography.toLowerCase().includes(query)
      );
    });
  }, [ventures, searchQuery, geographyFilter]);

  const resetFilters = () => {
    setSearchQuery('');
    setGeographyFilter('all');
  };

  return (
    <section id="venture-bank" aria-labelledby="venture-bank-heading">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-baseline gap-2.5">
          <h2
            id="venture-bank-heading"
            className="text-lg font-semibold tracking-tight text-slate-900"
          >
            Venture Bank
          </h2>
          <span className="text-xs text-slate-500 tabular-nums">
            {filteredVentures.length} of {ventures.length} ventures
          </span>
        </div>

        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
          <div className="relative sm:w-64">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search ventures..."
              aria-label="Search Venture Bank"
              className="min-h-[38px] w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-9 pr-8 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div
            className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-200/70 p-1"
            role="group"
            aria-label="Filter ventures by geography"
          >
            {FILTER_OPTIONS.map((option) => {
              const isActive = geographyFilter === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setGeographyFilter(option.id)}
                  aria-pressed={isActive}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors duration-150 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                    isActive
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {filteredVentures.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white px-6 py-10 text-center">
          <p className="text-sm font-medium text-slate-900">
            No ventures match your current search or filter.
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Reset the filters to view all {ventures.length} ventures.
          </p>
          <button
            type="button"
            onClick={resetFilters}
            className="mt-4 inline-flex min-h-[40px] items-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredVentures.map((venture) => {
            const isSelected = venture.id === selectedVentureId;

            return (
              <article
                key={venture.id}
                onClick={() => onSelectVenture(venture.id)}
                className={`flex cursor-pointer flex-col justify-between rounded-xl border p-4 transition-colors duration-150 ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-600/15'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-base font-semibold tracking-tight text-slate-900 leading-snug">
                      {venture.name}
                    </h3>
                  </div>

                  <p className="mt-1 text-xs font-medium text-slate-500">
                    {venture.geography}
                  </p>

                  <dl className="mt-3 space-y-2 border-t border-slate-100 pt-3 text-xs">
                    <div>
                      <dt className="font-medium text-slate-500">
                        Target customer
                      </dt>
                      <dd className="mt-0.5 text-slate-800 truncate" title={venture.targetCustomer}>
                        {venture.targetCustomer}
                      </dd>
                    </div>

                    <div>
                      <dt className="font-medium text-slate-500">Problem</dt>
                      <dd
                        className="mt-0.5 text-slate-700 truncate"
                        title={venture.problem}
                      >
                        {venture.problem}
                      </dd>
                    </div>
                  </dl>
                </div>

                <div className="mt-4 pt-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectVenture(venture.id);
                    }}
                    aria-pressed={isSelected}
                    className={`inline-flex min-h-[38px] w-full items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors duration-150 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                      isSelected
                        ? 'bg-blue-700 text-white'
                        : 'border border-slate-200 bg-slate-50 text-slate-800 hover:border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    {isSelected && (
                      <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    )}
                    <span>{isSelected ? 'Selected Venture' : 'Select Venture'}</span>
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

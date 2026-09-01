import React from 'react';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';

const LIMIT_OPTIONS = [10, 15, 25, 50, 100];

export const PaginationTop = ({
  search,
  onSearchChange,
  searchPlaceholder = 'Search records...',
  totalItems,
  total,
  limit = 10,
  currentPage,
  page,
  onLimitChange,
}) => {
  const effectiveTotal = Number(total !== undefined ? total : (totalItems !== undefined ? totalItems : 0));
  const effectivePage = Math.max(1, Number(page !== undefined ? page : (currentPage !== undefined ? currentPage : 1)));
  const effectiveLimit = Math.max(1, Number(limit || 10));

  const startItem = effectiveTotal === 0 ? 0 : (effectivePage - 1) * effectiveLimit + 1;
  const endItem = Math.min(effectivePage * effectiveLimit, effectiveTotal);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-5 py-3 bg-white border-b border-neutral-200/80 rounded-t-xl">
      {/* Left side: Search input */}
      {onSearchChange ? (
        <div className="relative w-full sm:w-72">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="search"
            placeholder={searchPlaceholder}
            value={search || ''}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 border border-neutral-300 rounded-lg text-xs font-medium text-neutral-800 placeholder-neutral-400 focus:outline-none focus:border-brand-gold bg-neutral-50/50"
          />
        </div>
      ) : (
        <div />
      )}

      {/* Right side: Show X per page | Showing A to B of C entries */}
      <div className="flex items-center gap-4 text-xs text-neutral-600 font-medium">
        <div className="flex items-center gap-2">
          <span>Show</span>
          <select
            value={effectiveLimit}
            onChange={(e) => onLimitChange && onLimitChange(Number(e.target.value))}
            className="border border-neutral-300 rounded-lg px-2.5 py-1 text-xs bg-neutral-50 font-semibold text-neutral-800 focus:outline-none focus:border-brand-gold cursor-pointer shadow-2xs"
          >
            {LIMIT_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
          <span>per page</span>
        </div>
        <span className="text-neutral-300">|</span>
        <div>
          Showing <span className="font-semibold text-neutral-900">{startItem}</span> to{' '}
          <span className="font-semibold text-neutral-900">{endItem}</span> of{' '}
          <span className="font-semibold text-neutral-900">{effectiveTotal}</span> entries
        </div>
      </div>
    </div>
  );
};

export const PaginationBottom = ({
  currentPage,
  page,
  totalPages,
  totalItems,
  total,
  limit = 10,
  onPageChange,
}) => {
  const effectiveTotal = Number(total !== undefined ? total : (totalItems !== undefined ? totalItems : 0));
  const effectivePage = Math.max(1, Number(page !== undefined ? page : (currentPage !== undefined ? currentPage : 1)));
  const effectiveLimit = Math.max(1, Number(limit || 10));
  const effectiveTotalPages = Math.max(1, Number(totalPages || Math.ceil(effectiveTotal / effectiveLimit) || 1));

  if (effectiveTotal === 0 && effectiveTotalPages <= 1) return null;

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;

    if (effectiveTotalPages <= maxVisible) {
      for (let i = 1; i <= effectiveTotalPages; i++) pages.push(i);
    } else {
      let start = Math.max(1, effectivePage - 1);
      let end = Math.min(effectiveTotalPages, effectivePage + 1);

      if (effectivePage <= 2) {
        end = Math.min(effectiveTotalPages, 4);
      } else if (effectivePage >= effectiveTotalPages - 1) {
        start = Math.max(1, effectiveTotalPages - 3);
      }

      if (start > 1) {
        pages.push(1);
        if (start > 2) pages.push('...');
      }

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (end < effectiveTotalPages) {
        if (end < effectiveTotalPages - 1) pages.push('...');
        pages.push(effectiveTotalPages);
      }
    }
    return pages;
  };

  return (
    <div className="flex items-center justify-start gap-1.5 px-5 py-3 bg-white border-t border-neutral-200/80 rounded-b-xl">
      <button
        onClick={() => onPageChange && onPageChange(effectivePage - 1)}
        disabled={effectivePage <= 1}
        className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-neutral-200 text-neutral-700 bg-white hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        aria-label="Previous Page"
      >
        <ChevronLeft size={14} />
        <span>Prev</span>
      </button>

      <div className="flex items-center gap-1">
        {getPageNumbers().map((p, idx) => (
          p === '...' ? (
            <span key={`ellipsis-${idx}`} className="px-2 text-xs text-neutral-400">...</span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange && onPageChange(p)}
              className={`min-w-[30px] h-7 px-2 text-xs font-semibold rounded-lg transition-all ${
                effectivePage === p
                  ? 'bg-brand-gold text-white shadow-xs'
                  : 'bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50'
              }`}
            >
              {p}
            </button>
          )
        ))}
      </div>

      <button
        onClick={() => onPageChange && onPageChange(effectivePage + 1)}
        disabled={effectivePage >= effectiveTotalPages}
        className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-neutral-200 text-neutral-700 bg-white hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        aria-label="Next Page"
      >
        <span>Next</span>
        <ChevronRight size={14} />
      </button>
    </div>
  );
};

const Pagination = ({
  search,
  onSearchChange,
  searchPlaceholder,
  currentPage,
  page,
  totalPages,
  totalItems,
  total,
  limit = 10,
  onPageChange,
  onLimitChange,
  position = 'bottom',
}) => {
  if (position === 'top') {
    return (
      <PaginationTop
        search={search}
        onSearchChange={onSearchChange}
        searchPlaceholder={searchPlaceholder}
        totalItems={totalItems}
        total={total}
        limit={limit}
        currentPage={currentPage}
        page={page}
        onLimitChange={onLimitChange}
      />
    );
  }

  return (
    <PaginationBottom
      currentPage={currentPage}
      page={page}
      totalPages={totalPages}
      totalItems={totalItems}
      total={total}
      limit={limit}
      onPageChange={onPageChange}
    />
  );
};

export default Pagination;


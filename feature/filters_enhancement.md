# Filters Enhancement

Branch: `feature/enhancing-filters`

This document describes the changes made to the **Orchestrator job filters** (the
filter panel on the Jobs pages at `/jobs/:tab`). Three new client-side filters
were added — **Posted within**, **Location**, and **Employment type** — and the
filtering pipeline was refactored to make adding future filters cheaper.

All filtering is **client-side**, applied in-memory to the already-loaded job
list. Every filter is also serialized to the URL query string, so a filtered
view is shareable/bookmarkable and survives refreshes.

The filter panel was also **redesigned from a hidden slide-out drawer into an
always-visible inline filter bar** — see [UI redesign](#ui-redesign-inline-filter-bar) below.

---

## What's new (user-facing)

| Filter | Control | URL param | Behavior |
|--------|---------|-----------|----------|
| **Posted within** | Preset buttons: `24 hours`, `3 days`, `7 days`, `14 days`, `30 days` | `postedWithin` (number of days) | Keeps jobs posted within the last N days. Click the active preset again to clear it. Jobs with no/unparseable posting date are excluded while active. |
| **Location** | Free-text input (e.g. `London, Remote, Berlin`) | `location` (raw text) | Token-based, order-independent substring match — `london uk` matches `London, UK`. Jobs with no location are excluded while active. |
| **Employment type** | Multi-select checkboxes: Full-time, Part-time, Contract, Internship, Temporary | `employment` (comma-separated) | A job matches if its type maps to **any** selected bucket. Jobs whose type can't be recognized are excluded while active. |

These join the existing filters (tab, source, sponsorship, salary, dates, sort).
The active-filter count badge and the **Clear all** action both account for the
new filters.

---

## Files changed

| File | Change |
|------|--------|
| [orchestrator/src/client/pages/orchestrator/constants.ts](orchestrator/src/client/pages/orchestrator/constants.ts) | Added `EmploymentType`, `employmentTypeOptions`/`employmentTypeValues`, `postedWithinOptions`/`postedWithinValues`, and the consolidated `JobFilters` interface. |
| [orchestrator/src/client/pages/orchestrator/utils.ts](orchestrator/src/client/pages/orchestrator/utils.ts) | Added matchers: `matchesPostedWithin`, `matchesEmploymentType`, `matchesLocation`, plus helpers `extractEmploymentTypes` and `normalizeText`. |
| [orchestrator/src/client/pages/orchestrator/useOrchestratorFilters.ts](orchestrator/src/client/pages/orchestrator/useOrchestratorFilters.ts) | Added URL parse/serialize + setters for `postedWithinDays`, `employmentTypes`, `location`; wired them into the **Clear all** reset. |
| [orchestrator/src/client/pages/orchestrator/useFilteredJobs.ts](orchestrator/src/client/pages/orchestrator/useFilteredJobs.ts) | Refactored from a positional argument list to a single `JobFilters` object; applies the three new filters. |
| [orchestrator/src/client/pages/orchestrator/OrchestratorFilters.tsx](orchestrator/src/client/pages/orchestrator/OrchestratorFilters.tsx) | Added the three new filter cards (preset buttons, text input, checkbox grid) and included them in the active-filter count. |
| [orchestrator/src/client/pages/OrchestratorPage.tsx](orchestrator/src/client/pages/OrchestratorPage.tsx) | Passes the new filter state into `useFilteredJobs` and `OrchestratorFilters`. |
| `*.test.ts(x)` | Updated/added unit tests for the new matchers, URL handling, and filtering. |

---

## Architecture notes

### Single `JobFilters` object instead of positional args
`useFilteredJobs` previously took seven positional arguments. It now takes
`(jobs, filters: JobFilters)`. New filters can be added by extending the
`JobFilters` interface in `constants.ts` rather than growing the call signature
at every call site.

```ts
export interface JobFilters {
  activeTab: FilterTab;
  dateFilter: JobDateFilter;
  sourceFilter: JobSource | "all";
  sponsorFilter: SponsorFilter;
  salaryFilter: SalaryFilter;
  postedWithinDays: number | null;   // new
  employmentTypes: EmploymentType[]; // new
  location: string;                  // new
  sort: JobSort;
}
```

### Matching logic (utils.ts)
- **`matchesPostedWithin(job, days, now)`** — coerces the free-text `datePosted`
  (ISO date *or* relative phrases like `"3 days ago"`) via
  `getPostingDateSortValue`, then keeps jobs newer than `now - days`. `now` is
  passed in once per filter pass so all jobs are compared against the same clock.
- **`matchesLocation(job, query)`** — normalizes both query and `job.location`
  with `normalizeText` (lowercase, strip accents, collapse non-alphanumerics to
  spaces), then requires **every** query token to appear in the location.
- **`matchesEmploymentType(job, selected)`** — maps `job.jobType` free text onto
  canonical buckets with `extractEmploymentTypes` (regex-based, so `"Full-time"`,
  `"fulltime"`, `"permanent"` all resolve to `full_time`), and matches if any
  selected bucket is present.

### Exclusion semantics
For all three new filters, a job with **missing or unrecognizable** data
(`datePosted`, `location`, `jobType`) is **excluded** while that filter is
active — an unknown value can't be confirmed to satisfy the user's choice.

### URL state (useOrchestratorFilters.ts)
Each filter has a memoized getter that parses `searchParams` and a `useCallback`
setter that writes back with `{ replace: true }`. Invalid values are dropped
during parsing (e.g. `postedWithin` must be one of the preset values;
`employment` tokens must be known types). The **Clear all** action now also
deletes `postedWithin`, `employment`, and `location`.

---

## UI redesign (inline filter bar)

Previously all filters lived behind a **"Filters" button that opened a
right-side slide-out `Sheet`** — they were hidden by default and required a
click + scroll through a vertical stack of cards. They are now an
**always-visible filter bar** rendered directly under the tabs.

**Before:** `Filters` button → `Sheet` drawer → vertical stack of `Card`s.
**After:** inline, modern "faceted filter" bar that's visible at all times.

What changed in [OrchestratorFilters.tsx](orchestrator/src/client/pages/orchestrator/OrchestratorFilters.tsx):

- **Removed** the `Sheet` drawer and the `Card`-per-filter layout.
- **Added** a reusable `FilterPill` — a compact dropdown trigger (`Popover`)
  styled as a rounded pill. It is **dashed/muted when inactive** and turns
  **solid + highlighted** when active, showing the selected value inline
  (e.g. `Posted 7 days`, `Source LinkedIn`) or a count badge (e.g. employment
  types, date dimensions).
- Filters surfaced as pills: **Source, Posted, Employment, Dates, Sponsor,
  Salary**, plus a **Sort** pill (separated by a divider).
- **Location** is a live inline text input with a map-pin icon and an inline
  clear (✕) button — no dropdown needed; it filters as you type.
- **Active-filter chips row**: every applied filter shows as a removable
  `Badge` under the bar, each with its own ✕, plus a **Clear all** link. This
  makes it obvious what's applied and lets you remove filters one at a time.
- **Reset** button (with icon) appears in the bar only when ≥1 filter is active.
- Tabs, command-bar **Search**, sort analytics, and all existing behavior are
  preserved.

The `isFiltersOpen` / `onFiltersOpenChange` props are kept on the component for
API compatibility with `OrchestratorPage` but are no longer used to drive a
drawer (filters are always visible now).

Tests in
[OrchestratorFilters.test.tsx](orchestrator/src/client/pages/orchestrator/OrchestratorFilters.test.tsx)
were updated to drive the inline pills/popovers instead of the old drawer.

## How to verify

1. Run the app (see the repo `orchestrator/README.md` / instructions below).
2. Open a Jobs tab, e.g. `http://localhost:5173/jobs/all`, and open the filter panel.
3. Exercise each new filter and confirm:
   - The URL gains `?postedWithin=...`, `?employment=...`, `?location=...`.
   - The active-filter badge increments and **Clear all** resets everything.
   - Reloading the page preserves the filtered view.

Run the unit tests for the filter module:

```bash
cd orchestrator
npm run test:run -- src/client/pages/orchestrator
```

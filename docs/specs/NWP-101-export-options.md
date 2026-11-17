# SPEC · NWP-101 — Payments export: let ops choose columns and scope

> Written before any code. Generated with `/spec`, then edited by a human.
> Load it as context when you build: `@docs/specs/NWP-101-export-options.md`

**Ticket:** [NWP-101](../tickets/NWP-101.md)
**Author:** Claude Code, for review
**Status:** draft

## Problem

Ops exports the payments table several times a day, but every file carries every column, including card last-four. Anything sent to a merchant gets cleaned up by hand: 3–4 hours a month, and one near-miss last quarter when an unedited file nearly went to the wrong merchant. Ops needs to pick the columns and the scope before the file is made.

## Current state

All paths are under `build-battle/merchant-console/`.

- `src/app/payments/page.tsx:36–45` builds its own `PaymentFilters` from `searchParams` by hand. It doesn't use `parseFilters`, and it ignores `from`, `to` and `sort`. It calls `queryPayments`, which already returns `total`.
- `src/app/payments/page.tsx:68–76` — Export is a plain `<a href="/api/payments/export?{query}">` with no options.
- `src/app/api/payments/export/route.ts:11–25` calls `parseFilters`, then `filterPayments` and `sortPayments` with **no** `paginate`, so the export already includes every matching row. Then it calls `toCsv(rows)` with the default columns and `exportFilename()`. It never returns an error response.
- `src/data/queries.ts:18–36` — `parseFilters` is the server allowlist for status, sort and direction. `merchantId`, `search`, `from` and `to` pass through unchecked.
- `src/data/queries.ts:45–106` — `filterPayments`, `sortPayments` and `queryPayments`: the one query builder.
- `src/lib/csv.ts:13–24` — `EXPORT_COLUMNS` (10 columns, `last4` included). `toCsv` (`:58–67`) **already accepts a `columns` argument**, and `exportFilename` (`:69–71`) returns `payments-YYYY-MM-DD.csv`.
- `src/lib/csv.ts:33–56` — `cell()` formats the amount once with `formatMoney` (`src/lib/money.ts:15`) and writes `currency` as its own column. Acceptance criterion 4 already holds.
- `src/lib/csv.test.ts` — 9 tests. One already checks that a subset of columns comes out in the order given.
- `src/components/Drawer.tsx` — a Tremor wrapper over `@radix-ui/react-dialog`, exporting `Drawer`, `DrawerContent`, `DrawerTitle`, `DrawerFooter` and the rest. It's unused today.

**Where the ticket or the rules don't match the code:**
- The ticket warns against building the export in the browser, which would export one page. The export is already server-side and already covers every matching row; that part needs no change.
- The ticket warns against putting column names into SQL. There is no SQL; the store is an in-memory array. The same risk applies to the CSV header and the filename.
- `.claude/rules/components.md` lists a `Dialog` in `src/components/`. There isn't one. `Drawer` is the dialog primitive that exists.

## Domain rules

| Rule | Source | What breaks if ignored |
| --- | --- | --- |
| "Anything from the client — column names, currencies, limits, statuses — is checked against an allowlist before it reaches a query, a filename, or the store." | `merchant-console/CLAUDE.md` | Arbitrary text in CSV headers and filenames |
| "Column names arrive from the client, so **validate them server-side**." | Ticket notes | Same |
| "Payment filtering goes through the one behind `GET /api/payments`. Writing a second filter path is a defect." | `.claude/rules/api-routes.md` | Export and table disagree |
| "Money is integer minor units… Format once, at the edge, next to its currency code." | `merchant-console/CLAUDE.md` | Drift and double formatting |
| "Return the same error shape everywhere: a status code that means what it says, and a body with a message safe to show a user." | `.claude/rules/api-routes.md` | Inconsistent client handling |
| "Every input has a label, the dialog has an accessible name, focus moves into it and returns on close, Escape closes it." | `.claude/rules/components.md` | Inaccessible dialog |
| "Card last-four is **off** by default." | Ticket AC 1 | The same near-miss again |

## Approach

Put the option parsing in `src/lib/csv.ts`, next to `EXPORT_COLUMNS`. A new `parseExportOptions` takes the URL params and returns either validated `{ columns, scope }` or an error message:
- `columns` is a comma-separated list, checked against `EXPORT_COLUMNS`, de-duplicated, and kept in the requested order.
- If `columns` is missing, the result is a new `DEFAULT_EXPORT_COLUMNS`: every column except `last4`.
- An empty or unknown column is rejected.
- `scope` must be `current` or `all`, and defaults to `current`.

The export route calls `parseFilters` and `parseExportOptions` and rejects bad input early with a 400. For `scope=all` it runs the same `filterPayments` with no filters. It then calls `toCsv(rows, columns)` and `exportFilename(date, label)`, where the label is built only from allowlisted values.

On `/payments`, Export opens a `Drawer` with a labelled checkbox per column (last-four unchecked) and a current/all choice. It shows the row count for the chosen scope, passed in as props from the page. Download is a link with the chosen options in its URL, and it's disabled when no columns are selected.

**Considered and rejected:**
- *Fetching the row count from `GET /api/payments` inside the dialog:* the page already has `total` from `queryPayments`, so a fetch would add a loading state for nothing.
- *Adding a new `Dialog` component:* `Drawer` already wraps Radix Dialog with focus trapping, Escape and an accessible title.
- *Validating columns in the browser only:* the rules forbid it.

## File map

| File | Add or change | Why |
| --- | --- | --- |
| `src/lib/csv.ts` | Change | Add `DEFAULT_EXPORT_COLUMNS` and `parseExportOptions`, and give `exportFilename` a scope label. `toCsv` stays as it is. |
| `src/lib/csv.test.ts` | Change | Tests for column selection, the defaults, an empty selection, unknown columns, scope, and the filename. The existing 9 stay as they are. |
| `src/app/api/payments/export/route.ts` | Change | Validate and reject early, handle scope, pass columns and the label through. |
| `src/app/payments/page.tsx` | Change | Use `parseFilters` so the count on screen matches what gets exported. Compute both counts and render the dialog. |
| `src/app/payments/export-dialog.tsx` | Add | Client component: the drawer, checkboxes, scope choice, count, Download link. |

## Plan

1. **Baseline.** Run `npm test`. Done when it shows 28 passing.
2. **Lib.** Add `DEFAULT_EXPORT_COLUMNS`, `parseExportOptions` and the scoped `exportFilename`, with tests in `csv.test.ts`. Done when `npm test` passes with the new tests.
3. **Route.** Wire validation, scope and filename into `export/route.ts`. Done when `curl` gives:
   - default request: a header without `last4`
   - `columns=id,bogus`: 400 with a message
   - `columns=`: 400
   - `scope=all`: every payment in the store
   - `content-disposition` carrying the scoped filename
4. **Page counts.** Switch `page.tsx` to `parseFilters` and compute the current and all counts. Done when the table looks the same as before for every filter.
5. **Dialog.** Add `export-dialog.tsx` and replace the Export link with it. Done when, in the browser:
   - the drawer opens with last-four unchecked
   - the count changes with scope
   - unchecking every column disables Download
   - Escape closes it and focus returns to the Export button
   - the downloaded file matches the selection
6. **Wrap up.** Run `npm test` again, then `/ship-ready`.

## Verification

| Acceptance criterion | How it is proven |
| --- | --- |
| Choose columns; last-four off by default | `csv.test.ts`: defaults exclude `last4`; a subset comes back in the requested order. `curl` with no `columns` has no `last4`. Drawer shows it unchecked. |
| Scope current/all, current by default, count visible | `csv.test.ts`: scope defaults to `current` and rejects other values. `curl` with `scope=all` returns every payment. The drawer count matches the line count of the file. |
| Filename shows scope and date | `csv.test.ts` filename cases. `curl -I` shows the `content-disposition` header. |
| Minor units, formatted once, currency in its own column | Existing `toCsv` tests stay green. `cell()` is unchanged. |
| No columns disables Download | Clicked in the browser. The server also rejects `columns=` (test plus `curl`). |

## Risks

- **The count on screen could differ from the export.** It would if the page and the route parsed filters differently. Step 4 removes the page's own parser.
- **The page will honour sort params it used to ignore.** After step 4 the table honours `sort=amount` from the URL, which goes through the string-compare bug in `sortPayments` (`queries.ts:79–81`). The UI never sends it, so it only shows up on a hand-typed URL. I'll flag it rather than fix it.
- **There is no error shape to copy.** The repo has none yet, so I'll use JSON `{ "error": "<message>" }` with status 400 and note it in the PR.

## Out of scope

- The amount-sort string-compare bug (`queries.ts:79–81`): a separate fix.
- Checking `merchantId`, `search`, `from` and `to` in `parseFilters`. The label only uses allowlisted values, so these never reach the filename.
- Persistence (NWP-203), virtual cards (NWP-201), and saved export presets.

## Open questions

- **Filename label.** Recommendation:
  - `scope=all` → `payments-all-<date>.csv`
  - current with a status filter → `payments-<status>-<date>.csv`, matching the ticket's example
  - current with merchant or search filters → `-filtered` added before the date
  - current with no filters → `payments-all-<date>.csv`

  Search text and merchant IDs never go into the filename.
- **Date in the filename.** The UTC date of the export (today's behaviour), not the seed's "as of" date.

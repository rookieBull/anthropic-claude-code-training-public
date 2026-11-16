import { merchantById } from "@/data/merchants"
import { Payment } from "@/data/types"
import { formatMoney } from "./money"

/**
 * CSV export for the payments table.
 *
 * Ops chooses the columns and the scope (NWP-101). Both arrive from the
 * client, so the parsers below check them against an allowlist before they
 * reach the serializer or a filename. The card last four is available but
 * off unless asked for, because a file often goes straight to a merchant.
 */

export const EXPORT_COLUMNS = [
  "id",
  "created_at",
  "merchant",
  "description",
  "status",
  "method",
  "card_brand",
  "last4",
  "amount",
  "currency",
] as const

export type ExportColumn = (typeof EXPORT_COLUMNS)[number]

/** What an export contains unless ops asks for more. Card last four is opt-in. */
export const DEFAULT_EXPORT_COLUMNS: readonly ExportColumn[] =
  EXPORT_COLUMNS.filter((column) => column !== "last4")

export type ExportScope = "filter" | "all"

export type Parsed<T> =
  | { ok: true; value: T }
  | { ok: false; message: string }

function isExportColumn(name: string): name is ExportColumn {
  return (EXPORT_COLUMNS as readonly string[]).includes(name)
}

/**
 * Parses the `columns` query parameter. Absent means the defaults. Present
 * but empty is an error rather than an empty file. Order is the order asked
 * for; repeats are dropped; anything not in EXPORT_COLUMNS is rejected.
 */
export function parseExportColumns(
  raw: string | null,
): Parsed<readonly ExportColumn[]> {
  if (raw === null) return { ok: true, value: DEFAULT_EXPORT_COLUMNS }

  const requested = raw
    .split(",")
    .map((name) => name.trim())
    .filter((name) => name.length > 0)
  if (requested.length === 0) {
    return { ok: false, message: "Choose at least one column to export." }
  }

  const columns: ExportColumn[] = []
  for (const name of requested) {
    if (!isExportColumn(name)) {
      return { ok: false, message: `Unknown export column: ${name}` }
    }
    if (!columns.includes(name)) columns.push(name)
  }
  return { ok: true, value: columns }
}

/** Parses the `scope` query parameter. Absent means the current filter. */
export function parseExportScope(raw: string | null): Parsed<ExportScope> {
  if (raw === null || raw === "filter") return { ok: true, value: "filter" }
  if (raw === "all") return { ok: true, value: "all" }
  return { ok: false, message: "Scope must be either filter or all." }
}

function escapeCell(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

function cell(payment: Payment, column: ExportColumn): string {
  switch (column) {
    case "id":
      return payment.id
    case "created_at":
      return payment.createdAt
    case "merchant":
      return merchantById(payment.merchantId)?.name ?? payment.merchantId
    case "description":
      return payment.description
    case "status":
      return payment.status
    case "method":
      return payment.method
    case "card_brand":
      return payment.cardBrand ?? ""
    case "last4":
      return payment.last4 ?? ""
    case "amount":
      return formatMoney(payment.amount, payment.currency)
    case "currency":
      return payment.currency
  }
}

export function toCsv(
  payments: Payment[],
  columns: readonly ExportColumn[] = EXPORT_COLUMNS,
): string {
  const header = columns.join(",")
  const rows = payments.map((payment) =>
    columns.map((column) => escapeCell(cell(payment, column))).join(","),
  )
  return [header, ...rows].join("\n")
}

/**
 * `label` names the scope: a status, "all", or "filtered". It must be an
 * allowlisted value chosen by the route, never raw client input, because it
 * lands in a Content-Disposition header.
 */
export function exportFilename(date = new Date(), label?: string): string {
  const day = date.toISOString().slice(0, 10)
  return label ? `payments-${label}-${day}.csv` : `payments-${day}.csv`
}

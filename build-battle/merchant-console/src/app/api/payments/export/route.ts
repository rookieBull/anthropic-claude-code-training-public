import { filterPayments, parseFilters, sortPayments } from "@/data/queries"
import { PaymentFilters } from "@/data/types"
import {
  exportFilename,
  parseExportColumns,
  parseExportScope,
  toCsv,
} from "@/lib/csv"
import { NextRequest } from "next/server"

function badRequest(message: string) {
  return Response.json({ error: message }, { status: 400 })
}

/**
 * Exports payments as CSV.
 *
 * Columns and scope come from the client, so both are validated before use.
 * Rows come from the shared query builder: scope "all" is the same builder
 * with no filters, not a second query path. The export is never paginated.
 */
export function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams

  const columns = parseExportColumns(params.get("columns"))
  if (!columns.ok) return badRequest(columns.message)

  const scope = parseExportScope(params.get("scope"))
  if (!scope.ok) return badRequest(scope.message)

  const filters: PaymentFilters =
    scope.value === "all" ? {} : parseFilters(params)
  const rows = sortPayments(
    filterPayments(filters),
    filters.sort ?? "createdAt",
    filters.direction ?? "desc",
  )

  // The label is always an allowlisted value: parseFilters only returns a
  // known status, and the other two are literals.
  const label =
    scope.value === "all"
      ? "all"
      : filters.status && filters.status !== "all"
        ? filters.status
        : "filtered"

  return new Response(toCsv(rows, columns.value), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${exportFilename(new Date(), label)}"`,
    },
  })
}

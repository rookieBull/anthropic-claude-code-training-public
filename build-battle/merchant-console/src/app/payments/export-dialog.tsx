"use client"

import { Button } from "@/components/Button"
import {
  Drawer,
  DrawerBody,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/Drawer"
import { ExportColumn, ExportScope } from "@/lib/csv"
import { Download } from "lucide-react"
import { useId, useState } from "react"

const COLUMN_LABELS: Record<ExportColumn, string> = {
  id: "Payment ID",
  created_at: "Created at",
  merchant: "Merchant",
  description: "Description",
  status: "Status",
  method: "Method",
  card_brand: "Card brand",
  last4: "Card last four",
  amount: "Amount",
  currency: "Currency",
}

const controlClass =
  "size-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-950"

/**
 * Export options for the payments table.
 *
 * The browser only chooses; the server builds the file. Download is a plain
 * link to /api/payments/export, which validates the columns and scope again
 * and exports every matching row, not just the page on screen.
 */
export function ExportDialog({
  columns,
  defaultColumns,
  filterQuery,
  filteredCount,
  allCount,
}: {
  columns: readonly ExportColumn[]
  defaultColumns: readonly ExportColumn[]
  /** The current filters as a query string, without paging. */
  filterQuery: string
  filteredCount: number
  allCount: number
}) {
  const [selected, setSelected] = useState<readonly ExportColumn[]>(defaultColumns)
  const [scope, setScope] = useState<ExportScope>("filter")
  const idPrefix = useId()

  // Keep the file's column order stable regardless of the order boxes were ticked.
  const chosen = columns.filter((column) => selected.includes(column))
  const count = scope === "all" ? allCount : filteredCount

  const params = new URLSearchParams(scope === "filter" ? filterQuery : "")
  params.set("scope", scope)
  params.set("columns", chosen.join(","))
  const href = `/api/payments/export?${params.toString()}`

  const toggle = (column: ExportColumn, checked: boolean) =>
    setSelected((current) =>
      checked ? [...current, column] : current.filter((c) => c !== column),
    )

  return (
    <Drawer>
      <DrawerTrigger asChild>
        <Button variant="secondary" className="w-full gap-2 py-1.5 sm:w-fit">
          <Download
            className="-ml-0.5 size-4 shrink-0 text-gray-400 dark:text-gray-600"
            aria-hidden="true"
          />
          Export
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Export payments</DrawerTitle>
          <DrawerDescription>
            Choose what goes in the CSV before you download it.
          </DrawerDescription>
        </DrawerHeader>

        <DrawerBody className="flex flex-col gap-6">
          <fieldset>
            <legend className="text-sm font-medium text-gray-900 dark:text-gray-50">
              Scope
            </legend>
            <div className="mt-2 flex flex-col gap-2">
              <label
                htmlFor={`${idPrefix}-scope-filter`}
                className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
              >
                <input
                  id={`${idPrefix}-scope-filter`}
                  type="radio"
                  name={`${idPrefix}-scope`}
                  className={controlClass}
                  checked={scope === "filter"}
                  onChange={() => setScope("filter")}
                />
                Current filter ({filteredCount.toLocaleString()} payments)
              </label>
              <label
                htmlFor={`${idPrefix}-scope-all`}
                className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
              >
                <input
                  id={`${idPrefix}-scope-all`}
                  type="radio"
                  name={`${idPrefix}-scope`}
                  className={controlClass}
                  checked={scope === "all"}
                  onChange={() => setScope("all")}
                />
                All payments ({allCount.toLocaleString()} payments)
              </label>
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-sm font-medium text-gray-900 dark:text-gray-50">
              Columns
            </legend>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {columns.map((column) => (
                <label
                  key={column}
                  htmlFor={`${idPrefix}-col-${column}`}
                  className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
                >
                  <input
                    id={`${idPrefix}-col-${column}`}
                    type="checkbox"
                    className={controlClass}
                    checked={selected.includes(column)}
                    onChange={(event) => toggle(column, event.target.checked)}
                  />
                  {COLUMN_LABELS[column]}
                </label>
              ))}
            </div>
            {chosen.length === 0 && (
              <p
                role="alert"
                className="mt-2 text-sm text-red-600 dark:text-red-500"
              >
                Choose at least one column to download.
              </p>
            )}
          </fieldset>
        </DrawerBody>

        <DrawerFooter className="items-center gap-2">
          <p className="text-sm text-gray-500 sm:mr-auto">
            {count.toLocaleString()} {count === 1 ? "row" : "rows"} will be exported
          </p>
          <DrawerClose asChild>
            <Button variant="secondary">Cancel</Button>
          </DrawerClose>
          {chosen.length === 0 ? (
            <Button disabled>Download</Button>
          ) : (
            <Button asChild>
              <a href={href}>Download</a>
            </Button>
          )}
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}

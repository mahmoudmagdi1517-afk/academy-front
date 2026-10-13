import React, { ReactNode } from "react";

export interface DataTableColumn<T> {
  key: string;
  header: ReactNode;
  render: (row: T) => ReactNode;
  className?: string;
  headerClassName?: string;
}

interface DataTableProps<T> {
  rows: T[];
  columns: DataTableColumn<T>[];
  rowKey: (row: T) => React.Key;
  rowClassName?: (row: T) => string;
}

export const DataTable = <T,>({
  rows,
  columns,
  rowKey,
  rowClassName,
}: DataTableProps<T>) => (
  <div className="overflow-x-auto">
    <table className="w-full text-left rtl:text-right border-collapse text-xs">
      <thead>
        <tr className="border-b border-slate-100 bg-slate-50/75 text-slate-500 font-bold uppercase tracking-wider">
          {columns.map((column) => (
            <th
              key={column.key}
              className={`py-3 px-4 ${column.headerClassName || ""}`}
            >
              {column.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
        {rows.map((row) => (
          <tr
            key={rowKey(row)}
            className={`hover:bg-slate-50/80 transition ${rowClassName?.(row) || ""}`}
          >
            {columns.map((column) => (
              <td
                key={column.key}
                className={`py-3.5 px-4 ${column.className || ""}`}
              >
                {column.render(row)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

import { closestFromEvent } from "../../utils/dom";
import { Icon } from "../icon";

import style from "./Table.module.css";
interface TableHeader {
  title: string;
  id: string;
  orderable?: boolean;
}

// desc: newest first, 9-1 Z-A
// asc: oldest first,  1-9 A-Z

export type TableOrder = "asc" | "desc";

export interface OrderBy {
  headerId: string;
  by: TableOrder;
}
interface CreateTableOpts {
  signal: AbortSignal;
  headers: TableHeader[];
  rows: () => any[][];
  orderBy: () => OrderBy;
  onOrderChange?: (event: OrderBy) => void;
}

const DesktopTable = (opts: CreateTableOpts) => {
  const highlightId = opts.orderBy().headerId;

  return (
    <table class={style.table}>
      <thead>
        <tr>
          {opts.headers.map((h) => (
            <th class={style.headerCell} data-header-id={h.id}>
              <div
                class={[
                  style.headerCellInner,
                  h.orderable && style.orderable,
                  highlightId === h.id && style.highlight,
                ]}
              >
                {h.title}
                <Icon name="unfold_more" class={style.icon} />
              </div>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {opts.rows().map((r) => (
          <tr>
            {r.map((c) => (
              <td class={style.cell}>{c}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export const createTable = (opts: CreateTableOpts) => {
  const signal = opts.signal;
  const tableEl = (<div></div>) as HTMLDivElement;

  tableEl.addEventListener(
    "click",
    (e) => {
      const headerEl = closestFromEvent(e, "[data-header-id]");
      if (!headerEl) return;
      const headerId = headerEl.dataset.headerId!;
      const orderBy = opts.orderBy();
      const alreadySelected = orderBy.headerId === headerId;

      if (alreadySelected) {
        orderBy.by = orderBy.by === "asc" ? "desc" : "asc";
        return opts.onOrderChange?.(orderBy);
      }
      return opts.onOrderChange?.({ by: "asc", headerId });
    },
    { signal },
  );

  const rerender = () => {
    if (signal.aborted) return;
    tableEl.replaceChildren(DesktopTable(opts));
  };
  rerender();

  return {
    element: tableEl,
    rerender,
  };
};

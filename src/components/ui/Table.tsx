import morphdom from "morphdom";

import { isMobileWidth } from "../../config";
import { closestFromEvent } from "../../utils/dom";
import { storeEmitter } from "../../utils/EventEmitter";
import { Icon } from "../icon";
import { Item } from "./item";

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
  rows: () => { row: any[]; id: string }[];
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
                {h.orderable && <Icon name="unfold_more" class={style.icon} />}
              </div>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {opts.rows().map((r) => (
          <tr data-row-id={r.id}>
            {r.row.map((c) => (
              <td class={style.cell}>{c}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
};

const MobileTable = (opts: CreateTableOpts) => {
  const orderBy = opts.orderBy();
  const header = (
    <div>
      <div>Sort By</div>
      <div class={style.mobileSortContainer}>
        {opts.headers
          .filter((f) => f.orderable)
          .map((h) => (
            <Item.Base
              handlePosition="bottom"
              selected={orderBy.headerId === h.id}
              data-header-id={h.id}
            >
              <Item.Label>{h.title}</Item.Label>
              {h.orderable && <Icon name="unfold_more" class={style.icon} />}
            </Item.Base>
          ))}
      </div>
    </div>
  );

  return (
    <div>
      {header}

      <div class={style.mobileRows}>
        {opts.rows().map((r) => (
          <div data-row-id={r.id}>
            {r.row.map((c, i) => (
              <div class={style.mobileCell}>
                <div class={style.title}>{opts.headers[i]?.title}</div>
                <div>{c}</div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
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

      if (!opts.headers.find((h) => h.id === headerId)?.orderable) {
        return;
      }

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

    let el = isMobileWidth() ? MobileTable(opts) : DesktopTable(opts);

    morphdom(tableEl, <div>{el}</div>, { childrenOnly: true });
  };
  rerender();

  storeEmitter.on("drawer:modeChange", rerender, signal);

  return {
    element: tableEl,
    rerender,
  };
};

import { t } from "@lingui/core/macro";

import { Button } from "./button";
import { Dropdown } from "./createDropdown";
import { Input } from "./input";
import { Item } from "./item";
import { createModal, Modal } from "./modal";

import style from "./TimeModal.module.css";

interface GenericDeleteModalOpts {
  onConfirm: () => void;
}

const Tabs = () => (
  <div class={style.tabs}>
    <Item.Base
      data-tab="relative"
      class={style.tab}
      selected
      handlePosition="bottom"
    >
      <Item.Icon name="schedule" />
      <Item.Label>{t`Relative`}</Item.Label>
    </Item.Base>
    <Item.Base data-tab="offset" class={style.tab} handlePosition="bottom">
      <Item.Icon name="globe" />
      <Item.Label>{t`Offset`}</Item.Label>
    </Item.Base>
  </div>
);

type Tab = "relative" | "offset";

export const createTimeModal = (_opts: GenericDeleteModalOpts) => {
  const abortController = new AbortController();
  const { signal } = abortController;
  let currentTab: Tab = "relative";

  const contentEl = (<div></div>) as HTMLDivElement;
  const el = (
    <Modal.Root>
      <Modal.Header label={t`Time`} icon="schedule" />
      <Modal.Body width="320px" class={style.body}>
        <Tabs />
        {contentEl}
      </Modal.Body>
      <Modal.Footer>
        <Button data-action="confirm" icon="check" primary label={t`Confirm`} />
      </Modal.Footer>
    </Modal.Root>
  ) as HTMLDivElement;

  let contentAbortController = new AbortController();

  const updateTab = () => {
    contentAbortController.abort();
    el.querySelectorAll<HTMLElement>("[data-tab]").forEach((tab) => {
      tab.dataset.selected = String(tab.dataset.tab === currentTab);
    });
    contentAbortController = new AbortController();
    contentEl.replaceChildren(
      <RelativeContent signal={contentAbortController.signal} />,
    );
  };
  updateTab();

  el.addEventListener(
    "click",
    (event) => {
      const target = event.target as HTMLDivElement;

      const tabEl = target.closest("[data-tab]") as HTMLDivElement;
      if (tabEl) {
        const tab = tabEl.dataset.tab as Tab;
        if (tab === currentTab) return;
        currentTab = tab;
        updateTab();
        return;
      }

      const actionBtn = target.closest("[data-action]") as HTMLDivElement;
      const action = actionBtn?.dataset.action;

      if (action === "confirm") {
      }
    },
    { signal },
  );

  createModal(() => {
    return el;
  }, abortController);
};

const MonthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const Presets = () => [
  { label: t`15 minutes` },
  { label: t`30 minutes` },
  { label: t`1 hour` },
  { label: t`6 hours` },
  { label: t`12 hours` },
  { label: t`1 day` },
];

const RelativeContent = (props: { signal: AbortSignal }) => {
  const date = new Date();

  let month = date.getMonth();
  let day = date.getDate();
  let year = date.getFullYear();

  const updateVals = () => {
    month = date.getMonth();
    day = date.getDate();
    year = date.getFullYear();
  };

  const dateDropdown = Dropdown.create({
    signal: props.signal,
    onChange(id) {
      date.setDate(parseInt(id) + 1);
      updateVals();
    },
    initialSelectedId() {
      return (day - 1).toString();
    },
    items() {
      const days = dayNamesInMonth(year, month);
      return days.map((d, i) => (
        <Dropdown.Item id={i.toString()}>
          <Dropdown.Label>
            {addOrdinalSuffix(d.day)} {d.dayName}
          </Dropdown.Label>
        </Dropdown.Item>
      ));
    },
  });
  const monthDropdown = Dropdown.create({
    signal: props.signal,
    onChange(id) {
      const dayCount = dayNamesInMonth(year, parseInt(id)).length;
      if (day >= dayCount) {
        date.setDate(dayCount);
      }
      date.setMonth(parseInt(id));

      updateVals();
      dateDropdown.update();
    },
    initialSelectedId() {
      return month.toString();
    },
    items() {
      return MonthNames.map((m, i) => (
        <Dropdown.Item id={i.toString()}>
          <Dropdown.Label>{m}</Dropdown.Label>
        </Dropdown.Item>
      ));
    },
  });

  return (
    <div>
      <div class={style.title}>{t`Presets`}</div>
      <div class={style.presets}>
        {Presets().map((p) => (
          <Button label={p.label} />
        ))}
      </div>

      <div class={style.inputs}>
        {dateDropdown.el}
        {monthDropdown.el}
        <Input class={style.yearInput} maxLength={4} value={year.toString()} />
      </div>
    </div>
  );
};

const dayNamesInMonth = (year: number, month: number) => {
  const totalDays = getDaysInMonth(year, month);

  return Array.from({ length: totalDays }, (_, index) => {
    return {
      day: index + 1,
      dayName: getDayNameForDate(year, month, index + 1),
    };
  });
};

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getDayNameForDate(
  year: number,
  month: number, // 0-indexed month
  day: number,
  locale: string = "en-US",
): string {
  const date = new Date(year, month, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month ||
    date.getDate() !== day
  ) {
    console.warn(
      `Warning: Input date ${year}-${
        month + 1
      }-${day} resulted in a different date object: ${date.toDateString()}. Check your inputs.`,
    );
  }

  return date.toLocaleDateString(locale, { weekday: "long" });
}
function addOrdinalSuffix(n: number): string {
  if (!Number.isInteger(n)) {
    throw new Error("Input must be an integer.");
  }

  const lastTwoDigits: number = n % 100;
  if (lastTwoDigits >= 11 && lastTwoDigits <= 13) {
    return n + "th";
  }

  const lastDigit: number = n % 10;
  switch (lastDigit) {
    case 1:
      return n + "st";
    case 2:
      return n + "nd";
    case 3:
      return n + "rd";
    default:
      return n + "th";
  }
}

import { t } from "@lingui/core/macro";
import { matchSorter } from "match-sorter";

import { debounce } from "../utils/debounce";
import { myTimezone, Timezones } from "../utils/Timezones";
import { Button } from "./button";
import { Dropdown } from "./createDropdown";
import { Input } from "./input";
import { TimestampType } from "./input";
import { Item } from "./item";
import { createModal, Modal } from "./modal";

import style from "./TimeModal.module.css";

interface GenericDeleteModalOpts {
  onConfirm: (event: {
    type: typeof TimestampType.RELATIVE;
    val: number;
  }) => void;
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
let cacheTime = 0;

export const createTimeModal = (opts: GenericDeleteModalOpts) => {
  const abortController = new AbortController();
  const { signal } = abortController;
  let currentTab: Tab = "relative";

  const contentEl = (<div></div>) as HTMLDivElement;
  const el = (
    <Modal.Root disableGestures fullHeight>
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
      currentTab === "relative" ? (
        <RelativeContent signal={contentAbortController.signal} />
      ) : (
        <OffsetContent signal={contentAbortController.signal} />
      ),
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
        opts.onConfirm({
          type: TimestampType.RELATIVE,
          val: Math.floor(cacheTime / 1000),
        });
        abortController.abort();
      }
    },
    { signal },
  );

  signal.addEventListener("abort", () => {
    contentAbortController.abort();
  });

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
  { label: t`15 minutes`, value: 15 * 60 },
  { label: t`30 minutes`, value: 30 * 60 },
  { label: t`1 hour`, value: 60 * 60 },
  { label: t`6 hours`, value: 6 * 60 * 60 },
  { label: t`12 hours`, value: 12 * 60 * 60 },
  { label: t`1 day`, value: 24 * 60 * 60 },
];
const hours = Array.from({ length: 24 }, (_, index) => index);
const minutes = Array.from({ length: 60 }, (_, index) => index);

const RelativeContent = (props: { signal: AbortSignal }) => {
  let date = new Date();

  const updateSelectedPreset = () => {
    const buttons = el.querySelectorAll<HTMLDivElement>("[data-preset-index");
    buttons.forEach((v, i) => {
      const preset = Presets()[i]!;
      const shouldHighlight =
        Math.abs(date.getTime() - (Date.now() + preset.value * 1000)) < 60_000;
      v.dataset.primary = String(shouldHighlight);
    });
  };

  const vals = () => {
    requestAnimationFrame(() => updateSelectedPreset());
    cacheTime = date.getTime();
    return {
      month: date.getMonth(),
      day: date.getDate(),
      year: date.getFullYear(),
      hours: date.getHours(),
      minutes: date.getMinutes(),
    };
  };

  const dateDropdown = Dropdown.create({
    signal: props.signal,
    class: style.dropdownDate,
    onChange(id) {
      date.setDate(parseInt(id) + 1);
    },
    initialSelectedId() {
      return (vals().day - 1).toString();
    },
    items() {
      const days = dayNamesInMonth(vals().year, vals().month);
      return days.map((d, i) => (
        <Dropdown.Item id={i.toString()}>
          <Dropdown.Label
            style={{
              flex: 1,
              minWidth: 0,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {addOrdinalSuffix(d.day)} {d.dayName}
          </Dropdown.Label>
        </Dropdown.Item>
      ));
    },
  });
  const monthDropdown = Dropdown.create({
    signal: props.signal,
    class: style.dropdownMonth,
    onChange(id) {
      const dayCount = dayNamesInMonth(vals().year, parseInt(id)).length;
      if (vals().day >= dayCount) {
        date.setDate(dayCount);
      }
      date.setMonth(parseInt(id));

      dateDropdown.update();
    },
    initialSelectedId() {
      return vals().month.toString();
    },
    items() {
      return MonthNames.map((m, i) => (
        <Dropdown.Item id={i.toString()}>
          <Dropdown.Label style={{ flex: 1, minWidth: 0 }}>{m}</Dropdown.Label>
        </Dropdown.Item>
      ));
    },
  });
  const hoursDropdown = Dropdown.create({
    signal: props.signal,
    class: style.dropdownHours,
    onChange(id) {
      date.setHours(parseInt(id));
    },
    initialSelectedId() {
      return vals().hours.toString();
    },
    items() {
      return hours.map((h) => (
        <Dropdown.Item id={h.toString()}>
          <Dropdown.Label style={{ flex: 1, minWidth: 0 }}>
            {h.toString().padStart(2, "0")}
          </Dropdown.Label>
        </Dropdown.Item>
      ));
    },
  });
  const minsDropdown = Dropdown.create({
    signal: props.signal,
    class: style.dropdownMins,
    onChange(id) {
      date.setMinutes(parseInt(id));
    },
    initialSelectedId() {
      return vals().minutes.toString();
    },
    items() {
      return minutes.map((m) => (
        <Dropdown.Item id={m.toString()}>
          <Dropdown.Label style={{ flex: 1, minWidth: 0 }}>
            {m.toString().padStart(2, "0")}
          </Dropdown.Label>
        </Dropdown.Item>
      ));
    },
  });

  const el = (
    <div>
      <div class={style.title}>{t`Presets`}</div>
      <div class={style.presets}>
        {Presets().map((p, i) => (
          <Button data-preset-index={i.toString()} label={p.label} />
        ))}
      </div>

      <div class={style.inputs}>
        {dateDropdown.el}
        {monthDropdown.el}
        <Input
          class={style.yearInput}
          maxLength={4}
          value={vals().year.toString()}
        />
      </div>

      <div class={style.timeContainer}>
        {hoursDropdown.el}
        {minsDropdown.el}
      </div>
    </div>
  ) as HTMLDivElement;

  const yearInput = el.querySelector(
    `.${style.yearInput} input`,
  ) as HTMLInputElement;

  yearInput.addEventListener(
    "input",
    () => {
      date.setFullYear(parseInt(yearInput.value));
      dateDropdown.update();
      monthDropdown.update();
    },
    { signal: props.signal },
  );

  const handlePresetClick = (index: number) => {
    const preset = Presets()[index]!;
    date = new Date(Date.now() + preset.value * 1000);
    dateDropdown.update();
    monthDropdown.update();
    minsDropdown.update();
    hoursDropdown.update();
    yearInput.value = date.getFullYear().toString();
  };

  el.addEventListener(
    "click",
    (event) => {
      const target = event.target as HTMLDivElement;
      const presetBtn = target.closest("[data-preset-index]") as HTMLDivElement;
      if (!presetBtn) return;
      const presetIndex = parseInt(presetBtn.dataset.presetIndex!);
      handlePresetClick(presetIndex);
    },
    { signal: props.signal },
  );

  return el;
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
  month: number,
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

const OffsetContent = (props: { signal: AbortSignal }) => {
  const listEl = (<div class={style.timezoneList}></div>) as HTMLDivElement;
  let selected = myTimezone;

  const el = (
    <div>
      <Input class={style.searchInput} placeholder="Search" />
      {listEl}
    </div>
  ) as HTMLDivElement;

  const searchInput = el.querySelector(
    `.${style.searchInput} input`,
  ) as HTMLInputElement;

  const renderList = () => {
    let tz = Timezones;

    if (searchInput.value.trim()) {
      tz = matchSorter(tz, searchInput.value);
    }

    listEl.replaceChildren(
      <>
        {tz.map((t) => (
          <Item.Base selected={selected === t}>
            <Item.Label>{t}</Item.Label>
          </Item.Base>
        ))}
      </>,
    );
  };
  searchInput.addEventListener(
    "input",
    debounce(() => renderList(), 300),
    {
      signal: props.signal,
    },
  );

  renderList();

  el.addEventListener(
    "click",
    (event) => {
      const target = event.target as HTMLDivElement;
    },
    { signal: props.signal },
  );

  return el;
};

import { t } from "@lingui/core/macro";

import { SettingsBlock } from "../../../components/SettingsBlock";
import { Dropdown } from "../../../components/ui/createDropdown";
import { closestFromEvent } from "../../../utils/dom";
import { getLocalItem, setLocalItem } from "../../../utils/localStorage";
import { CategoryThemes, ThemeCategories } from "../../../utils/theme";
import { type SettingsContext } from "./Settings";

import style from "./interfaceSettingsPage.module.css";

const getStrings = () => ({
  timeFormat: t`Time Format`,
  twelveHour: t`12-Hour`,
  twentyFourHour: t`24-Hour`,
  customizeColors: t`Customize Colors`,
});

const TimeFormat = () => [
  { title: getStrings().twelveHour, id: "12" },
  { title: getStrings().twentyFourHour, id: "24" },
];

const categoryRank = (category: string) => {
  const index = ThemeCategories.indexOf(
    category as (typeof ThemeCategories)[number],
  );
  return index === -1 ? ThemeCategories.length : index;
};

const sortedThemes = CategoryThemes.toSorted(
  (a, b) => categoryRank(a.category) - categoryRank(b.category),
);

const interfaceSettingsPage = (context: SettingsContext) => {
  const ac = new AbortController();
  const { signal } = ac;

  let el = (
    <div class={style.page}>
      <TimeFormatBlock signal={signal} />
      <ColorSettings signal={signal} />
    </div>
  ) as HTMLDivElement;
  context.content.replaceChildren(el);

  const destroy = () => {
    ac.abort();
    context.content.replaceChildren();
  };
  return { destroy };
};

const TimeFormatBlock = (props: { signal: AbortSignal }) => {
  const strings = getStrings();
  const dropdown = Dropdown.create({
    signal: props.signal,
    onChange(id) {
      setLocalItem("timeFormat", parseInt(id) as 12 | 24);
    },
    initialSelectedId() {
      return getLocalItem("timeFormat")?.toString()!;
    },
    items() {
      return TimeFormat().map((f) => (
        <Dropdown.Item id={f.id}>
          <Dropdown.Label>{f.title}</Dropdown.Label>
        </Dropdown.Item>
      ));
    },
  });

  return (
    <SettingsBlock.Root>
      <SettingsBlock.Icon name="schedule" />
      <SettingsBlock.Details title={strings.timeFormat} />
      {dropdown.el}
    </SettingsBlock.Root>
  );
};
const ColorSettings = (props: { signal: AbortSignal }) => {
  const strings = getStrings();

  let expanded = false;

  const el = (<div></div>) as HTMLDivElement;

  const rerender = () => {
    el.replaceChildren(
      <SettingsBlock.Group>
        <SettingsBlock.Root
          data-type="root"
          expandable
          data-expanded={expanded}
        >
          <SettingsBlock.Icon name="palette" />
          <SettingsBlock.Details
            title={strings.customizeColors}
            description={t`Edit theme colors & import/export.`}
          />
        </SettingsBlock.Root>

        {expanded &&
          sortedThemes.map((ct, i) => {
            return (
              <>
                {(i === 0 || ct.category !== sortedThemes[i - 1]?.category) && (
                  <SettingsBlock.Root class={style.colorCategory}>
                    <SettingsBlock.Details title={ct.category} />
                  </SettingsBlock.Root>
                )}
                <SettingsBlock.Root>
                  <SettingsBlock.Details title={dashesToTitleCase(ct.name)} />
                </SettingsBlock.Root>
              </>
            );
          })}
      </SettingsBlock.Group>,
    );
  };
  rerender();

  const toggleExpanded = () => {
    expanded = !expanded;
    rerender();
  };
  el.addEventListener(
    "click",
    (e) => {
      if (closestFromEvent(e, `[data-type="root"]`)) {
        return toggleExpanded();
      }
    },
    { signal: props.signal },
  );

  return el;
};

export function dashesToTitleCase(input: string): string {
  return input
    .replace(/-/g, " ")
    .replace(/(^|\s)\S/g, (match) => match.toUpperCase());
}

export { getStrings, interfaceSettingsPage as create };

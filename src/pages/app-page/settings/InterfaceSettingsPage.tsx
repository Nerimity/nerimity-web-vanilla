import { t } from "@lingui/core/macro";

import { SettingsBlock } from "../../../components/SettingsBlock";
import { Dropdown } from "../../../components/ui/createDropdown";
import { getLocalItem, setLocalItem } from "../../../utils/localStorage";
import { type SettingsContext } from "./Settings";

import style from "./privacySettingsPage.module.css";

const getStrings = () => ({
  timeFormat: t`Time Format`,
  twelveHour: t`12-Hour`,
  twentyFourHour: t`24-Hour`,
});

const TimeFormat = () => [
  { title: getStrings().twelveHour, id: "12" },
  { title: getStrings().twentyFourHour, id: "24" },
];

const privacySettingsPage = (context: SettingsContext) => {
  const ac = new AbortController();
  const { signal } = ac;

  let el = (
    <div class={style.page}>
      <TimeFormatBlock signal={signal} />
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

export { getStrings, privacySettingsPage as create };

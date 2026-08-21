import { t } from "@lingui/core/macro";

import { Input } from "../../../components/input";
import { SettingsBlock } from "../../../components/SettingsBlock";
import { h } from "../../../h";
import type { SettingsContext } from "./Settings";

const getStrings = () => ({
  email: t`Email`,
  username: t`Username`,
});

const accountSettingsPage = (context: SettingsContext) => {
  const strings = getStrings();
  const el = (
    <div>
      <SettingsBlock.Root>
        <SettingsBlock.Icon name="email" />
        <SettingsBlock.Details title={strings.email} />
        <Input />
      </SettingsBlock.Root>
      <SettingsBlock.Root>
        <SettingsBlock.Icon name="face" />
        <SettingsBlock.Details title={strings.username} />
        <Input />
      </SettingsBlock.Root>
    </div>
  ) as HTMLDivElement;

  context.content.replaceChildren(el);

  const destroy = () => {
    el.remove();
  };

  return { destroy };
};

export { getStrings, accountSettingsPage as create };

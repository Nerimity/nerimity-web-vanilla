import { t } from "@lingui/core/macro";

import { MiniProfile } from "../../../components/miniProfile";
import { createSettingsActions } from "../../../components/settings-actions/SettingsActions";
import { SettingsBlock } from "../../../components/SettingsBlock";
import { accountStore } from "../../../store/accountStore";
import { createUpdatedHandler } from "../../../utils/createUpdatedHandler";
import { type SettingsContext } from "./Settings";

import style from "./profileSettingsPage.module.css";

const getStrings = () => ({
  clanTag: t`Clan Tag`,
  gradientColour1: t`Gradient Colour 1`,
  gradientColour2: t`Gradient Colour 2`,
  primaryColor: t`Primary Color`,
  usernameFont: t`Username Font`,
  bio: t`Bio`,
});

const profileSettingsPage = (context: SettingsContext) => {
  const ac = new AbortController();
  const { signal } = ac;
  const strings = getStrings();

  const initialValues = () => {
    return {};
  };

  const actions = createSettingsActions({ signal });

  const updateHandler = createUpdatedHandler(initialValues, signal);

  let el = (
    <div class={style.page}>
      <div class={style.container}>
        <div class={style.options}>
          {/* Bio */}
          <SettingsBlock.Root clickable>
            <SettingsBlock.Icon name="info" />
            <SettingsBlock.Details title={strings.bio} />
          </SettingsBlock.Root>
          {/* Clan Tag */}
          <SettingsBlock.Root>
            <SettingsBlock.Icon name="sell" />
            <SettingsBlock.Details title={strings.clanTag} />
          </SettingsBlock.Root>
          {/* Username Font */}
          <SettingsBlock.Root>
            <SettingsBlock.Icon name="font_download" />
            <SettingsBlock.Details title={strings.usernameFont} />
          </SettingsBlock.Root>
          <SettingsBlock.Group>
            {/* Primary Color */}
            <SettingsBlock.Root>
              <SettingsBlock.Icon name="palette" />
              <SettingsBlock.Details title={strings.primaryColor} />
            </SettingsBlock.Root>
            {/* Gradient 1 */}
            <SettingsBlock.Root>
              <SettingsBlock.Icon name="palette" />
              <SettingsBlock.Details title={strings.gradientColour1} />
            </SettingsBlock.Root>
            {/* Gradient 2 */}
            <SettingsBlock.Root>
              <SettingsBlock.Icon name="palette" />
              <SettingsBlock.Details title={strings.gradientColour2} />
            </SettingsBlock.Root>
          </SettingsBlock.Group>
        </div>

        <MiniProfile
          class={style.miniProfile}
          abort={ac}
          userId={accountStore.currentUser?.id!}
          animationMode="focus"
        />
      </div>

      {actions.el}
    </div>
  ) as HTMLDivElement;

  actions.handleUndoClick(updateHandler.undo);

  // el.addEventListener(
  //   "click",
  //   (event) => {
  //     const target = event.target as HTMLDivElement;
  //     const button = target.closest("[data-action]") as HTMLDivElement;
  //   },
  //   { signal },
  // );

  context.content.replaceChildren(el);

  const destroy = () => {
    ac.abort();
    el.remove();
    (el as any) = null;
  };

  return { destroy };
};

export { getStrings, profileSettingsPage as create };

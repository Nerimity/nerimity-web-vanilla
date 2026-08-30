import { t } from "@lingui/core/macro";

import { Button } from "../../../components/button";
import { Input } from "../../../components/input";
import {
  createMiniProfileModal,
  MiniProfile,
  type MiniProfileOverrides,
} from "../../../components/miniProfile";
import { createModal, Modal } from "../../../components/modal";
import { createSettingsActions } from "../../../components/settings-actions/SettingsActions";
import { SettingsBlock } from "../../../components/SettingsBlock";
import {
  getUserDetails,
  type UserDetails,
} from "../../../services/userService";
import { accountStore } from "../../../store/accountStore";
import { createUpdatedHandler } from "../../../utils/createUpdatedHandler";
import { createResizeObserver } from "../../../utils/observer";
import { type SettingsContext } from "./Settings";

import style from "./profileSettingsPage.module.css";

const getStrings = () => ({
  clanTag: t`Clan Tag`,
  gradientColor1: t`Gradient Color 1`,
  gradientColor2: t`Gradient Color 2`,
  primaryColor: t`Primary Color`,
  usernameFont: t`Username Font`,
  bio: t`Bio`,
});

const profileSettingsPage = (context: SettingsContext) => {
  const ac = new AbortController();
  const { signal } = ac;
  const strings = getStrings();

  const miniProfileContainer = (
    <div class={style.miniProfileContainer}></div>
  ) as HTMLDivElement;
  let miniProfileAc = new AbortController();

  let userDetails: UserDetails | null = null;

  const initialValues = () => {
    if (!userDetails) return {};
    return {
      bio: userDetails.profile?.bio,
    };
  };

  const actions = createSettingsActions({ signal });
  const updateHandler = createUpdatedHandler(initialValues, signal);

  let isMobileWidth: boolean | null = null;

  const overrides: () => MiniProfileOverrides = () => ({
    bio: updateHandler.changedValues.bio,
  });

  const renderMiniProfile = () => {
    miniProfileAc.abort();
    const button = page?.querySelector(
      `.${style.previewButton}`,
    ) as HTMLDivElement;
    if (button) {
      button.style.display = isMobileWidth ? "flex" : "none";
    }

    miniProfileContainer.style.display = isMobileWidth ? "none" : "block";

    if (isMobileWidth) {
      miniProfileContainer.replaceChildren();
      return;
    }
    miniProfileAc = new AbortController();
    miniProfileContainer.replaceChildren(
      <MiniProfile
        abort={miniProfileAc}
        class={style.miniProfile}
        userId={accountStore.currentUser?.id!}
        overrides={overrides()}
        animationMode="focus"
      />,
    );
  };

  updateHandler.onUpdate((_, hasChanges) => {
    renderMiniProfile();
    actions.setVisibility(hasChanges);
  });

  let page: HTMLDivElement | null = null;

  const MOBILE_WIDTH = 628;
  createResizeObserver(
    context.content,
    (event) => {
      const isMobile = event.width <= MOBILE_WIDTH;
      if (isMobileWidth === isMobile) return;
      isMobileWidth = isMobile;
      renderMiniProfile();
    },
    { signal },
  );

  getUserDetails({ userId: accountStore.currentUser?.id! }).then(([res]) => {
    if (ac.signal.aborted) return;
    if (!res) return;
    userDetails = res;
    updateHandler.undo();
    page = createPage();
    context.content.replaceChildren(page);

    page.addEventListener(
      "click",
      (event) => {
        const target = event.target as HTMLDivElement;
        const button = target.closest("[data-action]") as HTMLDivElement;
        if (!button) return;
        if (button.dataset.action === "updateBio") {
          createUpdateBioModal({
            value: updateHandler.changedValues.bio || initialValues().bio || "",
            done(value) {
              updateHandler.changeValue("bio", value);
            },
          });
        }
        if (button.dataset.action === "preview") {
          createMiniProfileModal({
            overrides: overrides(),
            userId: accountStore.currentUser?.id!,
            triggerEl: button,
          });
        }
      },
      { signal },
    );
  });

  let createPage = () =>
    (
      <div class={style.page}>
        <div class={style.container}>
          <div class={style.options}>
            {/* Bio */}
            <SettingsBlock.Root clickable data-action="updateBio">
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
                <SettingsBlock.Details title={strings.gradientColor1} />
              </SettingsBlock.Root>
              {/* Gradient 2 */}
              <SettingsBlock.Root>
                <SettingsBlock.Icon name="palette" />
                <SettingsBlock.Details title={strings.gradientColor2} />
              </SettingsBlock.Root>
            </SettingsBlock.Group>
            <Button
              label={t`Preview`}
              data-action="preview"
              icon="visibility"
              class={style.previewButton}
              style={{ display: isMobileWidth ? "flex" : "none" }}
            />
            {actions.el}
          </div>

          {miniProfileContainer}
        </div>
      </div>
    ) as HTMLDivElement;

  actions.handleUndoClick(updateHandler.undo);

  const destroy = () => {
    miniProfileAc.abort();
    ac.abort();
    page?.remove();
    (page as any) = null;
  };

  return { destroy };
};

export const createUpdateBioModal = (props: {
  done: (value: string) => void;
  value: string;
}) => {
  const abortController = new AbortController();
  const { signal } = abortController;

  const modal = (
    <Modal.Root ignoreBgClick>
      <Modal.Header label={t`Bio`} icon="info" />
      <Modal.Body width="500px">
        <div class={style.updateBioBody}>
          <Input
            id="bioInput"
            type="textarea"
            placeholder="I like cats."
            value={props.value}
          />
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button
          data-action="close"
          label={t`Don't Update`}
          icon="close"
          hoverBorder
        />
        <Button data-action="update" label={t`Done`} icon="check" primary />
      </Modal.Footer>
    </Modal.Root>
  ) as HTMLDivElement;

  const inputEl = () => modal.querySelector("#bioInput") as HTMLInputElement;

  modal.addEventListener(
    "click",
    async (event) => {
      const target = event.target as HTMLElement;
      const button = target.closest(`[data-action]`) as HTMLElement;
      if (!button) return;

      if (button.dataset.action === "update") {
        const content = inputEl().value.trim();
        props.done(content);

        abortController.abort();
      }
      if (button.dataset.action === "close") {
        abortController.abort();
      }
    },
    { signal },
  );

  (async () => {
    inputEl().focus();
  })();

  createModal(() => {
    return modal;
  }, abortController);
};

export { getStrings, profileSettingsPage as create };

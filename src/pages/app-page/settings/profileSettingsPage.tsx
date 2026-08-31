import { t } from "@lingui/core/macro";

import { Avatar } from "../../../components/avatar";
import { Button } from "../../../components/button";
import { Dropdown } from "../../../components/createDropdown";
import { Input } from "../../../components/input";
import { formatMessage } from "../../../components/message-pane/utils";
import {
  createMiniProfileModal,
  MiniProfile,
  type MiniProfileOverrides,
} from "../../../components/miniProfile";
import { createModal, Modal } from "../../../components/modal";
import { ServerClanItem } from "../../../components/serverClanItem";
import { createSettingsActions } from "../../../components/settings-actions/SettingsActions";
import { SettingsBlock } from "../../../components/SettingsBlock";
import {
  getUserDetails,
  updateUser,
  type UserDetails,
} from "../../../services/userService";
import { accountStore } from "../../../store/accountStore";
import { Server, serverStore } from "../../../store/serverStore";
import { userStore } from "../../../store/userStore";
import { createUpdatedHandler } from "../../../utils/createUpdatedHandler";
import { FocusAnimator } from "../../../utils/FocusAnimator";
import { Fonts } from "../../../utils/font";
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
      clanServerId: userDetails.profile?.clan?.serverId,
      font: userDetails.profile?.font || 0,
    };
  };

  const actions = createSettingsActions({ signal });
  const updateHandler = createUpdatedHandler(initialValues, signal);

  let isMobileWidth: boolean | null = null;

  const overrides = () =>
    ({
      bio: updateHandler.changedValues.bio,
      clanServerId: updateHandler.changedValues.clanServerId,
      font: updateHandler.changedValues.font,
    }) satisfies MiniProfileOverrides;

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
    clanDropdown.update();
    fontDropdown.update();
    context.content.replaceChildren(page);
  });
  context.content.addEventListener(
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

  const clanDropdown = Dropdown.create({
    signal,
    onChange(id) {
      updateHandler.changeValue("clanServerId", id);
    },
    initialSelectedId: () =>
      updateHandler.changedValues.clanServerId ||
      initialValues().clanServerId ||
      "none",
    items: () => {
      const clanServers = serverStore
        .orderedServers()
        .servers.filter((s) => s.type === "s" && s.server.clan);

      return [
        <Dropdown.Item id="none">
          <Dropdown.Label>{t`None`}</Dropdown.Label>
        </Dropdown.Item>,
        ...clanServers.map((s) => {
          const server = (s as any).server as Server;
          return (
            <Dropdown.Item id={server.id}>
              <Avatar server={server} size={16} />
              <Dropdown.Label>{server.name}</Dropdown.Label>
              <div class={style.dropdownClanContainer}>
                <ServerClanItem initialAnimate clan={server.clan!} />
              </div>
            </Dropdown.Item>
          );
        }),
      ];
    },
  });
  const fontDropdown = Dropdown.create({
    signal,
    onChange(id) {
      updateHandler.changeValue("font", parseInt(id));
    },
    initialSelectedId: () =>
      (
        updateHandler.changedValues.font ??
        initialValues().font ??
        "0"
      ).toString(),
    items: () => {
      return Fonts.map((f, i) => {
        return (
          <Dropdown.Item id={i.toString()}>
            <Dropdown.Label>
              <span class={[f.class, "font"]}>{f.name}</span>
            </Dropdown.Label>
          </Dropdown.Item>
        );
      });
    },
  });

  const focusAnimator = new FocusAnimator(
    document.body,
    `.${style.dropdownClanContainer} img, .${style.options} img`,
  );

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
              {clanDropdown.el}
            </SettingsBlock.Root>
            {/* Username Font */}
            <SettingsBlock.Root>
              <SettingsBlock.Icon name="font_download" />
              <SettingsBlock.Details title={strings.usernameFont} />
              {fontDropdown.el}
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

  actions.handleSaveClick(async (done) => {
    const userId = accountStore.currentUser?.id!;

    const values = updateHandler.changedValues;

    const formattedBio =
      values.bio !== undefined
        ? formatMessage({ content: values.bio?.trim() || "" })
        : undefined;

    const [res, error] = await updateUser({
      ...(values.clanServerId !== undefined && values.clanServerId === "none"
        ? { clanServerId: null }
        : { clanServerId: values.clanServerId }),
      ...(values.bio !== undefined && values.bio.trim() === ""
        ? { bio: null }
        : { bio: formattedBio }),
      // ...(values.bgColorOne !== undefined && values.bgColorOne === ""
      //   ? { bgColorOne: null }
      //   : { bgColorOne: values.bgColorOne }),
      // ...(values.bgColorTwo !== undefined && values.bgColorTwo === ""
      //   ? { bgColorTwo: null }
      //   : { bgColorTwo: values.bgColorTwo }),
      // ...(values.primaryColor !== undefined && values.primaryColor === ""
      //   ? { primaryColor: null }
      //   : { primaryColor: values.primaryColor }),
      ...(values.font !== undefined && values.font === null
        ? { font: null }
        : { font: values.font }),
    });
    if (error) {
      return done(error.message);
    }

    userStore.users.get(userId)?.update(res.user);
    userDetails = { ...userDetails!, profile: res.user.profile };
    done();
    updateHandler.undo();
  });

  actions.handleUndoClick(() => {
    updateHandler.undo();
    clanDropdown.update();
    fontDropdown.update();
  });

  const destroy = () => {
    focusAnimator.destroy();
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

import { t } from "@lingui/core/macro";

import { Checkbox } from "../../../components/checkbox";
import { Dropdown } from "../../../components/createDropdown";
import { createEmojiSelector } from "../../../components/createEmojiSelector";
import { createGenericDeleteModal } from "../../../components/GenericDeleteModal";
import { Input } from "../../../components/input";
import { Item } from "../../../components/item";
import { createSettingsActions } from "../../../components/settings-actions/SettingsActions";
import { SettingsBlock } from "../../../components/SettingsBlock";
import {
  deleteServerChannel,
  updateServerChannel,
  updateServerChannelPermissions,
} from "../../../services/serverService";
import { channelStore } from "../../../store/channelStore";
import { serverStore } from "../../../store/serverStore";
import { ChannelType } from "../../../Types";
import { addBit, hasBit, removeBit } from "../../../utils/bitwise";
import { ChannelPermissionFlag } from "../../../utils/channelPermissionFlag";
import { createUpdatedHandler } from "../../../utils/createUpdatedHandler";
import { router } from "../../../utils/router";
import type { ServerSettingsContext } from "./ServerSettings";

import style from "./channelServerSettingsPage.module.css";

const getStrings = () => ({
  general: t`General`,
  webhooks: t`Webhooks`,
  name: t`Name`,
  channelIcon: t`Channel Icon`,
  deleteChannel: t`Delete Channel`,
  slowMode: t`Slow Mode`,
  permissions: t`Permissions`,
  ...Object.fromEntries(
    Object.entries(ChannelPermissionFlag).map(([k, v]) => [k, v.name()]),
  ),
});

const channelServerSettingsPage = (context: ServerSettingsContext) => {
  const ac = new AbortController();
  const { signal } = ac;
  const strings = getStrings();
  const Tabs = {
    general: GeneralPage,
    permissions: PermissionsPage,
  };

  const getChannelId = () => {
    return router.match<{ channelId: string }>(
      "/app/servers/:serverId/settings/channels/:channelId",
    )?.params.channelId;
  };

  const getChannel = () => channelStore.channels.get(getChannelId()!);

  const isCategory = getChannel()?.type === ChannelType.CATEGORY;

  let currentTab = "general";

  let tabs = (
    <div class={style.tabs}>
      <Item.Base selected handlePosition="bottom" data-tab="general">
        <Item.Icon name="settings" />
        <Item.Label>{strings.general}</Item.Label>
      </Item.Base>
      <Item.Base handlePosition="bottom" data-tab="permissions">
        <Item.Icon name="security" />
        <Item.Label>{strings.permissions}</Item.Label>
      </Item.Base>
      <Item.Base handlePosition="bottom" data-tab="webhooks">
        <Item.Icon name="webhook" />
        <Item.Label>{strings.webhooks}</Item.Label>
      </Item.Base>
    </div>
  ) as HTMLDivElement;

  let currentTabEl = (<div></div>) as HTMLDivElement;
  let currentTabAc = new AbortController();
  const renderCurrentTab = () => {
    const tabEls = [...tabs.children] as HTMLDivElement[];
    tabEls.forEach((el) => {
      el.dataset.selected = currentTab === el.dataset.tab ? "true" : "false";
    });

    currentTabAc.abort();
    currentTabAc = new AbortController();
    const Tab = Tabs[currentTab as keyof typeof Tabs];

    currentTabEl.replaceChildren(
      Tab ? <Tab signal={currentTabAc.signal} /> : <></>,
    );
  };

  renderCurrentTab();

  tabs.addEventListener(
    "click",
    (e) => {
      const target = e.target as HTMLDivElement;
      const tabEl = target.closest("[data-tab]") as HTMLDivElement;
      if (!tabEl) return;
      currentTab = tabEl.dataset.tab!;
      renderCurrentTab();
    },
    { signal },
  );

  let el = (
    <div class={style.page}>
      {!isCategory && tabs}
      {currentTabEl}
    </div>
  ) as HTMLDivElement;

  context.content.replaceChildren(el);

  const destroy = () => {
    currentTabAc.abort();
    ac.abort();
    el.remove();
    currentTabEl.remove();
    tabs.remove();
    (tabs as any) = null;
    (el as any) = null;
    (currentTabEl as any) = null;
  };

  return { destroy };
};

const GeneralPage = (props: { signal: AbortSignal }) => {
  const strings = getStrings();

  const getServerId = () => serverStore.currentServerId;

  const getChannelId = () => {
    return router.match<{ channelId: string }>(
      "/app/servers/:serverId/settings/channels/:channelId",
    )?.params.channelId;
  };

  const getChannel = () => channelStore.channels.get(getChannelId()!);

  const isCategory = getChannel()?.type === ChannelType.CATEGORY;

  const initialValues = () => {
    const channel = getChannel();

    return {
      name: channel?.name || "",
      icon: channel?.icon,
      slowModeSeconds: (channel?.slowModeSeconds || 0).toString(),
    };
  };
  const actions = createSettingsActions({ signal: props.signal });
  const updateHandler = createUpdatedHandler(initialValues, props.signal);

  const channelIconPicker = createEmojiSelector({
    signal: props.signal,
    initialEmoji() {
      return updateHandler.values.icon;
    },
    onChange(icon) {
      updateHandler.changeValue("icon", icon);
    },
  });

  let el = (
    <div>
      <SettingsBlock.Group>
        {/* name */}
        <SettingsBlock.Root>
          <SettingsBlock.Icon name="edit" />
          <SettingsBlock.Details title={strings.name} />
          <Input
            id="nameInput"
            class="nameInput"
            value={initialValues().name}
          />
        </SettingsBlock.Root>

        {/* channel icon */}
        <SettingsBlock.Root>
          <SettingsBlock.Icon name="face" />
          <SettingsBlock.Details title={strings.channelIcon} />
          {channelIconPicker.el}
        </SettingsBlock.Root>

        {/* slow mode */}
        {!isCategory && (
          <SettingsBlock.Root>
            <SettingsBlock.Icon name="speed_2" />
            <SettingsBlock.Details
              title={strings.slowMode}
              description={t`Specify how long a user must wait before they can send a message.`}
            />
            <Input
              type="number"
              suffix={<span class={style.seconds}>s</span>}
              class={style.slowModeInput}
              value={initialValues().slowModeSeconds.toString()}
            />
          </SettingsBlock.Root>
        )}
      </SettingsBlock.Group>

      <div class={style.separator}></div>

      <SettingsBlock.Root data-action="delete-channel" clickable>
        <SettingsBlock.Icon name="delete" alert />
        <SettingsBlock.Details
          title={strings.deleteChannel}
          description={t`Permanently delete this channel and all associated data.`}
        />
      </SettingsBlock.Root>
      {actions.el}
    </div>
  ) as HTMLDivElement;

  if (!isCategory) {
    updateHandler.handleInput(
      el.querySelector(`.${style.slowModeInput}`)!,
      "slowModeSeconds",
    );
  }
  updateHandler.handleInput(el.querySelector(".nameInput")!, "name");

  updateHandler.onUpdate((_changes, hasChanges) => {
    actions.setVisibility(hasChanges);
  });

  const handleUndo = () => {
    updateHandler.undo();
    channelIconPicker.update();
  };

  actions.handleUndoClick(handleUndo);

  const handleSave = async (done: (msg?: string) => void) => {
    const { slowModeSeconds, ...updates } = updateHandler.changedValues;
    const serverId = getServerId()!;
    const channelId = getChannelId()!;

    const body = {
      ...updates,
      ...(slowModeSeconds !== undefined
        ? { slowModeSeconds: parseInt(slowModeSeconds) }
        : undefined),
    };

    const [res, error] = await updateServerChannel(serverId, channelId, body);
    if (error) {
      return done(error.message);
    }
    channelStore.channels.get(channelId)?.update(res);
    done();
    handleUndo();
  };

  actions.handleSaveClick(async (done) => {
    handleSave(done);
  });

  el.addEventListener(
    "click",
    (event) => {
      const target = event.target as HTMLDivElement;
      const button = target.closest("[data-action]") as HTMLDivElement;
      if (!button) return;
      const action = button.dataset.action;

      if (action === "delete-channel") {
        createGenericDeleteModal({
          confirmLabel: getChannel()?.name!,
          title: t`Delete Channel`,
          async onDelete(done) {
            const [, error] = await deleteServerChannel(
              getServerId()!,
              getChannelId()!,
            );
            done(error?.message);
            if (!error) {
              router.navigate("../channels");
            }
          },
        });
      }
    },
    { signal: props.signal },
  );

  props.signal.addEventListener(
    "abort",
    () => {
      el.remove();
      (el as any) = null;
    },
    { once: true },
  );

  return el;
};
const PermissionsPage = (props: { signal: AbortSignal }) => {
  const strings = getStrings();

  const getServerId = () => serverStore.currentServerId;
  const getServer = () => serverStore.servers.get(getServerId()!);

  const getChannelId = () => {
    return router.match<{ channelId: string }>(
      "/app/servers/:serverId/settings/channels/:channelId",
    )?.params.channelId;
  };

  const getChannel = () => channelStore.channels.get(getChannelId()!);
  const roles = serverStore.serverSortedRoles(getServerId()!);
  let selectedRoleId = getServer()?.defaultRoleId!;

  const initialValues = () => {
    const channel = getChannel();

    return {
      permissions:
        channel?.permissions?.find((p) => p.roleId === selectedRoleId)
          ?.permissions || 0,
    };
  };
  const actions = createSettingsActions({ signal: props.signal });
  const updateHandler = createUpdatedHandler(initialValues, props.signal);

  const rolesDropdown = Dropdown.create({
    signal: props.signal,
    initialSelectedId() {
      return selectedRoleId;
    },
    onChange(id) {
      selectedRoleId = id;
      handleUndo();
    },
    items() {
      return roles.map((r) => {
        return (
          <Dropdown.Item id={r.id}>
            <Dropdown.Label>{r.name}</Dropdown.Label>
          </Dropdown.Item>
        );
      });
    },
  });

  let el = (
    <div>
      <SettingsBlock.Group>
        <SettingsBlock.Root>
          <SettingsBlock.Icon name="security" />
          <SettingsBlock.Details title={strings.permissions} />
          {rolesDropdown.el}
        </SettingsBlock.Root>

        {Object.values(ChannelPermissionFlag).map((p) => (
          <SettingsBlock.Root data-perm={p.bit} clickable hideArrow>
            <SettingsBlock.Icon name={p.icon} />
            <SettingsBlock.Details
              title={p.name()}
              description={p.description()}
            />
            <Checkbox.Root>
              <Checkbox.Box />
            </Checkbox.Root>
          </SettingsBlock.Root>
        ))}
      </SettingsBlock.Group>

      {actions.el}
    </div>
  ) as HTMLDivElement;

  const permissionCheckboxHandlers = Object.values(ChannelPermissionFlag).map(
    (p) => {
      const triggerEl = el.querySelector(
        `[data-perm="${p.bit}"]`,
      ) as HTMLDivElement;

      return Checkbox.createHandler({
        el: triggerEl,
        triggerEl,
        signal: props.signal,
        onChange(checked) {
          const perms = updateHandler.values.permissions;
          updateHandler.changeValue(
            "permissions",
            (checked ? addBit : removeBit)(perms, p.bit),
          );
        },
        initialState() {
          return hasBit(updateHandler.values.permissions, p.bit);
        },
      });
    },
  );

  updateHandler.onUpdate((_changes, hasChanges) => {
    actions.setVisibility(hasChanges);
  });

  const handleUndo = () => {
    updateHandler.undo();
    permissionCheckboxHandlers.forEach((h) => h.update());
  };

  actions.handleUndoClick(handleUndo);

  const handleSave = async (done: (msg?: string) => void) => {
    const { permissions } = updateHandler.changedValues;
    const serverId = getServerId()!;
    const channelId = getChannelId()!;

    const [, error] = await updateServerChannelPermissions({
      serverId,
      channelId,
      roleId: selectedRoleId,
      permissions: permissions!,
    });
    if (error) {
      return done(error.message);
    }
    channelStore.updatePermissions({
      channelId,
      serverId,
      roleId: selectedRoleId,
      permissions: permissions!,
    });
    done();
    handleUndo();
  };

  actions.handleSaveClick(async (done) => {
    handleSave(done);
  });

  el.addEventListener(
    "click",
    (event) => {
      const target = event.target as HTMLDivElement;
      const button = target.closest("[data-action]") as HTMLDivElement;
      if (!button) return;
      const action = button.dataset.action;

      if (action === "delete-channel") {
        createGenericDeleteModal({
          confirmLabel: getChannel()?.name!,
          title: t`Delete Channel`,
          async onDelete(done) {
            const [, error] = await deleteServerChannel(
              getServerId()!,
              getChannelId()!,
            );
            done(error?.message);
            if (!error) {
              router.navigate("../channels");
            }
          },
        });
      }
    },
    { signal: props.signal },
  );

  props.signal.addEventListener(
    "abort",
    () => {
      el.remove();
      (el as any) = null;
    },
    { once: true },
  );

  return el;
};

export { getStrings, channelServerSettingsPage as create };

import { t } from "@lingui/core/macro";

import { Button } from "../../../components/button";
import { Checkbox } from "../../../components/checkbox";
import { Dropdown } from "../../../components/createDropdown";
import { createEmojiSelector } from "../../../components/createEmojiSelector";
import { createGenericDeleteModal } from "../../../components/GenericDeleteModal";
import { Input } from "../../../components/input";
import { Item } from "../../../components/item";
import { alert } from "../../../components/modal";
import { createSettingsActions } from "../../../components/settings-actions/SettingsActions";
import { SettingsBlock } from "../../../components/SettingsBlock";
import {
  createWebhook,
  deleteServerChannel,
  deleteWebhook,
  getWebhook,
  getWebhooks,
  getWebhookToken,
  updateServerChannel,
  updateServerChannelPermissions,
  updateWebhook,
} from "../../../services/serverService";
import { channelStore } from "../../../store/channelStore";
import { serverStore } from "../../../store/serverStore";
import { ChannelType, type RawWebhook } from "../../../Types";
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
  deleteWebhook: t`Delete Webhook`,
  slowMode: t`Slow Mode`,
  webhookUrl: "Webhook URL",
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
    webhooks: WebhooksPage,
  };

  const getChannelId = () => {
    return router.match<{ channelId: string }>(
      "/app/servers/:serverId/settings/channels/:channelId{/*}?",
    )?.params.channelId;
  };

  const getChannelSettingsPath = () =>
    `/app/servers/${serverStore.currentServerId}/settings/channels/${getChannelId()}`;

  const getChannel = () => channelStore.channels.get(getChannelId()!);

  const isCategory = getChannel()?.type === ChannelType.CATEGORY;

  let currentTab = "general";
  let currentWebhookId: string | undefined;

  let tabs = (
    <div class={style.tabs}>
      <Item.Base
        href={`${getChannelSettingsPath()}/general`}
        selected
        handlePosition="bottom"
        data-tab="general"
      >
        <Item.Icon name="settings" />
        <Item.Label>{strings.general}</Item.Label>
      </Item.Base>
      <Item.Base
        href={`${getChannelSettingsPath()}/permissions`}
        handlePosition="bottom"
        data-tab="permissions"
      >
        <Item.Icon name="security" />
        <Item.Label>{strings.permissions}</Item.Label>
      </Item.Base>
      <Item.Base
        href={`${getChannelSettingsPath()}/webhooks`}
        handlePosition="bottom"
        data-tab="webhooks"
      >
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
      currentTab === "webhooks" && currentWebhookId ? (
        <WebhookPage
          signal={currentTabAc.signal}
          webhookId={currentWebhookId}
        />
      ) : Tab ? (
        <Tab signal={currentTabAc.signal} />
      ) : (
        <></>
      ),
    );
  };

  router.createMatchListener<{ tab: string; webhookId?: string }>(
    [
      "/app/servers/:serverId/settings/channels/:channelId/:tab",
      "/app/servers/:serverId/settings/channels/:channelId/:tab/:webhookId",
    ],
    (res) => {
      const tab = res?.params.tab;
      const isValidTab = Object.keys(Tabs).includes(tab!);
      if (!tab || !isValidTab) {
        router.navigate(
          `/app/servers/${serverStore.currentServerId}/settings/channels/${getChannelId()}/general`,
          {
            replace: true,
          },
        );
        return;
      }
      currentTab = tab;
      currentWebhookId = tab === "webhooks" ? res.params.webhookId : undefined;
      renderCurrentTab();
    },
    { signal },
  );

  renderCurrentTab();
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
      "/app/servers/:serverId/settings/channels/:channelId{/*}?",
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
              if (props.signal.aborted) return;
              router.navigate("../../");
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
      "/app/servers/:serverId/settings/channels/:channelId{/*}?",
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
            <Dropdown.Label>
              {r.name}
              {getChannel()?.permissions?.find((c) => c.roleId === r.id)
                ?.permissions
                ? "*"
                : ""}
            </Dropdown.Label>
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
    rolesDropdown.update();
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
              if (props.signal.aborted) return;
              router.navigate("../");
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
const WebhooksPage = (props: { signal: AbortSignal }) => {
  const strings = getStrings();

  const getServerId = () => serverStore.currentServerId;

  const getChannelId = () => {
    return router.match<{ channelId: string }>(
      "/app/servers/:serverId/settings/channels/:channelId{/*}?",
    )?.params.channelId;
  };

  let webhooksEl = (<div></div>) as HTMLDivElement;

  let webhooks: RawWebhook[] = [];

  const rerender = () => {
    webhooksEl.replaceChildren(
      <SettingsBlock.Group>
        <SettingsBlock.Root>
          <SettingsBlock.Icon name="webhook" />
          <SettingsBlock.Details title={strings.webhooks} />
          <Button icon="add" data-action="create" label={t`Create`} />
        </SettingsBlock.Root>
        {webhooks.map((w) => (
          <SettingsBlock.Root href={`./${w.id}`}>
            <SettingsBlock.Icon name="robot" />
            <SettingsBlock.Details title={w.name} />
          </SettingsBlock.Root>
        ))}
      </SettingsBlock.Group>,
    );
  };
  rerender();
  let el = (<div>{webhooksEl}</div>) as HTMLDivElement;

  (async () => {
    const [newWebhooks] = await getWebhooks({
      serverId: getServerId()!,
      channelId: getChannelId()!,
    });
    if (!newWebhooks) return;
    if (props.signal.aborted) return;
    webhooks = newWebhooks;
    rerender();
  })();

  el.addEventListener("click", async (e) => {
    const target = e.target as HTMLDivElement;
    const actionEl = target.closest("[data-action]") as HTMLDivElement;
    if (!actionEl) return;
    const action = actionEl.dataset.action!;
    if (action === "create") {
      const [webhook, error] = await createWebhook({
        serverId: getServerId()!,
        channelId: getChannelId()!,
      });
      if (error) {
        alert({ message: error.message });
        return;
      }
      if (!webhook) return;
      if (props.signal.aborted) return;

      router.navigate(`./${webhook.id}`);
    }
  });

  props.signal.addEventListener(
    "abort",
    () => {
      webhooksEl.remove();
      (webhooksEl as any) = null;
      el.remove();
      (el as any) = null;
    },
    { once: true },
  );

  return el;
};
const WebhookPage = (props: { signal: AbortSignal; webhookId: string }) => {
  const strings = getStrings();

  const getServerId = () => serverStore.currentServerId;

  const getIds = () => {
    return router.match<{ channelId: string; webhookId: string }>(
      "/app/servers/:serverId/settings/channels/:channelId/webhooks/:webhookId",
    )?.params;
  };

  let webhook: RawWebhook | null = null;

  const initialValues = () => {
    return {
      name: webhook?.name || "",
    };
  };

  let el = (<div class={style.page}></div>) as HTMLDivElement;

  const render = () => {
    const actions = createSettingsActions({ signal: props.signal });
    el.replaceChildren(
      <>
        <SettingsBlock.Root>
          <SettingsBlock.Icon name="edit" />
          <SettingsBlock.Details title={strings.name} />
          <Input class="nameInput" value={initialValues().name} />
        </SettingsBlock.Root>
        <SettingsBlock.Root>
          <SettingsBlock.Icon name="link" />
          <SettingsBlock.Details
            title={strings.webhookUrl}
            description={t`Execute actions using this link`}
          />
          <Button
            data-action="copy-link"
            label="Copy Link"
            icon="content_copy"
          />
        </SettingsBlock.Root>

        <div class={style.separator}></div>

        <SettingsBlock.Root data-action="delete-webhook" clickable>
          <SettingsBlock.Icon name="delete" alert />
          <SettingsBlock.Details
            title={strings.deleteWebhook}
            description={t`Permanently delete this webhook and all associated data.`}
          />
        </SettingsBlock.Root>

        {actions.el}
      </>,
    );
    const updateHandler = createUpdatedHandler(initialValues, props.signal);
    updateHandler.handleInput(el.querySelector(".nameInput")!, "name");

    updateHandler.onUpdate((_changes, hasChanges) => {
      actions.setVisibility(hasChanges);
    });

    const handleUndo = () => {
      updateHandler.undo();
    };
    actions.handleUndoClick(handleUndo);

    const handleSave = async (done: (msg?: string) => void) => {
      const { name } = updateHandler.changedValues;

      const [newWebhook, error] = await updateWebhook({
        serverId: getServerId()!,
        channelId: getIds()?.channelId!,
        webhookId: getIds()?.webhookId!,
        update: {
          name,
        },
      });
      if (error) {
        return done(error.message);
      }

      webhook = newWebhook;

      done();
      handleUndo();
    };

    actions.handleSaveClick(async (done) => {
      handleSave(done);
    });
  };
  let url = "";

  const copyUrl = () => {
    navigator.clipboard.writeText(url);
    alert({
      icon: "content_copy",
      title: t`Copied Webhook URL`,
      alert: false,
      message: t`Webhook URL copied To clipboard.`,
    });
  };

  el.addEventListener(
    "click",
    async (event) => {
      const target = event.target as HTMLDivElement;
      const button = target.closest("[data-action]") as HTMLDivElement;
      if (!button) return;
      const action = button.dataset.action;

      if (action === "copy-link") {
        if (url) {
          copyUrl();
          return;
        }
        const [res] = await getWebhookToken({
          serverId: getServerId()!,
          channelId: getIds()?.channelId!,
          webhookId: getIds()?.webhookId!,
        });
        if (res) {
          url = `https://nerimity.com/api/webhooks/${getIds()?.webhookId!}/${res.token}`;
          copyUrl();
        }
      }

      if (action === "delete-webhook") {
        createGenericDeleteModal({
          confirmLabel: webhook?.name!,
          title: t`Delete Webhook`,
          async onDelete(done) {
            const [, error] = await deleteWebhook({
              serverId: getServerId()!,
              channelId: getIds()?.channelId!,
              webhookId: getIds()?.webhookId!,
            });
            done(error?.message);
            if (!error) {
              if (props.signal.aborted) return;
              router.navigate("../");
            }
          },
        });
      }
    },
    { signal: props.signal },
  );

  (async () => {
    const [newWebhook] = await getWebhook({
      serverId: getServerId()!,
      channelId: getIds()?.channelId!,
      webhookId: getIds()?.webhookId!,
    });
    if (!newWebhook) return;
    if (props.signal.aborted) return;
    webhook = newWebhook;
    render();
  })();

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

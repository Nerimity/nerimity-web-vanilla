import { t } from "@lingui/core/macro";

import { Checkbox } from "../../../components/checkbox";
import { createEmojiSelector } from "../../../components/createEmojiSelector";
import { createGenericDeleteModal } from "../../../components/GenericDeleteModal";
import { Input } from "../../../components/input";
import { createSettingsActions } from "../../../components/settings-actions/SettingsActions";
import { SettingsBlock } from "../../../components/SettingsBlock";
import { channelStore } from "../../../store/channelStore";
import { ChannelPermissionFlag } from "../../../utils/channelPermissionFlag";
import { createUpdatedHandler } from "../../../utils/createUpdatedHandler";
import { RolePermissionFlag } from "../../../utils/RolePermissionFlag";
import { router } from "../../../utils/router";
import type { ServerSettingsContext } from "./ServerSettings";

import style from "./channelServerSettingsPage.module.css";

const getStrings = () => ({
  name: t`Name`,
  channelIcon: t`Channel Icon`,
  deleteChannel: t`Delete Channel`,
  permissions: t`Permissions`,
  ...Object.fromEntries(
    Object.entries(RolePermissionFlag).map(([k, v]) => [k, v.name()]),
  ),
});

const channelServerSettingsPage = (context: ServerSettingsContext) => {
  const ac = new AbortController();
  const { signal } = ac;
  const strings = getStrings();

  const getChannelId = () => {
    return router.match<{ channelId: string }>(
      "/app/servers/:serverId/settings/channels/:channelId",
    )?.params.channelId;
  };

  // const getServerId = () => serverStore.currentServerId;

  // const getServer = () => serverStore.servers.get(getServerId()!);

  const getChannel = () => channelStore.channels.get(getChannelId()!);

  const initialValues = () => {
    const channel = getChannel();

    return {
      name: channel?.name || "",
      icon: channel?.icon,
      permissions: channel?.permissions || [],
    };
  };
  const actions = createSettingsActions({ signal });
  const updateHandler = createUpdatedHandler(initialValues, signal);

  const channelIconPicker = createEmojiSelector({
    signal,
    initialEmoji() {
      return updateHandler.values.icon;
    },
    onChange(icon) {
      updateHandler.changeValue("icon", icon);
    },
  });

  let el = (
    <div class={style.page}>
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
      </SettingsBlock.Group>

      <div class={style.gap}></div>
      <SettingsBlock.Group>
        <SettingsBlock.Root>
          <SettingsBlock.Icon name="security" />
          <SettingsBlock.Details title={strings.permissions} />
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

  // const permissionCheckboxHandlers = Object.values(RolePermissionFlag).map(
  //   (p) => {
  //     const triggerEl = el.querySelector(
  //       `[data-perm="${p.bit}"]`,
  //     ) as HTMLDivElement;

  //     return Checkbox.createHandler({
  //       el: triggerEl,
  //       triggerEl,
  //       signal,
  //       onChange(checked) {
  //         const perms = updateHandler.values.permissions;
  //         updateHandler.changeValue(
  //           "permissions",
  //           (checked ? addBit : removeBit)(perms, p.bit),
  //         );
  //       },
  //       initialState() {
  //         return hasBit(updateHandler.values.permissions, p.bit);
  //       },
  //     });
  //   },
  // );

  updateHandler.handleInput(el.querySelector(".nameInput")!, "name");

  updateHandler.onUpdate((_changes, hasChanges) => {
    actions.setVisibility(hasChanges);
  });

  const handleUndo = () => {
    updateHandler.undo();
    channelIconPicker.update();
    // permissionCheckboxHandlers.forEach((h) => h.update());
  };

  actions.handleUndoClick(handleUndo);

  const handleSave = async (_done: (msg?: string) => void) => {
    // const { ...updates } = updateHandler.changedValues;
    // const serverId = getServerId()!;
    // const channelId =getChannelId()!;
    // const body = {
    //   ...updates,
    // };
    // const [res, error] = await updateServerRole(serverId, channelId, body);
    // if (error) {
    //   return done(error.message);
    // }
    // channelStore.channels.get(channelId)?.update(res);
    // done();
    // handleUndo();
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
          async onDelete(_done) {
            // const [, error] = await deleteServerRole(
            //   getServerId()!,
            //   getChannelId()!,
            // );
            // done(error?.message);
            // if (!error) {
            //   router.navigate("../channels");
            // }
          },
        });
      }
    },
    { signal },
  );

  context.content.replaceChildren(el);

  const destroy = () => {
    ac.abort();
    el.remove();
    (el as any) = null;
  };

  return { destroy };
};

export { getStrings, channelServerSettingsPage as create };

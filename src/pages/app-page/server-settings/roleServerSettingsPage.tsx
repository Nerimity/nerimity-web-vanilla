import { t } from "@lingui/core/macro";

import { Checkbox } from "../../../components/checkbox";
import { createColorPicker } from "../../../components/ColorPicker";
import { createGenericDeleteModal } from "../../../components/GenericDeleteModal";
import { Input } from "../../../components/input";
import { createSettingsActions } from "../../../components/settings-actions/SettingsActions";
import { SettingsBlock } from "../../../components/SettingsBlock";
import {
  deleteServer,
  updateServerRole,
} from "../../../services/serverService";
import { serverRoleStore } from "../../../store/serverRoleStore";
import { serverStore } from "../../../store/serverStore";
import { createUpdatedHandler } from "../../../utils/createUpdatedHandler";
import { router } from "../../../utils/router";
import { DefaultTheme } from "../../../utils/theme";
import type { ServerSettingsContext } from "./ServerSettings";

import style from "./roleServerSettingsPage.module.css";

const getStrings = () => ({
  name: t`Name`,
  roleColor: t`Role Color`,
  roleIcon: t`Role Icon`,
  hideRole: t`Hide Role`,
  applyOnJoin: t`Apply on Join`,
  deleteRole: t`Delete Role`,
});

const roleServerSettingsPage = (context: ServerSettingsContext) => {
  const ac = new AbortController();
  const { signal } = ac;
  const strings = getStrings();

  const getRoleId = () => {
    return router.match<{ roleId: string }>(
      "/app/servers/:serverId/settings/roles/:roleId",
    )?.params.roleId;
  };

  const getServerId = () => serverStore.currentServerId;

  // const getServer = () => serverStore.servers.get(getServerId()!);

  const getRole = () =>
    serverRoleStore.roles.get(getServerId()!)?.get(getRoleId()!);

  const initialValues = () => {
    const role = getRole();

    return {
      name: role?.name || "",
      hideRole: role?.hideRole || false,
      applyOnJoin: role?.applyOnJoin || false,
      hexColor: role?.gradient || role?.hexColor,
    };
  };
  const actions = createSettingsActions({ signal });
  const updateHandler = createUpdatedHandler(initialValues, signal);

  const roleColorPicker = createColorPicker({
    signal,
    gradientTab: true,
    initialColor() {
      return updateHandler.values.hexColor || DefaultTheme["text-color"];
    },
    onChange(color) {
      updateHandler.changeValue("hexColor", color);
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

        {/* role color */}
        <SettingsBlock.Root>
          <SettingsBlock.Icon name="palette" />
          <SettingsBlock.Details title={strings.roleColor} />
          {roleColorPicker.el}
        </SettingsBlock.Root>

        {/* role icon */}
        <SettingsBlock.Root>
          <SettingsBlock.Icon name="face" />
          <SettingsBlock.Details title={strings.roleIcon} />
        </SettingsBlock.Root>

        {/* hide role */}
        <SettingsBlock.Root clickable hideArrow data-checkbox="hideRole">
          <SettingsBlock.Icon name="visibility_off" />
          <SettingsBlock.Details
            title={strings.hideRole}
            description={t`Display members with this role along with all the default members`}
          />
          <Checkbox.Root>
            <Checkbox.Box></Checkbox.Box>
          </Checkbox.Root>
        </SettingsBlock.Root>

        {/* apply on join */}
        <SettingsBlock.Root clickable hideArrow data-checkbox="applyOnJoin">
          <SettingsBlock.Icon name="person_add" />
          <SettingsBlock.Details
            title={strings.applyOnJoin}
            description={t`Apply this role to members when they join the server.`}
          />
          <Checkbox.Root>
            <Checkbox.Box></Checkbox.Box>
          </Checkbox.Root>
        </SettingsBlock.Root>
      </SettingsBlock.Group>

      <div class={style.separator}></div>

      <SettingsBlock.Root data-action="delete-role" clickable>
        <SettingsBlock.Icon name="delete" alert />
        <SettingsBlock.Details
          title={strings.deleteRole}
          description={t`Permanently delete this role and all associated data.`}
        />
      </SettingsBlock.Root>
      {actions.el}
    </div>
  ) as HTMLDivElement;

  updateHandler.handleInput(el.querySelector(".nameInput")!, "name");

  updateHandler.onUpdate((_changes, hasChanges) => {
    actions.setVisibility(hasChanges);
  });

  const handleUndo = () => {
    updateHandler.undo();
    applyOnJoinCheckbox.update();
    hideRoleCheckbox.update();
    roleColorPicker.update();
  };

  const applyOnJoinCheckbox = Checkbox.createHandler({
    el: el.querySelector('[data-checkbox="applyOnJoin"]') as HTMLDivElement,
    triggerEl: el.querySelector(
      '[data-checkbox="applyOnJoin"]',
    ) as HTMLDivElement,
    initialState() {
      return initialValues().applyOnJoin;
    },
    onChange(checked) {
      updateHandler.changeValue("applyOnJoin", checked);
    },
    signal,
  });
  const hideRoleCheckbox = Checkbox.createHandler({
    el: el.querySelector('[data-checkbox="hideRole"]') as HTMLDivElement,
    triggerEl: el.querySelector('[data-checkbox="hideRole"]') as HTMLDivElement,
    initialState() {
      return initialValues().hideRole;
    },
    onChange(checked) {
      updateHandler.changeValue("hideRole", checked);
    },
    signal,
  });

  actions.handleUndoClick(handleUndo);

  const handleSave = async (done: (msg?: string) => void) => {
    const { ...updates } = updateHandler.changedValues;

    const serverId = getServerId()!;
    const roleId = getRoleId()!;

    const body = {
      ...updates,
    };

    const [res, error] = await updateServerRole(serverId, roleId, body);
    if (error) {
      return done(error.message);
    }

    serverRoleStore.roles.get(serverId)?.get(roleId)?.update(res);
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

      if (action === "delete-role") {
        createGenericDeleteModal({
          confirmLabel: getRole()?.name!,
          title: t`Delete Role`,
          async onDelete(done) {
            const [, error] = await deleteServer("");
            done(error?.message);
            if (!error) {
              router.navigate("/app");
            }
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

export { getStrings, roleServerSettingsPage as create };

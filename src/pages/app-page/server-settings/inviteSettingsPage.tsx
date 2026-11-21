import { t } from "@lingui/core/macro";

import { Notice } from "../../../components/Notice";
import { SettingsBlock } from "../../../components/SettingsBlock";
import { createServerRole } from "../../../services/serverService";
import { serverRoleStore } from "../../../store/serverRoleStore";
import { serverStore } from "../../../store/serverStore";
import { closestFromEvent } from "../../../utils/dom";
import { router } from "../../../utils/router";
import type { ServerSettingsContext } from "./ServerSettings";

import style from "./rolesServerSettingsPage.module.css";

const getStrings = () => ({});

const inviteSettingsPage = (context: ServerSettingsContext) => {
  const ac = new AbortController();
  const { signal } = ac;

  const getServerId = () => serverStore.currentServerId;

  let el = (<div class={style.page}></div>) as HTMLDivElement;

  const rerender = () => {
    const orderedRoles = serverStore.currentServerSortedRoles.rerun();
    const verified = serverStore.currentServer()?.verified;

    el.replaceChildren(
      <>
        {!verified && (
          <Notice
            type="info"
            description={t`Custom invite links are only available for verified servers.`}
          />
        )}
        <SettingsBlock.Root>
          <SettingsBlock.Icon name="mail" />
          <SettingsBlock.Details title={t`Custom Invite`} />
        </SettingsBlock.Root>
        <SettingsBlock.Group class="group">
          {orderedRoles.map(() => (
            <RoleItem />
          ))}
        </SettingsBlock.Group>
      </>,
    );
  };

  rerender();

  let createdRoleId = "";
  el.addEventListener(
    "click",
    async (event) => {
      const actionEl = closestFromEvent(event, "[data-action]");
      const action = actionEl?.dataset?.action;
      if (action === "create-role") {
        const [role] = await createServerRole(getServerId()!);
        if (role) {
          createdRoleId = role.id;
          navigateToCreatedRole(role.id);
        }
      }
    },
    { signal },
  );

  const navigateToCreatedRole = (roleId: string) => {
    if (createdRoleId != roleId) return;
    if (signal.aborted) return;
    const role = serverRoleStore.roles.get(getServerId()!)?.has(roleId);
    if (!role) return;
    if (signal.aborted) return;
    router.navigate(`./${roleId}`);
  };

  context.content.replaceChildren(el);

  const destroy = () => {
    ac.abort();
    el.remove();
    (el as any) = null;
  };

  return { destroy };
};

const RoleItem = (_props: {}) => {
  return <SettingsBlock.Root>test</SettingsBlock.Root>;
};

export { getStrings, inviteSettingsPage as create };

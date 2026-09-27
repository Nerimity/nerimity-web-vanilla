import { t } from "@lingui/core/macro";

import { isNewDay } from "../../../components/message-pane/utils";
import { SettingsBlock } from "../../../components/SettingsBlock";
import {
  getServerAuditLogs,
  type UserAuditLog,
} from "../../../services/serverService";
import { serverStore } from "../../../store/serverStore";
import type { RawUser } from "../../../Types";
import { fullDate } from "../../../utils/date";
import type { ServerSettingsContext } from "./ServerSettings";

import style from "./auditLogsServerSettingsPage.module.css";

const getStrings = () => ({});

const auditLogsServerSettingsPage = (context: ServerSettingsContext) => {
  const ac = new AbortController();

  const getServerId = () => serverStore.currentServerId;

  let el = (<div class={style.page}></div>) as HTMLDivElement;
  getServerAuditLogs({
    serverId: getServerId()!,
  }).then(([res]) => {
    if (!res) return;
    el.replaceChildren(
      <>
        {res.auditLogs.map((a, i) => (
          <AuditItem audit={a} prev={res.auditLogs[i - 1]} users={res.users} />
        ))}
      </>,
    );
  });

  context.content.replaceChildren(el);

  const destroy = () => {
    ac.abort();
    el.remove();
    (el as any) = null;
  };

  return { destroy };
};

const Transform = (audit: UserAuditLog, users: RawUser[]) => {
  const user = users.find((u) => audit.actionById === u.id);
  const username = user?.username || "";

  switch (audit.actionType) {
    case "SERVER_CHANNEL_UPDATE":
      return {
        icon: "tag",
        title: () => t`${username} updated a channel`,
      };
    case "SERVER_USER_BAN":
      const bannedUser = users.find((u) => u.id === audit.data?.bannedUserId);
      const bannedUsername = bannedUser?.username || "";
      return {
        icon: "block",
        title: () => t`${username} banned ${bannedUsername}`,
      };

    default:
      return {
        icon: "",
        title: () => audit.actionType,
      };
  }
};

const AuditItem = (props: {
  audit: UserAuditLog;
  prev?: UserAuditLog;
  users: RawUser[];
}) => {
  const newDay =
    !props.prev || isNewDay(props.prev || { createdAt: 0 }, props.audit);

  const transformed = Transform(props.audit, props.users);

  return (
    <>
      {newDay && <div>{fullDate(props.audit.createdAt)}</div>}

      <SettingsBlock.Root>
        <SettingsBlock.Icon name={transformed.icon} />

        <div>{transformed.title()}</div>
      </SettingsBlock.Root>
    </>
  );
};

export { getStrings, auditLogsServerSettingsPage as create };

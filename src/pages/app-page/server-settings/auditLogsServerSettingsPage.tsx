import { Trans } from "@trans";

import { isNewDay } from "../../../components/message-pane/utils";
import { SettingsBlock } from "../../../components/SettingsBlock";
import {
  getServerAuditLogs,
  type UserAuditLog,
} from "../../../services/serverService";
import { serverStore } from "../../../store/serverStore";
import type { RawUser } from "../../../Types";
import { fullDate, getTime } from "../../../utils/date";
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
    case "SERVER_CHANNEL_UPDATE": {
      return {
        icon: "tag",
        title: () => (
          <Trans>
            <strong>{username}</strong> updated a channel
          </Trans>
        ),
        description: () => (
          <div>
            {audit.data
              ? Object.entries(audit.data).map(([k, v]) => (
                  <div>
                    {k}: <strong>{v || "Removed"}</strong>
                  </div>
                ))
              : null}
          </div>
        ),
      };
    }
    case "SERVER_USER_BAN": {
      const bannedUser = users.find((u) => u.id === audit.data?.bannedUserId);
      const bannedUsername = bannedUser?.username || "";
      return {
        icon: "block",
        title: () => (
          <Trans>
            <strong>{username}</strong> banned <strong>{bannedUsername}</strong>
          </Trans>
        ),
      };
    }
    case "SERVER_USER_KICK": {
      const kickedUser = users.find((u) => u.id === audit.data?.kickedUserId);
      const kickedUsername = kickedUser?.username || "";
      return {
        icon: "logout",
        title: () => (
          <Trans>
            <strong>{username}</strong> kicked <strong>{kickedUsername}</strong>
          </Trans>
        ),
      };
    }
    case "SERVER_USER_UPDATE": {
      const updatedUsername = "User"; // TODO: get updated users username
      return {
        icon: "edit",
        title: () => (
          <Trans>
            <strong>{username}</strong> updated{" "}
            <strong>{updatedUsername}</strong>
          </Trans>
        ),
        description: () => (
          <div>
            {audit.data
              ? Object.entries(audit.data).map(([k, v]) => (
                  <div>
                    {k}: <strong>{v || "Removed"}</strong>
                  </div>
                ))
              : null}
          </div>
        ),
      };
    }

    default: {
      return {
        icon: "",
        title: () => audit.actionType,
        description: () => (
          <div>
            {audit.data
              ? Object.entries(audit.data).map(([k, v]) => (
                  <div>
                    {k}: <strong>{v || "Removed"}</strong>
                  </div>
                ))
              : null}
          </div>
        ),
      };
    }
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
      {newDay && (
        <div class={style.newDay}>{fullDate(props.audit.createdAt, true)}</div>
      )}

      <SettingsBlock.Root>
        <SettingsBlock.Icon name={transformed.icon} />

        <div>
          <div>{transformed.title()}</div>
          <div>{transformed.description?.()}</div>
        </div>
        <div class={style.time}>{getTime(props.audit.createdAt)}</div>
      </SettingsBlock.Root>
    </>
  );
};

export { getStrings, auditLogsServerSettingsPage as create };

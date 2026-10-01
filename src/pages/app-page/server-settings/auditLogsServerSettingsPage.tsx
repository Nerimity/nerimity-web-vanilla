import { t } from "@lingui/core/macro";
import { Trans } from "@trans";

import { Button } from "../../../components/button";
import { isNewDay } from "../../../components/message-pane/utils";
import { SettingsBlock } from "../../../components/SettingsBlock";
import {
  getServerAuditLogs,
  type UserAuditLog,
} from "../../../services/serverService";
import { accountStore } from "../../../store/accountStore";
import { channelStore } from "../../../store/channelStore";
import { serverRoleStore } from "../../../store/serverRoleStore";
import { serverStore } from "../../../store/serverStore";
import type { RawUser } from "../../../Types";
import { fullDate, getTime } from "../../../utils/date";
import type { ServerSettingsContext } from "./ServerSettings";

import style from "./auditLogsServerSettingsPage.module.css";

const getStrings = () => ({});

const auditLogsServerSettingsPage = (context: ServerSettingsContext) => {
  const ac = new AbortController();
  const { signal } = ac;

  const getServerId = () => serverStore.currentServerId;

  const listEl = (<div class={style.list}></div>) as HTMLDivElement;

  let lastId = "";

  const btnEl = (
    <Button
      label={t`Load More`}
      primary
      class={style.loadMoreBtn}

      icon="expand_more"
    />
  ) as HTMLDivElement;

  let el = (
    <div class={style.page}>
      {listEl}
      {btnEl}
    </div>
  ) as HTMLDivElement;

  let loading = false;

  btnEl.addEventListener(
    "click",
    () => {
      load(true);
    },
    { signal },
  );

  const load = (more?: boolean) => {
    if (more && !lastId) return;
    if (loading) return;
    loading = true;
    btnEl.style.display = "none";

    getServerAuditLogs({
      serverId: getServerId()!,
      afterId: lastId,
    }).then(([res]) => {
      loading = false;
      if (!res) return;

      if (!res.auditLogs.length) {
        btnEl.style.display = "none";
      } else {
        btnEl.style.display = "flex";
      }

      const content = (
        <>
          {res.auditLogs.map((a, i) => (
            <AuditItem
              serverId={getServerId()!}
              audit={a}
              prev={res.auditLogs[i - 1]}
              users={res.users}
            />
          ))}
        </>
      );

      if (more) {
        listEl.appendChild(content);
      } else {
        listEl.replaceChildren(content);
      }

      lastId = res.auditLogs[res.auditLogs.length - 1]?.id || "";
    });
  };
  load();

  context.content.replaceChildren(el);

  const destroy = () => {
    ac.abort();
    el.remove();
    (el as any) = null;
  };

  return { destroy };
};

const Transform = (serverId: string, audit: UserAuditLog, users: RawUser[]) => {
  const user = users.find((u) => audit.actionById === u.id);
  const username = user?.username || "";

  switch (audit.actionType) {
    case "SERVER_CHANNEL_DELETE": {
      const channelName = audit.data?.name!;
      return {
        icon: "delete",
        color: "var(--alert-color)",
        title: () => (
          <Trans>
            <strong>{username}</strong> deleted channel{" "}
            <strong>{channelName}</strong>
          </Trans>
        ),
      };
    }
    case "SERVER_CHANNEL_CREATE": {
      return {
        icon: "tag",
        color: "var(--success-color)",
        title: () => (
          <Trans>
            <strong>{username}</strong> created a channel
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
    case "SERVER_UPDATE": {
      return {
        icon: "dns",
        color: "var(--primary-color)",
        title: () => (
          <Trans>
            <strong>{username}</strong> updated the server
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
    case "SERVER_ROLE_UPDATE": {
      const role = serverRoleStore.roles
        .get(serverId)
        ?.get(audit.data?.roleId!);
      const roleName = role?.name || "";

      return {
        icon: "tag",
        color: "var(--primary-color)",
        title: () => (
          <Trans>
            <strong>{username}</strong> updated the role{" "}
            <strong>{roleName}</strong>
          </Trans>
        ),
        description: () => (
          <div>
            {audit.data
              ? Object.entries(audit.data).map(([k, v]) =>
                  k === "roleId" ? (
                    <></>
                  ) : (
                    <div>
                      {k}: <strong>{v || "Removed"}</strong>
                    </div>
                  ),
                )
              : null}
          </div>
        ),
      };
    }
    case "SERVER_CHANNEL_UPDATE": {
      const channel = channelStore.channels.get(audit.data?.channelId!);
      const channelName = channel?.name || "";

      return {
        icon: "tag",
        color: "var(--primary-color)",
        title: () => (
          <Trans>
            <strong>{username}</strong> updated the channel{" "}
            <strong>{channelName}</strong>
          </Trans>
        ),
        description: () => (
          <div>
            {audit.data
              ? Object.entries(audit.data).map(([k, v]) =>
                  k === "channelId" ? (
                    <></>
                  ) : (
                    <div>
                      {k}: <strong>{v || "Removed"}</strong>
                    </div>
                  ),
                )
              : null}
          </div>
        ),
      };
    }
    case "SERVER_USER_UNBAN": {
      const unbannedUser = users.find(
        (u) => u.id === audit.data?.unbannedUserId,
      );
      const unbannedUsername = unbannedUser?.username || "";
      return {
        icon: "lock_open",
        color: "var(--success-color)",
        title: () => (
          <Trans>
            <strong>{username}</strong> unbanned{" "}
            <strong>{unbannedUsername}</strong>
          </Trans>
        ),
      };
    }
    case "SERVER_USER_BAN": {
      const bannedUser = users.find((u) => u.id === audit.data?.bannedUserId);
      const bannedUsername = bannedUser?.username || "";
      return {
        icon: "block",
        color: "var(--alert-color)",
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
        color: "var(--alert-color)",
        title: () => (
          <Trans>
            <strong>{username}</strong> kicked <strong>{kickedUsername}</strong>
          </Trans>
        ),
      };
    }
    case "SERVER_USER_UPDATE": {
      const updatedUser = users.find((u) => u.id === audit.data?.userId);
      const isCurrentUser = accountStore.currentUser?.id === updatedUser?.id;
      const updatedUsername = updatedUser?.username || "";
      return {
        icon: "edit",
        color: "var(--primary-color)",
        title: () =>
          isCurrentUser ? (
            <Trans>
              <strong>{username}</strong> updated their profile
            </Trans>
          ) : (
            <Trans>
              <strong>{username}</strong> updated{" "}
              <strong>{updatedUsername}</strong>'s profile
            </Trans>
          ),
        description: () => (
          <div>
            {audit.data
              ? Object.entries(audit.data).map(([k, v]) =>
                  k === "userId" ? (
                    <></>
                  ) : (
                    <div>
                      {k}: <strong>{v || "Removed"}</strong>
                    </div>
                  ),
                )
              : null}
          </div>
        ),
      };
    }

    default: {
      return {
        icon: "",
        color: "var(--primary-color)",
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
  serverId: string;
}) => {
  const newDay =
    !props.prev || isNewDay(props.prev || { createdAt: 0 }, props.audit);

  const transformed = Transform(props.serverId, props.audit, props.users);

  return (
    <>
      {newDay && (
        <div class={style.newDay}>{fullDate(props.audit.createdAt, true)}</div>
      )}

      <SettingsBlock.Root>
        <div
          class={style.iconContainer}
          style={{ background: transformed.color }}
        >
          <SettingsBlock.Icon class={style.icon} name={transformed.icon} />
        </div>

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

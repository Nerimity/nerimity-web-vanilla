import { t } from "@lingui/core/macro";
import { Plural, Trans } from "@trans";

import {
  getServerDetailsByCode,
  getServerDetailsByEmojiId,
  type ServerWithMemberCount,
} from "../../services/serverService";
import { socket } from "../../services/socket";
import { serverMemberStore } from "../../store/serverMemberStore";
import { serverStore } from "../../store/serverStore";
import { closestFromEvent } from "../../utils/dom";
import { customEmojiById } from "../../utils/emojis";
import { storeEmitter } from "../../utils/EventEmitter";
import { getRecentServerChannelId } from "../../utils/recentServerChannels";
import { router } from "../../utils/router";
import { Icon } from "../icon";
import { Avatar } from "../ui/avatar";
import { Button } from "../ui/button";
import { alert } from "../ui/modal";
import { InviteSkeleton } from "../ui/skeleton";

import style from "./InviteEmbed.module.css";

const inviteCache = new Map<string, ServerWithMemberCount | false>();

const localServer = (serverId: string) => {
  const server = serverStore.servers.get(serverId);
  if (server) {
    const lazy = server.lazy;
    if (lazy) {
      socket.requestServerMembers(serverId);
    }
    return {
      memberCount: lazy
        ? "..."
        : serverMemberStore.serverMembers.get(serverId)?.size,
      ...server,
    };
  }
};

const pendingEmbeds = new Map<string, Set<WeakRef<HTMLElement>>>();
const memberRefreshers = new WeakMap<HTMLElement, () => void>();

storeEmitter.on(
  "server:members_fetched",
  ({ serverId }) => {
    const server = localServer(serverId);
    if (server) {
      inviteCache.set(
        `invite/${serverId}`,
        server as unknown as ServerWithMemberCount,
      );
    }

    const pending = pendingEmbeds.get(serverId);
    if (!pending) return;
    pendingEmbeds.delete(serverId);
    for (const ref of pending) {
      const embed = ref.deref();
      if (embed?.isConnected) memberRefreshers.get(embed)?.();
    }
  },
  new AbortController().signal,
);

const serverDetailsByEmoji = async (emojiId: string) => {
  const cachedEmoji = await customEmojiById(emojiId);

  const serverId = cachedEmoji?.serverId;
  if (serverId) {
    const server = localServer(serverId);
    if (server) {
      return server;
    }
  }

  const [exploreItem] = await getServerDetailsByEmojiId(emojiId);
  if (exploreItem && exploreItem.server) {
    return {
      memberCount: exploreItem.server._count?.serverMembers || 0,
      ...exploreItem.server,
    };
  }
};
const serverDetailsByCode = async (code: string) => {
  const serverId = code;
  if (serverId) {
    const server = localServer(serverId);
    if (server) {
      return server;
    }
  }

  const [server] = await getServerDetailsByCode(code);
  return server;
};

export const InviteEmbed = (props: {
  code?: string;
  emojiId?: string;
  clan?: boolean;
}) => {
  const cacheId = props.code
    ? `invite/${props.code}`
    : props.emojiId
      ? `emoji/${props.emojiId}`
      : "";

  let inviteItem: ServerWithMemberCount | null | undefined =
    inviteCache.get(cacheId) || undefined;

  const el = (
    <div class={[style.inviteEmbed, "inviteEmbed"]}></div>
  ) as HTMLDivElement;

  const render = () => {
    if (inviteItem === undefined) {
      return el.replaceChildren(<InviteSkeleton />);
    }
    if (inviteItem === null) {
      return el.replaceChildren(<InvalidInvite {...props} />);
    }

    const isInServer = !!serverStore.servers.get(inviteItem.id);

    const count = inviteItem.memberCount.toLocaleString();
    el.replaceChildren(
      <>
        <div class={style.content}>
          <Avatar size={40} server={inviteItem} />
          <div class={style.details}>
            <div>{inviteItem.name}</div>
            <div class={style.sub}>
              <span>
                <Plural
                  value={count}
                  _0={
                    <Trans>
                      <span class={style.full}>No</span> Members
                    </Trans>
                  }

                  one={
                    <Trans>
                      <span class={style.full}>{count}</span> Member
                    </Trans>
                  }
                  other={
                    <Trans>
                      <span class={style.full}>{count}</span> Members
                    </Trans>
                  }
                />
              </span>
            </div>
          </div>
          <Button
            class={style.button}
            data-code={props.code}
            data-id={inviteItem.id}
            icon="login"
            hoverBorder
            success={isInServer}
            label={isInServer ? t`Visit` : t`Join`}
          />
        </div>
      </>,
    );
  };

  const watchMembers = () => {
    if (!inviteItem || (inviteItem.memberCount as unknown) !== "...") return;
    const serverId = inviteItem.id;

    memberRefreshers.set(el, () => {
      inviteItem = localServer(serverId) as unknown as ServerWithMemberCount;
      inviteCache.set(cacheId, inviteItem);
      render();
    });
    const pending = pendingEmbeds.get(serverId) ?? new Set();
    pending.add(new WeakRef(el));
    pendingEmbeds.set(serverId, pending);
  };

  render();
  watchMembers();

  if (!inviteItem) {
    if (props.emojiId) {
      serverDetailsByEmoji(props.emojiId).then((details) => {
        inviteItem = (details as ServerWithMemberCount) || null;
        inviteCache.set(cacheId, inviteItem);
        render();
        watchMembers();
      });
    } else if (props.code) {
      serverDetailsByCode(props.code).then((server) => {
        inviteItem = (server as ServerWithMemberCount) || null;
        inviteCache.set(cacheId, inviteItem);
        render();
        watchMembers();
      });
    }
  }

  return el;
};

document.addEventListener("click", async (e) => {
  const btn = closestFromEvent(e, `.${style.button}`);
  if (!btn) return;
  const serverId = btn.dataset.id!;
  const code = btn.dataset.code;

  const server = serverStore.servers.get(serverId);

  if (server) {
    router.navigate(
      `/app/servers/${serverId}/${getRecentServerChannelId(serverId)}`,
    );
    return;
  }
  const [, error] = await serverStore.joinServer(serverId, code);
  if (error?.message) {
    alert({ message: error.message });
  }
});

function InvalidInvite(props: { emojiId?: string; clan?: boolean }) {
  return (
    <div class={style.content}>
      <Icon class={style.icon} name="error" />
      <div class={style.details}>
        <div class={style.errorMessage}>
          {props.emojiId
            ? t`Emoji from a private server.`
            : props.clan
              ? t`Clan from a private server.`
              : t`Invalid Invite.`}
        </div>
      </div>
    </div>
  );
}

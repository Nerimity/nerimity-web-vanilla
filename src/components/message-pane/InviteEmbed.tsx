import { t } from "@lingui/core/macro";
import { Plural, Trans } from "@trans";

import {
  getServerDetailsByCode,
  getServerDetailsByEmojiId,
  type ServerWithMemberCount,
} from "../../services/serverService";
import { serverMemberStore } from "../../store/serverMemberStore";
import { serverStore } from "../../store/serverStore";
import { customEmojiById } from "../../utils/emojis";
import { Avatar } from "../avatar";
import { Button } from "../button";
import { Icon } from "../icon";
import { InviteSkeleton } from "../skeleton";

import style from "./InviteEmbed.module.css";

const inviteCache = new Map<string, ServerWithMemberCount | false>();

const localServer = (serverId: string) => {
  const server = serverStore.servers.get(serverId);
  if (server) {
    return {
      memberCount: serverMemberStore.serverMembers.get(serverId)?.size,
      ...server,
    };
  }
};

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
    el.replaceChildren(
      <>
        <div class={style.content}>
          <Avatar size={40} server={inviteItem} />
          <div class={style.details}>
            <div>{inviteItem.name}</div>
            <div class={style.sub}>
              <span>
                <Plural
                  value={inviteItem.memberCount}
                  _0={
                    <Trans>
                      <span class={style.full}>No</span> Members
                    </Trans>
                  }

                  one={
                    <Trans>
                      <span class={style.full}>
                        {inviteItem.memberCount.toLocaleString()}
                      </span>{" "}
                      Member
                    </Trans>
                  }
                  other={
                    <Trans>
                      <span class={style.full}>
                        {inviteItem.memberCount.toLocaleString()}
                      </span>{" "}
                      Members
                    </Trans>
                  }
                />
              </span>
            </div>
          </div>
          <Button
            class={style.button}
            icon="login"
            hoverBorder
            success={isInServer}
            label={isInServer ? t`Visit` : t`Join`}
          />
        </div>
      </>,
    );
  };

  render();

  if (!inviteItem) {
    if (props.emojiId) {
      serverDetailsByEmoji(props.emojiId).then((details) => {
        inviteItem = (details as ServerWithMemberCount) || null;
        inviteCache.set(cacheId, inviteItem);
        render();
      });
    } else if (props.code) {
      serverDetailsByCode(props.code).then((server) => {
        inviteItem = (server as ServerWithMemberCount) || null;
        inviteCache.set(cacheId, inviteItem);
        render();
      });
    }
  }

  return el;
};

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

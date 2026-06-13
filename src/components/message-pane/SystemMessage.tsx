import { css } from "@linaria/core";
import { Trans } from "@trans";

import { h } from "../../h";
import { type Message } from "../../store/messageStore";
import { serverMemberStore } from "../../store/serverMemberStore";
import { serverStore } from "../../store/serverStore";
import { convertShorthandToLinearGradient } from "../../utils/color";
import { scoped } from "../../utils/css";
import { friendlyTimestamp } from "../../utils/date";
import { Avatar } from "../avatar";
import { GradientText } from "../gradientText";
import { Icon } from "../icon";
import { Link } from "../link";
import { MessageReactions } from "./MessageReactions";

const systemMessage = css`
  display: flex;
  gap: 6px;
  align-items: center;

  .${scoped`details`} {
    display: flex;
    align-items: center;
    overflow: hidden;
    column-gap: 4px;
    min-width: 0;
    flex-wrap: wrap;
    &:nth-child(1) {
      color: var(--gray-200);
    }
  }

  .${scoped`timestamp`} {
    font-size: 12px;
    color: var(--gray-400);
    white-space: nowrap;
    flex-shrink: 0;
  }

  .${scoped`username`} {
    font-weight: 500;
    overflow: hidden;
    min-width: 0;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex-shrink: 1;
    line-height: 1.25;
  }

  .${scoped`usernameContainer`} {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    min-width: 0;
    flex-shrink: 1;
  }

  .avatarContainer {
    align-self: flex-start;
    margin-top: 2px;
  }

  .${scoped`messageBody`} {
    min-width: 0;
    overflow: hidden;
    width: 100%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    .${scoped`icon`} {
      color: var(--icon-color);
      font-size: 14px;
    }
  }
`;

interface MessageTypeDetails {
  color: string;
  icon: string;
  Message: (props: { username: any; bot?: boolean }) => any;
}

const MessageTypes: (MessageTypeDetails | null)[] = [
  null,
  {
    color: "var(--success-color)",
    icon: "login",
    Message: ({ username, bot }: { username: any; bot?: boolean }) =>
      bot ? (
        <Trans>{username} has been added.</Trans>
      ) : (
        <Trans>{username} has joined.</Trans>
      ),
  },
  {
    color: "var(--alert-color)",
    icon: "logout",
    Message: ({ username }: { username: any }) => (
      <Trans>{username} has left.</Trans>
    ),
  },
  {
    color: "var(--warn-color)",
    icon: "logout",
    Message: ({ username }: { username: any }) => (
      <Trans>{username} has been kicked.</Trans>
    ),
  },
  {
    color: "var(--alert-color)",
    icon: "block",
    Message: ({ username }: { username: any }) => (
      <Trans>{username} has been banned.</Trans>
    ),
  },
  {
    color: "var(--success-color)",
    icon: "call",
    Message: ({ username }: { username: any }) => (
      <Trans>{username} started a call.</Trans>
    ),
  },
  {
    color: "var(--primary-color)",
    icon: "trending_up",
    Message: ({ username }: { username: any }) => (
      <Trans>{username} bumped the server.</Trans>
    ),
  },
  {
    color: "var(--primary-color)",
    icon: "keep",
    Message: ({ username }: { username: any }) => (
      <Trans>{username} pinned a message.</Trans>
    ),
  },
];

export const SystemMessage = (props: { message: Message }) => {
  const creator = props.message.createdBy;

  const member = serverMemberStore.serverMembers
    .get(serverStore.currentServerId!)
    ?.get(creator.id);

  const topRole = serverStore.memberTopColorAndIcon(member);
  const color =
    convertShorthandToLinearGradient(topRole?.color) ?? topRole?.color ?? "";

  const name = member?.nickname || creator.username;

  const type = MessageTypes[props.message.type];
  if (!type) {
    console.warn(`Unknown system message type: ${props.message.type}`);
    return null;
  }

  const usernameEl = (
    <span
      class={scoped`usernameContainer`}
      style={{ "--icon-color": type.color }}
    >
      <Icon name={type.icon} class={scoped`icon`} />
      <GradientText
        tag={Link}
        decoration
        href={`/app/profile/${creator.id}`}
        class={scoped`username`}
        color={color}
      >
        {name}
      </GradientText>
    </span>
  );

  return (
    <div class={systemMessage}>
      <Link class="avatarContainer" href={`/app/profile/${creator.id}`}>
        <Avatar user={creator} size={32} />
      </Link>

      <div class={scoped`messageBody`}>
        <span class={scoped`details`}>
          <type.Message bot={creator.bot} username={usernameEl} />
        </span>
        <div class={scoped`timestamp`}>
          {friendlyTimestamp(props.message.createdAt)}
        </div>
        <MessageReactions message={props.message} />
      </div>
    </div>
  );
};

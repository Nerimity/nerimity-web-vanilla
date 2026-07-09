import { Trans } from "@trans";

import { h } from "../../h";
import { type Message } from "../../store/messageStore";
import { serverMemberStore } from "../../store/serverMemberStore";
import { serverStore } from "../../store/serverStore";
import { resolveGradient } from "../../utils/color";
import { friendlyTimestamp } from "../../utils/date";
import { Avatar } from "../avatar";
import { GradientText } from "../gradientText";
import { Icon } from "../icon";
import { Link } from "../link";
import { MessageReactions } from "./MessageReactions";

import style from "./SystemMessage.module.css";

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
  const color = resolveGradient(topRole?.color) ?? "";

  const name = member?.nickname || creator.username;

  const type = MessageTypes[props.message.type];
  if (!type) {
    console.warn(`Unknown system message type: ${props.message.type}`);
    return null;
  }

  const usernameEl = (
    <span
      class={style.usernameContainer}
      style={{ "--icon-color": type.color }}
    >
      <Icon name={type.icon} class={style.icon} />
      <GradientText
        tag={Link}
        decoration
        data-user-id={creator.id}
        href={`/app/profile/${creator.id}`}
        class={style.username}
        color={color}
      >
        {name}
      </GradientText>
    </span>
  );

  return (
    <div class={style.systemMessage}>
      <Link class={style.avatarContainer} href={`/app/profile/${creator.id}`}>
        <Avatar user={creator} size={32} />
      </Link>

      <div class={style.messageBody}>
        <span class={style.details}>
          <type.Message bot={creator.bot} username={usernameEl} />
        </span>
        <div class={style.timestamp}>
          {friendlyTimestamp(props.message.createdAt)}
        </div>
        <MessageReactions message={props.message} />
      </div>
    </div>
  );
};

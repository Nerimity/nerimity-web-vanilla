import { css } from "@linaria/core";

import { h } from "../../h";
import { Avatar } from "../avatar";
import { Icon } from "../icon";
import { Link } from "../link";

interface MentionProps {
  user?: { id: string; username: string; hexColor: string; avatar?: string };
  channel?: { id: string; name?: string; serverId?: string };
  label?: string;
  icon?: string;
}

const mention = css`
  display: inline-flex;
  vertical-align: middle;

  gap: 4px;
  align-items: center;
  padding: 2px 4px;
  padding-right: 6px;
  border-radius: var(--radius-max);
  background: var(--markup-mention-background-color);
  color: var(--primary-color);
  text-decoration: none;
  cursor: pointer;
  line-height: 0;

  &:hover {
    background: var(--markup-mention-background-color-hover);
  }
  .text {
    line-height: normal;
  }
  .icon {
    opacity: 0.8;
    size: 16px;
  }
`;

export const Mention = (props: MentionProps) => {
  const text = props.user?.username || props.channel?.name || props.label;

  let url = "";
  if (props.user) {
    url = `/app/profile/${props.user.id}`;
  }
  if (props.channel) {
    url = `/app/servers/${props.channel.serverId!}/${props.channel.id}`;
  }

  return (
    <Link href={url} class={mention}>
      {props.user && <Avatar user={props.user} size={16} />}
      {props.icon && <Icon name={props.icon} class="icon" />}
      <span class="text">{text}</span>
    </Link>
  );
};

import { css } from "@linaria/core";

import { h, Fragment } from "../../h";
import { convertShorthandToLinearGradient } from "../../utils/color";
import { Avatar } from "../avatar";
import { GradientText } from "../gradientText";
import { Icon } from "../icon";
import { Link } from "../link";

interface MentionProps {
  user?: { id: string; username: string; hexColor: string; avatar?: string };
  channel?: { id: string; name?: string; serverId?: string };
  role?: { id: string; name?: string; hexColor?: string };
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
  line-height: 0;
  &a {
    cursor: pointer;
  }

  &:hover {
    background: var(--markup-mention-background-color-hover);
  }

  .roleText {
    display: inline-flex;
    gap: 4px;
    align-items: center;
    font-weight: 500;
  }
  .icon {
    opacity: 0.8;
    font-size: 16px;
    color: var(--text-color);
    &.role {
      opacity: 1;
    }
  }
`;

export const Mention = (props: MentionProps) => {
  const text =
    props.user?.username ||
    props.channel?.name ||
    props.role?.name ||
    props.label;

  let url = "";
  if (props.user) {
    url = `/app/profile/${props.user.id}`;
  }
  if (props.channel) {
    url = `/app/servers/${props.channel.serverId!}/${props.channel.id}`;
  }

  const color = convertShorthandToLinearGradient(props.role?.hexColor);

  return h(
    url ? Link : "span",
    { class: mention, href: url },
    <>
      {props.user && <Avatar user={props.user} size={16} />}
      {props.icon && <Icon name={props.icon} class="icon" />}
      {color ? (
        <GradientText color={color} class="text roleText">
          <Icon name="alternate_email" class="icon role" />
          {text}
        </GradientText>
      ) : (
        <span class="text">{text}</span>
      )}
    </>,
  );
};

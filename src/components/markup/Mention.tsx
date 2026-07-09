import { h, Fragment } from "../../h";
import { resolveGradient } from "../../utils/color";
import { Avatar } from "../avatar";
import { GradientText } from "../gradientText";
import { Icon } from "../icon";
import { Link } from "../link";

import style from "./Mention.module.css";

interface MentionProps {
  user?: { id: string; username: string; hexColor: string; avatar?: string };
  channel?: { id: string; name?: string; serverId?: string };
  role?: { id: string; name?: string; hexColor?: string };
  label?: string;
  icon?: string;
}

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

  const color = resolveGradient(props.role?.hexColor);

  return h(
    url ? Link : "span",
    { class: style.mention, href: url },
    <>
      {props.user && <Avatar user={props.user} size={16} />}
      {props.icon && <Icon name={props.icon} class={style.icon} />}
      {color ? (
        <GradientText color={color} class={["text", style.roleText]}>
          <Icon name="alternate_email" class={[style.icon, style.role]} />
          {text}
        </GradientText>
      ) : (
        <span class="text">{text}</span>
      )}
    </>,
  );
};

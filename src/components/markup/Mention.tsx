import { h } from "../../h";
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
  monospace?: boolean;
  [key: string]: any;
}

export const Mention = ({
  user,
  channel,
  role,
  label,
  icon,
  monospace,
  ...rest
}: MentionProps) => {
  const text = label || user?.username || channel?.name || role?.name;

  let url = "";
  if (user) {
    url = `/app/profile/${user.id}`;
  }
  if (channel) {
    url = `/app/servers/${channel.serverId!}/${channel.id}`;
  }

  const color = resolveGradient(role?.hexColor);

  return h(
    url ? Link : "span",
    { ...rest, class: style.mention, href: url },
    <>
      {user && <Avatar class={style.avatar} user={user} size={16} />}
      {icon && <Icon name={icon} class={style.icon} />}
      {color ? (
        <GradientText color={color} class={["text", style.roleText]}>
          <Icon name="alternate_email" class={[style.icon, style.role]} />
          {text}
        </GradientText>
      ) : (
        <span class={["text", monospace && style.monospace]}>{text}</span>
      )}
    </>,
  );
};

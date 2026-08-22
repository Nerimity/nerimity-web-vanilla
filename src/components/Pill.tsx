import morphdom from "morphdom";

import { Channel } from "../store/channelStore";
import type { Server } from "../store/serverStore";
import type { User } from "../store/userStore";
import { debounce } from "../utils/debounce";
import { Avatar } from "./avatar";
import { CdnIcon } from "./cdnIcon";
import { Icon } from "./icon";

import style from "./Pill.module.css";

export const Pill = ({
  warn,
  error,
  icon,
  server,
  user,
  channel,
  label,
  suffix,
}: {
  warn?: boolean;
  error?: boolean;
  icon?: string | null;
  server?: Server;
  user?: User | null;
  channel?: Channel;
  label?: string;
  suffix?: any;
}) => {
  const isServerChannel = !!channel?.serverId;
  return (
    <div class={style.pill}>
      {icon ? (
        <Icon
          name={icon}
          class={[style.icon, warn && style.warn, error && style.error]}
        />
      ) : !isServerChannel ? (
        <Avatar size={24} server={server} user={user} />
      ) : null}
      {isServerChannel ? (
        <div class={style.channelIconOuter}>
          <CdnIcon channel={channel} size={14} class={style.channelIcon} />
        </div>
      ) : null}
      <div class={style.label}>{label}</div>
      {suffix}
    </div>
  );
};

export const createPillUpdater = (
  pillContainer: () => HTMLDivElement,
  pill: () => any,
) => {
  let pendingAnim: Animation | null = null;
  const updatePill = debounce(() => {
    const pillEl = pillContainer()?.querySelector(
      `.${style.pill}`,
    ) as HTMLElement;
    if (!pillEl) return;

    const oldWidth = pillEl.getBoundingClientRect().width;
    const oldHTML = pillEl.innerHTML;

    morphdom(pillEl, pill());

    if (pillEl.innerHTML === oldHTML) return;

    pendingAnim?.cancel();
    pendingAnim = null;

    const newLabelEl = pillEl.querySelector("." + style.label) as HTMLElement;
    const newWidth = pillEl.getBoundingClientRect().width;

    if (oldWidth !== newWidth) {
      newLabelEl.style.textOverflow = "clip";
      pillEl.animate([{ width: `${oldWidth}px` }, { width: `${newWidth}px` }], {
        duration: 200,
        easing: "ease",
        fill: "none",
      }).onfinish = () => {
        newLabelEl.removeAttribute("style");
      };
    }

    pendingAnim = newLabelEl.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: 260,
      easing: "ease",
      fill: "forwards",
    });
    pendingAnim.onfinish = () => {
      pendingAnim = null;
    };
  }, 100);
  return updatePill;
};

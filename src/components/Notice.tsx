import { t } from "@lingui/core/macro";

import { Icon } from "./icon";

import style from "./Notice.module.css";

const noticeType = () => ({
  warn: {
    title: t`Warning`,
    color: "var(--warn-color)",
    icon: "warning",
  },
  error: {
    title: t`Error`,
    color: "var(--alert-color)",
    icon: "error",
  },
  info: {
    title: t`Info`,
    color: "var(--primary-color)",
    icon: "info",
  },
  caution: {
    title: t`Caution`,
    color: "var(--alert-color)",
    icon: "error",
  },
  success: {
    title: t`Success`,
    color: "var(--success-color)",
    icon: "check_circle",
  },
});

interface NoticeProps {
  type: keyof ReturnType<typeof noticeType>;
  description?: string;
  title?: string;
  icon?: string;
}

export const Notice = (props: NoticeProps) => {
  const type = noticeType()[props.type];

  return (
    <div class={style.container}>
      <div class={style.title} style={{ "--color": type.color }}>
        <Icon class={style.icon} name={props.icon || type.icon} />
        {props.title || type.title}
      </div>
      <div class={style.description}>{props.description}</div>
    </div>
  );
};

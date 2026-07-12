import { h } from "../h";

import style from "./skeleton.module.css";

export const MessageSkeleton = (props: { wide?: boolean }) => (
  <div class={[style.skeletonItem, style.message]}>
    <div class={style.avatarSkeleton} />
    <div class={style.lines}>
      <div class={style.line} style={{ width: "120px" }} />
      <div class={style.line} style={{ width: props.wide ? "80%" : "50%" }} />
    </div>
  </div>
);

export const Skeleton = (props: { class?: string; style?: any }) => (
  <div
    class={[style.skeletonItem, style.raw, props.class]}
    style={props.style}
  />
);

import { h } from "../h";

import style from "./NotificationPill.module.css";

export const NotificationPill = (props: { count: number; class?: string }) => (
  <div class={[style.pill, props.class]}>{props.count}</div>
);

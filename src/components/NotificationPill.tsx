import { css } from "@linaria/core";

import { h } from "../h";

const pill = css`
  background: var(--alert-color);
  border-radius: var(--radius-max);
  height: 20px;
  min-width: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
  flex-shrink: 0;
`;
export const NotificationPill = (props: { count: number; class?: string }) => (
  <div class={[pill, props.class]}>{props.count}</div>
);

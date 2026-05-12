import { css } from "@linaria/core";

import { h } from "../h";

const skeletonItem = css`
  display: flex;
  gap: 10px;
  padding: 4px;
  margin-top: 10px;
  align-items: center;
  @keyframes shimmer {
    0% {
      opacity: 0.4;
    }
    50% {
      opacity: 0.8;
    }
    100% {
      opacity: 0.4;
    }
  }
  animation: shimmer 1.5s ease-in-out infinite;

  .avatarSkeleton {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: var(--slate-700);
    flex-shrink: 0;
  }

  .lines {
    display: flex;
    flex-direction: column;
    gap: 8px;
    flex: 1;
  }

  .line {
    height: 12px;
    border-radius: 4px;
    background: var(--slate-700);
  }
`;

export const MessageSkeleton = (props: { wide?: boolean }) => (
  <div class={skeletonItem}>
    <div class="avatarSkeleton" />
    <div class="lines">
      <div class="line" style={{ width: "120px" }} />
      <div class="line" style={{ width: props.wide ? "80%" : "50%" }} />
    </div>
  </div>
);

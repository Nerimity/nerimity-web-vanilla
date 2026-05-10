import { css } from "@linaria/core";
import { h } from "../../h";
import { Avatar } from "../avatar";
import { Link } from "../link";

interface MentionProps {
  user?: { id: string; username: string; hexColor: string; avatar?: string };
  label?: string;
}

const mention = css`
  display: inline-flex;
  vertical-align: middle;

  gap: 4px;
  align-items: center;
  padding: 2px 4px;
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
`;

export const Mention = (props: MentionProps) => {
  return (
    <Link href={`/app/profile/${props.user?.id}`} class={mention}>
      {props.user && <Avatar user={props.user} size={16} />}
      <span class="text">{props.user?.username || props.label}</span>
    </Link>
  );
};

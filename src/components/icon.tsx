import { h } from "../h";
export const Icon = (props: {
  name: string;
  outlined?: boolean;
  class?: string | (string | boolean | undefined)[];
}) => {
  return (
    <span
      class={["material-symbols-rounded", props.outlined && "o", props.class]}
    >
      {props.name}
    </span>
  );
};

import { h } from "../h";
export const Icon = (props: {
  name: string;
  outlined?: boolean;
  class?: string | (string | boolean | undefined)[];
  [key: string]: any;
}) => {
  const { name, outlined, ...rest } = props;
  return (
    <span
      {...rest}
      class={["material-symbols-rounded", outlined && "o", "icon", props.class]}
    >
      {name}
    </span>
  );
};

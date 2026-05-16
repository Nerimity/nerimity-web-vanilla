import { h } from "./h";

export const Dynamic = (props: {
  component:
    | keyof HTMLElementTagNameMap
    | (string & {})
    | ((...args: any[]) => Node);
  [key: string]: any;
}) => {
  const { component, children, ...rest } = props;
  return h(component as keyof HTMLElementTagNameMap, rest, children);
};

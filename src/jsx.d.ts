export {};

declare global {
  namespace JSX {
    type Element = Node;
    interface IntrinsicElements {
      [tag: string]: Props;
    }
    interface ElementChildrenAttribute {
      children: {};
    }
  }
}

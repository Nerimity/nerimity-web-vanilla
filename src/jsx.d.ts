export {};

declare global {
  namespace JSX {
    type Element = HTMLElement | DocumentFragment;
    interface IntrinsicElements {
      [tag: string]: Props & { children?: Child | Child[] };
    }
  }
}

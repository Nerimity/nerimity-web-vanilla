export class HoverAnimator {
  private targets: Array<{
    trigger?: string;
    image: string;
    crossAnimate?: {
      attr: string;
      targetRoot?: string;
      targetAttr?: string;
      target: string;
    };
  }>;
  private controller: AbortController;
  private hoveredStates = new Map<number, WeakSet<Element>>();
  private container: HTMLElement;
  private leaveTimeouts = new WeakMap<
    HTMLImageElement,
    ReturnType<typeof setTimeout>
  >();

  constructor(
    container: HTMLElement,
    targets: Array<{
      trigger?: string;
      image: string;
      crossAnimate?: {
        attr: string;
        targetRoot?: string;
        targetAttr?: string;
        target: string;
      };
    }>,
  ) {
    this.targets = targets;
    this.container = container;
    this.controller = new AbortController();
    const { signal } = this.controller;

    container.addEventListener(
      "mouseenter",
      (e) => {
        const event = e as MouseEvent;
        this.handle(
          event.target as HTMLElement,
          true,
          event.relatedTarget as HTMLElement | null,
        );
      },
      { capture: true, signal },
    );

    container.addEventListener(
      "mouseleave",
      (e) => {
        const event = e as MouseEvent;
        this.handle(
          event.target as HTMLElement,
          false,
          event.relatedTarget as HTMLElement | null,
        );
      },
      { capture: true, signal },
    );
  }

  private updateImageState(img: HTMLImageElement, hovered: boolean) {
    if (img.dataset.imgAnim === undefined) return;

    const existingTimeout = this.leaveTimeouts.get(img);
    if (existingTimeout !== undefined) {
      clearTimeout(existingTimeout);
      this.leaveTimeouts.delete(img);
    }

    const url = new URL(img.src);

    if (hovered) {
      if (url.searchParams.has("type")) {
        url.searchParams.delete("type");
        img.src = url.toString();
      }
    } else {
      const timeoutId = setTimeout(() => {
        url.searchParams.set("type", "webp");
        img.src = url.toString();
        this.leaveTimeouts.delete(img);
      }, 50);
      this.leaveTimeouts.set(img, timeoutId);
    }
  }

  private handle(
    target: HTMLElement,
    hovered: boolean,
    relatedTarget: HTMLElement | null,
  ) {
    for (let i = 0; i < this.targets.length; i++) {
      const { trigger, image, crossAnimate } = this.targets[i]!;
      const root = trigger ? target.closest(trigger) : target.closest(image);
      if (!root) continue;
      if (!hovered && relatedTarget && root.contains(relatedTarget)) continue;

      let ruleState = this.hoveredStates.get(i);
      if (!ruleState) {
        ruleState = new WeakSet<Element>();
        this.hoveredStates.set(i, ruleState);
      }

      if (hovered === ruleState.has(root)) continue;

      if (hovered) ruleState.add(root);
      else ruleState.delete(root);

      const imgs = trigger
        ? root.querySelectorAll<HTMLImageElement>(image)
        : [root as HTMLImageElement];

      imgs.forEach((img) => {
        this.updateImageState(img, hovered);
      });

      if (crossAnimate) {
        const attrValue = (root as HTMLElement).getAttribute(crossAnimate.attr);
        if (attrValue) {
          if (relatedTarget) {
            const relatedRoot = relatedTarget.closest(trigger ?? image);
            if (relatedRoot?.getAttribute(crossAnimate.attr) === attrValue)
              continue;
          }

          const crossRoots = this.container.querySelectorAll(
            `[${crossAnimate.targetAttr ?? crossAnimate.attr}="${attrValue}"]`,
          );

          crossRoots.forEach((cRoot) => {
            const crossImgs = cRoot.querySelectorAll<HTMLImageElement>(
              crossAnimate.target,
            );
            crossImgs.forEach((cImg) => this.updateImageState(cImg, hovered));
          });
        }
      }
    }
  }

  destroy() {
    this.controller.abort();
    this.hoveredStates.clear();
    (this.container as any) = null;
  }
}

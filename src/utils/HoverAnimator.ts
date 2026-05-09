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
  private hoveredRoots = new WeakSet<Element>();
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
    for (const { trigger, image, crossAnimate } of this.targets) {
      const root = trigger ? target.closest(trigger) : target.closest(image);
      if (!root) continue;
      if (!hovered && relatedTarget && root.contains(relatedTarget)) continue;
      if (hovered === this.hoveredRoots.has(root)) continue;

      if (hovered) this.hoveredRoots.add(root);
      else this.hoveredRoots.delete(root);

      const img = trigger
        ? root.querySelector<HTMLImageElement>(image)
        : (root as HTMLImageElement);

      if (img) {
        this.updateImageState(img, hovered);
      }

      if (crossAnimate) {
        const attrValue = (root as HTMLElement).getAttribute(crossAnimate.attr);
        if (attrValue) {
          if (relatedTarget) {
            const relatedRoot = relatedTarget.closest(trigger ?? image);
            if (relatedRoot?.getAttribute(crossAnimate.attr) === attrValue)
              continue;
          }

          const crossRoot = this.container.querySelector(
            `[${crossAnimate.targetAttr ?? crossAnimate.attr}="${attrValue}"]`,
          );
          const crossEl = crossRoot?.querySelector<HTMLImageElement>(
            crossAnimate.target,
          );

          if (crossEl) {
            this.updateImageState(crossEl, hovered);
          }
        }
      }
    }
  }

  destroy() {
    this.controller.abort();
  }
}

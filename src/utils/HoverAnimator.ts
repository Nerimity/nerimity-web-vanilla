export class HoverAnimator {
  private targets: Array<{ trigger?: string; avatar: string }>;
  private controller: AbortController;
  private hoveredRoots = new WeakSet<Element>();

  constructor(
    container: HTMLElement,
    targets: Array<{ trigger?: string; avatar: string }>,
  ) {
    this.targets = targets;
    this.controller = new AbortController();
    const { signal } = this.controller;

    container.addEventListener(
      "mouseenter",
      (e) => {
        this.handle(e.target as HTMLElement, true, null);
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

  private handle(
    target: HTMLElement,
    hovered: boolean,
    relatedTarget: HTMLElement | null,
  ) {
    for (const { trigger, avatar } of this.targets) {
      const root = trigger ? target.closest(trigger) : target.closest(avatar);
      if (!root) continue;
      if (!hovered && relatedTarget && root.contains(relatedTarget)) continue;
      if (hovered === this.hoveredRoots.has(root)) continue;

      if (hovered) this.hoveredRoots.add(root);
      else this.hoveredRoots.delete(root);

      const img = trigger
        ? root.querySelector<HTMLImageElement>(avatar)
        : (root as HTMLImageElement);
      if (img?.dataset.imgAnim === undefined) continue;

      const url = new URL(img.src);
      if (hovered) {
        url.searchParams.delete("type");
      } else {
        url.searchParams.set("type", "webp");
      }
      img.src = url.toString();
    }
  }

  destroy() {
    this.controller.abort();
  }
}

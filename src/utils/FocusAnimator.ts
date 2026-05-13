export class FocusAnimator {
  private controller: AbortController;
  private image: string;
  private container: HTMLElement;

  constructor(container: HTMLElement, image: string) {
    this.container = container;
    this.image = image;
    this.controller = new AbortController();
    const { signal } = this.controller;

    const update = (hovered: boolean) => {
      this.container
        .querySelectorAll<HTMLImageElement>(this.image)
        .forEach((img) => {
          this.updateImageState(img, hovered);
        });
    };

    window.addEventListener("focus", () => update(true), { signal });
    window.addEventListener("blur", () => update(false), { signal });

    update(document.hasFocus());
  }

  private updateImageState(img: HTMLImageElement, hovered: boolean) {
    if (img.dataset.imgAnim === undefined) return;

    const url = new URL(img.src);

    if (hovered) {
      if (url.searchParams.has("type")) {
        url.searchParams.delete("type");
        img.src = url.toString();
      }
    } else {
      url.searchParams.set("type", "webp");
      img.src = url.toString();
    }
  }

  destroy() {
    this.controller.abort();
  }
}

export class FocusAnimator {
  private controller: AbortController;
  private image: string;
  private container: HTMLElement | null;

  constructor(container: HTMLElement, image: string) {
    this.container = container;
    this.image = image;
    this.controller = new AbortController();
    const { signal } = this.controller;

    window.addEventListener("focus", () => this.update(true), { signal });
    window.addEventListener("blur", () => this.update(false), { signal });

    this.update(document.hasFocus());
  }

  private update(focus: boolean) {
    if (!this.container) return;
    this.container
      .querySelectorAll<HTMLImageElement>(this.image)
      .forEach((img) => {
        this.updateImageState(img, focus);
      });
  }

  trigger() {
    this.update(document.hasFocus());
  }

  private updateTag = (img: HTMLImageElement, focused: boolean) => {
    const imgTag = img.parentElement?.querySelector<HTMLDivElement>(".gifTag");
    if (!imgTag) return;
    imgTag.style.display = focused ? "none" : "flex";
  };

  private updateImageState(img: HTMLImageElement, focused: boolean) {
    if (img.dataset.imgAnim === undefined) return;

    this.updateTag(img, focused);
    const url = new URL(img.src);

    if (focused) {
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
    this.container = null;
  }
}

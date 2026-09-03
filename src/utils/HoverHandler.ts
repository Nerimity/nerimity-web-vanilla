export class HoverHandler {
  private targets: Array<{
    trigger?: string;
    selector: string;
    hoverSelectorAttribute?: string;
    onHover?: (el: HTMLElement) => void;
    onBlur?: (el: HTMLElement) => void;
    crossAnimate?: {
      attr: string;
      targetRoot?: string;
      targetAttr?: string;
      target: string;
      onHover?: (el: HTMLElement) => void;
      onBlur?: (el: HTMLElement) => void;
    };
  }>;
  private controller: AbortController;
  private hoveredStates = new Map<number, Set<HTMLElement>>();
  private container: HTMLElement;
  private mutationObserver: MutationObserver | null = null;

  constructor(
    container: HTMLElement,
    targets: Array<{
      trigger?: string;
      selector: string;
      hoverSelectorAttribute?: string;
      onHover?: (el: HTMLElement) => void;
      onBlur?: (el: HTMLElement) => void;
      crossAnimate?: {
        attr: string;
        targetRoot?: string;
        targetAttr?: string;
        target: string;
        onHover?: (el: HTMLElement) => void;
        onBlur?: (el: HTMLElement) => void;
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

    this.mutationObserver = new MutationObserver((mutations) => {
      this.handleMutations(mutations);
    });

    this.mutationObserver.observe(container, {
      childList: true,
      subtree: true,
    });
  }

  private handle(
    target: HTMLElement,
    hovered: boolean,
    relatedTarget: HTMLElement | null,
  ) {
    for (let i = 0; i < this.targets.length; i++) {
      const {
        trigger,
        selector,
        hoverSelectorAttribute,
        onHover,
        onBlur,
        crossAnimate,
      } = this.targets[i]!;

      let roots: Array<{ root: HTMLElement; hoverRoot: HTMLElement }> = [];
      if (hoverSelectorAttribute) {
        roots = Array.from(
          this.container.querySelectorAll<HTMLElement>(selector),
        ).flatMap((candidate) => {
          const hoverSelector = candidate.getAttribute(hoverSelectorAttribute);
          if (!hoverSelector) return [];

          try {
            const hoverRoot = target.closest(
              hoverSelector,
            ) as HTMLElement | null;
            return hoverRoot?.contains(candidate)
              ? [{ root: candidate, hoverRoot }]
              : [];
          } catch {
            return [];
          }
        });
      }

      if (roots.length === 0) {
        const root = (
          trigger ? target.closest(trigger) : target.closest(selector)
        ) as HTMLElement | null;
        if (root) roots.push({ root, hoverRoot: root });
      }

      for (const { root, hoverRoot } of roots) {
        if (!hovered && relatedTarget && hoverRoot.contains(relatedTarget))
          continue;

        let ruleState = this.hoveredStates.get(i);
        if (!ruleState) {
          ruleState = new Set<HTMLElement>();
          this.hoveredStates.set(i, ruleState);
        }

        if (hovered === ruleState.has(root)) continue;

        if (hovered) ruleState.add(root);
        else ruleState.delete(root);

        if (hovered) {
          onHover?.(root);
        } else {
          onBlur?.(root);
        }

        if (crossAnimate) {
          const attrValue = (root as HTMLElement).getAttribute(
            crossAnimate.attr,
          );
          if (attrValue) {
            if (relatedTarget) {
              const relatedRoot = relatedTarget.closest(trigger ?? selector);
              if (relatedRoot?.getAttribute(crossAnimate.attr) === attrValue)
                continue;
            }

            const crossRoots = this.container.querySelectorAll(
              `[${crossAnimate.targetAttr ?? crossAnimate.attr}="${attrValue}"]`,
            );

            crossRoots.forEach((cRoot) => {
              if (hovered) {
                crossAnimate.onHover?.(cRoot as HTMLElement);
              } else {
                crossAnimate.onBlur?.(cRoot as HTMLElement);
              }
            });
          }
        }
      }
    }
  }

  private handleMutations(mutations: MutationRecord[]) {
    for (const mutation of mutations) {
      if (mutation.type === "childList") {
        const removedNodes = mutation.removedNodes;
        for (let i = 0; i < removedNodes.length; i++) {
          const node = removedNodes[i];
          if (node && node.nodeType === Node.ELEMENT_NODE) {
            this.checkRemovedElement(node as HTMLElement);
          }
        }
      }
    }
  }

  private checkRemovedElement(element: HTMLElement) {
    for (let i = 0; i < this.targets.length; i++) {
      const { onBlur, crossAnimate } = this.targets[i]!;
      const ruleState = this.hoveredStates.get(i);
      if (!ruleState) continue;

      if (ruleState.has(element)) {
        ruleState.delete(element);
        onBlur?.(element);
      }

      if (crossAnimate) {
        const attrValue = (element as HTMLElement).getAttribute(
          crossAnimate.attr,
        );
        if (attrValue) {
          const crossRoots = Array.from(
            this.container.querySelectorAll(
              `[${crossAnimate.targetAttr ?? crossAnimate.attr}="${attrValue}"]`,
            ),
          );
          crossRoots.forEach((cRoot) => {
            if (ruleState.has(cRoot as HTMLElement)) {
              ruleState.delete(cRoot as HTMLElement);
              crossAnimate.onBlur?.(cRoot as HTMLElement);
            }
          });
        }
      }
    }

    for (let i = 0; i < element.children.length; i++) {
      this.checkRemovedElement(element.children[i]! as HTMLElement);
    }
  }

  destroy() {
    this.controller.abort();
    this.mutationObserver?.disconnect();
    this.hoveredStates.clear();
    (this.container as any) = null;
  }
}

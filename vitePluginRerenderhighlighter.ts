import type { Plugin } from "vite";

export const devRerenderHighlighter = (): Plugin => ({
  name: "dev-rerender-highlighter",
  apply: "serve",
  transformIndexHtml() {
    return [
      {
        tag: "script",
        attrs: { type: "module" },
        children: `
const flash = (el) => {
  if (!el || el.nodeType !== 1) return;
  const rect = el.getBoundingClientRect();
  if (!rect.width || !rect.height) return;

  const overlay = document.createElement("div");
  overlay.style.cssText = \`
    position: fixed;
    pointer-events: none;
    z-index: 999999;
    left: \${rect.left}px;
    top: \${rect.top}px;
    width: \${rect.width}px;
    height: \${rect.height}px;
    border: 2px solid red;
    transition: opacity 0.3s ease;
    opacity: 1;
  \`;
  document.body.appendChild(overlay);
  requestAnimationFrame(() => {
    overlay.style.opacity = "0";
    setTimeout(() => overlay.remove(), 300);
  });
};

const observerOptions = {
  childList: true,
  subtree: true,
  attributes: true,
  characterData: true,
  attributeFilter: ["src", "href", "data-id"],
};

const observer = new MutationObserver((mutations) => {
  const targets = new Set();
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (node.nodeType === 1) targets.add(node);
    }
    if (mutation.type === "attributes" || mutation.type === "characterData") {
      const el = mutation.target.nodeType === 1
        ? mutation.target
        : mutation.target.parentElement;
      if (el) targets.add(el);
    }
  }

  observer.disconnect();
  for (const el of targets) flash(el);
  observer.observe(document.body, observerOptions);
});

observer.observe(document.body, observerOptions);
        `,
        injectTo: "body",
      },
    ];
  },
});

export default devRerenderHighlighter;

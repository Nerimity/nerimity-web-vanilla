import { createHighlighterCore } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";
import auroraX from "@shikijs/themes/aurora-x";

const highlighter = await createHighlighterCore({
  themes: [auroraX],
  langs: [],
  engine: createJavaScriptRegexEngine(),
});

export async function highlight(code: string, lang: string) {
  if (!highlighter.getLoadedLanguages().includes(lang)) {
    const langModule = await import(
      /* @vite-ignore */ `/shiki-langs/${lang}.mjs`
    ).catch(() => {});
    if (!langModule) return;
    await highlighter.loadLanguage(langModule.default);
  }
  return highlighter.codeToHtml(code, { lang, theme: "aurora-x" });
}

import type { Plugin } from "vite";

function stringHash(str: string) {
  var hash = 5381,
    i = str.length;

  while (i) {
    hash = (hash * 33) ^ str.charCodeAt(--i);
  }

  return hash >>> 0;
}

function cssScoped(name: string, _filename: string, css: string) {
  const i = css.indexOf(`.${name}`);
  const lineNumber = css.substring(0, i).split(/[\r\n]/).length;
  const hash = stringHash(css).toString(36).substring(0, 5);

  return `_${name}_${hash}_${lineNumber}`;
}

export function cssScopedPlugin(): Plugin {
  return {
    name: "css-scoped",
    transform(code, id) {
      if (!id.endsWith(".tsx") && !id.endsWith(".ts")) return;
      if (!code.includes("scoped`")) return;

      const seen = new Map<string, string>();
      const declarations: string[] = [];

      const result = code.replace(/scoped`([^`]*)`/g, (_, name) => {
        if (!seen.has(name)) {
          const varName = `__scoped_${name}`;
          const value = cssScoped(name, id, code);
          declarations.push(`var ${varName} = ${JSON.stringify(value)};`);
          seen.set(name, varName);
        }
        return seen.get(name)!;
      });

      if (declarations.length === 0) return;

      return { code: result + "\n" + declarations.join("\n"), map: null };
    },
  };
}

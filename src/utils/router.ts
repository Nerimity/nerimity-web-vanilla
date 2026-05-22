export interface MatchResult<P = {}> {
  params: P;
}

const createRouter = () => {
  document.addEventListener("click", (e) => {
    if (e.target instanceof Element) {
      const href = e.target
        .closest("a[data-route]")
        ?.attributes.getNamedItem("href")?.value;

      if (href) {
        e.preventDefault();
        navigate(href);
      }
    }
  });

  const navigate = (pathname: string, options?: { replace?: boolean }) => {
    if (options?.replace) {
      history.replaceState(null, "", pathname);
    } else {
      history.pushState(null, "", pathname);
    }
    window.dispatchEvent(new Event("navigate"));
  };

  const matchResult = <P>(result: URLPatternResult) => {
    return {
      params: result.pathname.groups as P,
    };
  };

  const match = (pattern: string) => {
    const pat = new URLPattern({ pathname: pattern });
    const result = pat.exec({ pathname: location.pathname });
    return result ? matchResult(result) : null;
  };
  const namedGroups = (groups: Record<string, string | undefined>) =>
    Object.fromEntries(
      Object.entries(groups).filter(([k]) => isNaN(Number(k))),
    );

  const createMatchListener = <P = {}>(
    pattern: string | string[],
    callback: (res: MatchResult<P> | null) => void,
    opts: { signal: AbortSignal; defer?: boolean },
  ) => {
    const pats = Array.isArray(pattern)
      ? pattern.map((p) => new URLPattern({ pathname: p }))
      : [new URLPattern({ pathname: pattern })];

    let didMatch: boolean | undefined = undefined;
    let prevParams: string | null = null;

    const checkMatch = () => {
      let result: URLPatternResult | null = null;

      for (let i = 0; i < pats.length; i++) {
        const pat = pats[i]!;
        const res = pat.exec({ pathname: location.pathname });
        if (res) {
          result = res;
          break;
        }
      }

      const newParams = result
        ? JSON.stringify(namedGroups(result.pathname.groups))
        : null;
      if (didMatch === undefined) {
        didMatch = !!result;
        prevParams = newParams;
        callback(result ? matchResult(result) : null);
        return;
      }
      if (!didMatch && result) {
        didMatch = true;
        prevParams = newParams;
        callback(matchResult(result));
        return;
      }
      if (didMatch && result && newParams !== prevParams) {
        prevParams = newParams;
        callback(matchResult(result));
        return;
      }
      if (didMatch && !result) {
        didMatch = false;
        callback(null);
        return;
      }
    };
    if (!opts.defer) checkMatch();
    window.addEventListener("navigate", checkMatch, { signal: opts.signal });
  };
  window.addEventListener("popstate", () => {
    window.dispatchEvent(new Event("navigate"));
  });

  return { navigate, match, createMatchListener };
};

export const router = createRouter();

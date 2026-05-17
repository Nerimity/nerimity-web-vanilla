export interface MatchResult<P = {}> {
  params: P;
}

const createRouter = () => {
  document.addEventListener("click", (e) => {
    if (e.target instanceof HTMLElement) {
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
    pattern: string,
    callback: (res: MatchResult<P> | null) => void,
    signal: AbortSignal,
  ) => {
    const pat = new URLPattern({ pathname: pattern });

    let didMatch = false;
    let prevParams: string | null = null;

    const checkMatch = () => {
      const result = pat.exec({ pathname: location.pathname });
      const newParams = result
        ? JSON.stringify(namedGroups(result.pathname.groups))
        : null;
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

    checkMatch();
    window.addEventListener("navigate", checkMatch, { signal });
  };
  window.addEventListener("popstate", () => {
    window.dispatchEvent(new Event("navigate"));
  });

  return { navigate, match, createMatchListener };
};

export const router = createRouter();

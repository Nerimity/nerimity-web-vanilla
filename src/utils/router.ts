type ExtractParams<Path extends string> =
  Path extends `${infer _Before}:${infer Param}/${infer Rest}`
    ? Param | ExtractParams<`/${Rest}`>
    : Path extends `${infer _Before}:${infer Param}`
      ? Param
      : never;

type ParamsFor<Path extends string> =
  ExtractParams<Path> extends never
    ? Record<string, never>
    : { [K in ExtractParams<Path>]: string };

interface RouteDefinition {
  readonly path: string;
  readonly children?: readonly RouteDefinition[];
}

type FlattenPaths<T> = T extends readonly any[]
  ? {
      [K in keyof T]: T[K] extends {
        readonly path: infer P extends string;
        readonly children: infer C;
      }
        ? P | `${P}${FlattenPaths<C>}`
        : T[K] extends { readonly path: infer P extends string }
          ? P
          : never;
    }[number]
  : T extends {
        readonly path: infer P extends string;
        readonly children: infer C;
      }
    ? P | `${P}${FlattenPaths<C>}`
    : T extends { readonly path: infer P extends string }
      ? P
      : never;

type RouteCallback = (params: Record<string, string>, pathname: string) => void;

interface MatchOptions {
  trackParams?: boolean;
}

interface CompiledRoute {
  pattern: URLPattern;
  fullPath: string;
}

interface MatchEntry {
  routes: CompiledRoute[];
  callback: RouteCallback;
  lastKey: string | null;
  trackParams: boolean;
}

const flattenRoutes = (
  routes: readonly RouteDefinition[],
  prefix = "",
): CompiledRoute[] => {
  const result: CompiledRoute[] = [];
  for (const route of routes) {
    const fullPath = prefix + route.path;
    result.push({
      pattern: new URLPattern({ pathname: fullPath }),
      fullPath,
    });
    if (route.children) {
      result.push(...flattenRoutes(route.children, fullPath));
    }
  }
  return result;
};

const resolveParams = (pathname: string, params: Record<string, string>) =>
  pathname.replace(/:([^/]+)/g, (_, key: string) => params[key]!);

const createRouter = <const Routes extends readonly RouteDefinition[]>(
  routes: Routes,
) => {
  document.addEventListener("click", (e) => {
    if (e.target instanceof HTMLElement) {
      const href = e.target
        .closest("[data-route]")
        ?.attributes.getNamedItem("href")?.value;

      if (href) {
        e.preventDefault();
        navigate(href as NoParamPath);
      }
    }
  });

  type KnownPath = FlattenPaths<Routes>;
  type NoParamPath = {
    [P in KnownPath]: ExtractParams<P> extends never ? P : never;
  }[KnownPath];
  type WithParamPath = Exclude<KnownPath, NoParamPath>;

  const compiled = flattenRoutes(routes);
  const entries: MatchEntry[] = [];

  const dispatch = (pathname: string) => {
    for (const entry of entries) {
      let matched: CompiledRoute | undefined;
      let params: Record<string, string> = {};

      for (const route of entry.routes) {
        const result = route.pattern.exec({ pathname });
        if (result) {
          matched = route;
          params = (result.pathname.groups ?? {}) as Record<string, string>;
          break;
        }
      }

      const key = matched
        ? entry.trackParams
          ? "matched" + JSON.stringify(params)
          : "matched"
        : null;

      if (key !== entry.lastKey) {
        entry.lastKey = key;
        entry.callback(matched ? params : {}, pathname);
      }
    }
  };

  const match = (
    paths: KnownPath[],
    callback: RouteCallback,
    options: MatchOptions = {},
  ) => {
    const matchedRoutes = compiled.filter((c) =>
      (paths as string[]).some((p) => c.fullPath === p),
    );
    const entry: MatchEntry = {
      routes: matchedRoutes,
      callback,
      lastKey: "__uninitialized__",
      trackParams: options.trackParams ?? false,
    };
    entries.push(entry);
    dispatch(location.pathname);
    return () => {
      const i = entries.indexOf(entry);
      if (i !== -1) entries.splice(i, 1);
    };
  };

  interface NavigateOptions {
    replace?: boolean;
  }

  function navigate(pathname: NoParamPath, options?: NavigateOptions): void;
  function navigate<P extends WithParamPath>(
    pathname: P,
    params: ParamsFor<P>,
    options?: NavigateOptions,
  ): void;
  function navigate(
    pathname: string,
    paramsOrOptions?: Record<string, string> | NavigateOptions,
    options?: NavigateOptions,
  ): void {
    const params =
      paramsOrOptions && "replace" in paramsOrOptions
        ? undefined
        : (paramsOrOptions as Record<string, string> | undefined);
    const opts = (
      paramsOrOptions && "replace" in paramsOrOptions
        ? paramsOrOptions
        : options
    ) as NavigateOptions | undefined;

    const resolved = params ? resolveParams(pathname, params) : pathname;
    for (const entry of entries) {
      const matches = entry.routes.some((r) =>
        r.pattern.exec({ pathname: resolved }),
      );
      if (matches) entry.lastKey = "__uninitialized__";
    }
    if (opts?.replace) {
      history.replaceState(null, "", resolved);
    } else {
      history.pushState(null, "", resolved);
    }
    dispatch(resolved);
  }

  window.addEventListener("popstate", () => {
    for (const entry of entries) {
      const matches = entry.routes.some((r) =>
        r.pattern.exec({ pathname: location.pathname }),
      );
      if (matches) entry.lastKey = "__uninitialized__";
    }
    dispatch(location.pathname);
  });

  return { match, navigate };
};

export const router = createRouter([
  { path: "/" },
  { path: "/login" },
  {
    path: "/app",
    children: [
      { path: "/" },
      { path: "/servers/:serverId" },
      { path: "/servers/:serverId/:channelId" },
      { path: "/*" },
    ],
  },
] as const);

export type {
  RouteDefinition,
  RouteCallback,
  ParamsFor,
  ExtractParams,
  MatchOptions,
};

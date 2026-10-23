function updateFaviconUrl(url: string) {
  let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
  }
  link.href = url;
}

export function updateFavicon(alert?: boolean) {
  // const dev = isDev;
  const dev = true;

  updateFaviconUrl(`/favicon${alert ? "-alert" : ""}${dev ? "-dev" : ""}.ico`);
}

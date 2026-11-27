import { createLogoutModal } from "../components/modals/LogoutModal";
import { Avatar } from "../components/ui/avatar";
import { Button } from "../components/ui/button";
import { Link } from "../components/ui/link";
import { Skeleton } from "../components/ui/skeleton";
import { isDev } from "../config";
import { request } from "../services/request";
import type { UserDetails } from "../services/userService";
import { closestFromEvent } from "../utils/dom";
import { getLocalItem } from "../utils/localStorage";

import style from "./Header.module.css";

const debugBtn = isDev && (
  <Button
    class={style.debugBgn}
    icon="bug_report"
    hoverBorder
    href="/testing"
  />
);

let details: UserDetails | null = null;
export const Header = (props: {
  onType?: (event: "LoggedOutActions" | "LoggedInActions") => void;
  padding?: boolean;
  signal: AbortSignal;
}) => {
  const actions = (
    <div class={style.right}>
      <Skeleton class={style.skeleton} />
      <Skeleton class={style.skeleton} />
      <Skeleton class={style.skeletonAvatar} />
    </div>
  ) as HTMLDivElement;

  const renderActions = (type: "LoggedOutActions" | "LoggedInActions") => {
    props.onType?.(type);
    if (type === "LoggedOutActions") {
      actions.replaceChildren(
        <>
          {debugBtn}
          <Button href="/login" label="Login" icon="login" hoverBorder />
          <Button href="/register" label="Join Now" icon="add" primary />
        </>,
      );
    }
    if (type === "LoggedInActions") {
      actions.replaceChildren(
        <>
          {debugBtn}
          <Button
            data-action="logout"
            label="Logout"
            component={"a"}
            icon="logout"
            hoverBorder
            alert
          />
          <Button
            component={"a"}
            href="/app"
            label="Open App"
            icon="open_in_browser"
            primary
          />
          {details && (
            <Avatar class={style.avatar} user={details.user} size={40} />
          )}
        </>,
      );
    }
  };

  const el = (
    <div
      class={style.headerContainer}
      style={
        props.padding && { "padding-right": "12px", "padding-left": "12px" }
      }
    >
      <div class={style.header}>
        <Link href="/" class={style.left}>
          <img class={style.logo} src="/logo.png" />
          <div class={style.title}>Nerimity</div>
        </Link>
        {actions}
      </div>
    </div>
  ) as HTMLDivElement;

  el.addEventListener(
    "click",
    (e) => {
      if (closestFromEvent(e, `[data-action="logout"]`)) {
        createLogoutModal();
      }
    },
    { signal: props.signal },
  );

  (async () => {
    if (props.signal.aborted) return;
    if (!getLocalItem("userToken")) {
      renderActions("LoggedOutActions");
      return;
    }
    if (details) {
      renderActions("LoggedInActions");
      return;
    }
    const [res, err] = await request<UserDetails>("/users", { useToken: true });
    if (props.signal.aborted) return;
    if (err) {
      alert(err.message);
      return;
    }
    details = res;
    renderActions("LoggedInActions");
  })();

  return el;
};

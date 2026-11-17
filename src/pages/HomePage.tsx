import { t } from "@lingui/core/macro";

import { Icon } from "../components/icon";
import { Avatar } from "../components/ui/avatar";
import { Button } from "../components/ui/button";
import { Skeleton } from "../components/ui/skeleton";
import { isDev } from "../config";
import { request } from "../services/request";
import type { UserDetails } from "../services/userService";
import { closestFromEvent } from "../utils/dom";
import { getLocalItem } from "../utils/localStorage";

import style from "./HomePage.module.css";

let details: UserDetails | null = null;

const SourceCodeButton = () => (
  <Button
    component="a"
    hoverBorder
    icon="code"
    href="https://github.com/Nerimity"
    label={t`Source Code`}
    target="_blank"
    rel="noopener noreferrer"
  />
);

const LoggedOutActions = () => (
  <div class={style.buttons}>
    <Button
      component="a"
      icon="add"
      href="/register"
      label={t`Join Now`}
      primary
    />
    <Button
      hoverBorder
      component="a"
      icon="login"
      href="/login"
      label={t`Login`}
    />
    <SourceCodeButton />
  </div>
);
const LoggedInActions = () => (
  <div class={style.loggedInActions}>
    {details && (
      <div class={style.userDetailsOuter}>
        <div class={style.userDetails}>
          <Avatar
            hoverSelector={`.${style.userDetailsOuter}`}
            user={details.user}
            size={24}
          />
          <span class={style.userName}>{details.user.username}</span>
        </div>
      </div>
    )}

    <div class={style.buttons}>
      <Button
        label={t`Open App`}
        icon="open_in_browser"
        component="a"
        primary
        href="/app"
      />
      <Button
        component="a"
        hoverBorder
        icon={t`logout`}
        href="/logout"
        label="Logout"
        alert
      />
      <SourceCodeButton />
    </div>
  </div>
);

interface Feature {
  icon: string;
  label: string;
}
const Features = () =>
  [
    { icon: "gif", label: t`Free animated avatars & emojis` },
    { icon: "preview", label: t`Sleek design` },
    { icon: "sell", label: t`Change your tag for free` },
    { icon: "add", label: t`Create posts on your profile` },
    { icon: "dns", label: t`Create your own community` },
    { icon: "explore", label: t`Find new communities` },
    { icon: "volunteer_activism", label: t`Runs on donations` },
    { icon: "code", label: t`Full source code on GitHub` },
    { icon: "account_circle", label: t`Express yourself with borders` },
  ] satisfies Feature[];

const FeatureCard = ({ feature }: { feature: Feature }) => {
  return (
    <div class={style.feature}>
      <Icon class={style.featureIcon} name={feature.icon} />
      <span class={style.featureLabel}>{feature.label}</span>
    </div>
  );
};

const FeaturesCard = () => {
  let currentIndex = 0;
  const getCurrentFeature = () => Features()[currentIndex]!;

  const cardAreaEl = (
    <div class={"cardArea"}>
      <FeatureCard feature={getCurrentFeature()} />
    </div>
  ) as HTMLDivElement;
  const el = (
    <div class={style.featuresCard}>
      {cardAreaEl}
      <div class={style.featureButtons}>
        <Button data-action="back" icon="chevron_backward" />
        <Button data-action="forward" icon="chevron_forward" />
      </div>
    </div>
  );

  el.addEventListener("click", (e) => {
    const actionButton = closestFromEvent(e, "[data-action]");
    if (!actionButton) return;
    const action = actionButton.dataset.action!;
    if (action === "back") {
      if (currentIndex === 0) {
        currentIndex = Features().length - 1;
      } else {
        currentIndex--;
      }
    }
    if (action == "forward") {
      if (currentIndex === Features().length - 1) {
        currentIndex = 0;
      } else {
        currentIndex++;
      }
    }
    cardAreaEl.replaceChildren(<FeatureCard feature={getCurrentFeature()} />);
  });

  return el;
};

const createHomePage = () => {
  const loggedInAs = (
    <div class={style.authArea}>
      <div class={style.skeletons}>
        <Skeleton class={style.authLoadingSkeleton1} />
        <Skeleton class={style.authLoadingSkeleton} />
      </div>
    </div>
  ) as HTMLDivElement;

  const renderActions = (type: "LoggedOutActions" | "LoggedInActions") => {
    loggedInAs.replaceChildren(
      type === "LoggedOutActions" ? <LoggedOutActions /> : <LoggedInActions />,
    );
  };

  if (!getLocalItem("userToken")) {
    renderActions("LoggedOutActions");
  } else {
    request<UserDetails>("/users", { useToken: true }).then(([res, err]) => {
      if (err) {
        alert(err.message);
      } else {
        details = res;
      }
      renderActions("LoggedInActions");
    });
  }

  const app = document.getElementById("app")!;
  const content = (
    <div class={style.homeContainer}>
      <div class={style.innerContainer}>
        <div class={style.header}>
          <img class={style.logo} src="/logo.png" />
          <div class={style.info}>
            <div class={style.title}>Nerimity</div>
            <div
              class={style.description}
            >{t`Nerimity offers an elegant and feature-rich experience that sets it apart.`}</div>
            {loggedInAs}
          </div>
        </div>
      </div>
      <FeaturesCard />
      {isDev && (
        <Button
          icon="bug_report"
          hoverBorder
          component="a"
          href="/testing"
          label="Testing"
        />
      )}
    </div>
  ) as HTMLFormElement;

  const destroy = () => {
    content.remove();
  };

  const render = () => {
    app.replaceChildren(content);
  };

  return { render, destroy };
};

export default createHomePage;

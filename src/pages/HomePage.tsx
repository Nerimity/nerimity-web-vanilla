import { t } from "@lingui/core/macro";

import { Icon } from "../components/icon";
import { Button } from "../components/ui/button";
import { Skeleton } from "../components/ui/skeleton";
import { Footer } from "./Footer";
import { Header } from "./Header";

import style from "./HomePage.module.css";

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
    <div class={style.buttons}>
      <Button
        label={t`Open App`}
        icon="open_in_browser"
        component="a"
        primary
        href="/app"
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
    { icon: "groups", label: t`Join a clan and show its tag` },
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
  const el = (
    <div class={style.featuresCard}>
      {Features().map((f) => (
        <FeatureCard feature={f} />
      ))}
    </div>
  );

  return el;
};

const createHomePage = () => {
  const ac = new AbortController();
  const { signal } = ac;
  const loggedInAs = (
    <div class={style.authArea}>
      <div class={style.skeletons}>
        <Skeleton class={style.authLoadingSkeleton} />
      </div>
    </div>
  ) as HTMLDivElement;

  const renderActions = (type: "LoggedOutActions" | "LoggedInActions") => {
    loggedInAs.replaceChildren(
      type === "LoggedOutActions" ? <LoggedOutActions /> : <LoggedInActions />,
    );
  };

  const app = document.getElementById("app")!;
  const content = (
    <div class={style.homeContainer}>
      <div class={style.innerContainer}>
        <Header onType={renderActions} signal={signal} />
        <div class={style.block}>
          <div class={style.header}>
            <div class={style.info}>
              <div class={style.title}>{t`A modern and sleek chat app.`}</div>
              <div
                class={style.description}
              >{t`Nerimity offers an elegant and feature-rich experience that sets it apart.`}</div>
              {loggedInAs}
            </div>
          </div>
        </div>
        <FeaturesCard />
        <Footer />
      </div>
    </div>
  ) as HTMLFormElement;

  const destroy = () => {
    ac.abort();
    content.remove();
  };

  const render = () => {
    app.replaceChildren(content);
  };

  return { render, destroy };
};

export default createHomePage;

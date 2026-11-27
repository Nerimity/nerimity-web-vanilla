import { t } from "@lingui/core/macro";

import { Button } from "../components/ui/button";
import { Link } from "../components/ui/link";

import style from "./Footer.module.css";

const Socials = () => [
  {
    title: "Nerimity",
    href: "https://nerimity.com/i/nerimity",
    icon: "/logo.png",
  },
  {
    title: "Twitter",
    href: "https://twitter.com/Nerimity",
    icon: "/third-party/twitter.svg",
  },
  {
    title: "BlueSky",
    href: "https://bsky.app/profile/nerimity.com",
    icon: "/third-party/bluesky.svg",
  },
  {
    title: "Mastodon",
    href: "https://mastodon.social/@nerimity",
    icon: "/third-party/mastodon.svg",
  },
  {
    title: "Reddit",
    href: "https://www.reddit.com/r/nerimitychat",
    icon: "/third-party/reddit.svg",
  },
  {
    title: "Threads",
    href: "https://www.threads.com/@nerimity",
    icon: "/third-party/threads.svg",
  },
  {
    title: "YouTube",
    href: "https://www.youtube.com/@Nerimity",
    icon: "/third-party/youtube.svg",
  },
  {
    title: "KoFi",
    href: "https://ko-fi.com/supertiger",
    icon: "/third-party/kofi.svg",
  },
  {
    title: "Discord",
    href: "https://discord.gg/7PXjkSd",
    icon: "/third-party/discord.svg",
  },
];

export const Footer = (props: { padding?: boolean }) => {
  return (
    <div
      class={style.footerContainer}
      style={
        props.padding && { "padding-right": "12px", "padding-left": "12px" }
      }
    >
      <div class={style.footer}>
        <div class={style.first}>
          <Link href="/" class={style.nerimity}>
            <img class={style.logo} src="/logo.png" />
            <div class={style.title}>Nerimity</div>
          </Link>
          <Button label="TODO: Language" />
        </div>

        <div class={style.socials}>
          {Socials().map((s) => (
            <Button
              title={s.title}
              href={s.href}
              component={"a"}
              iconSrc={s.icon}
            />
          ))}
        </div>
        <div class={style.third}>
          <Button icon="shield" hoverBorder label={t`Privacy Policy`} />
          <Button icon="contract" hoverBorder label={t`Terms & Conditions`} />
        </div>
      </div>
    </div>
  );
};

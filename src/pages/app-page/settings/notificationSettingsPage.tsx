import { t } from "@lingui/core/macro";

import { Checkbox } from "../../../components/checkbox";
import { alert } from "../../../components/modal";
import { SettingsBlock } from "../../../components/SettingsBlock";
import { getLocalItem, setLocalItem } from "../../../utils/localStorage";
import { type SettingsContext } from "./Settings";

import style from "./notificationSettingsPage.module.css";

const getStrings = () => ({
  desktopNotifications: t`Desktop Notifications`,
});

const notificationSettingsPage = (context: SettingsContext) => {
  const ac = new AbortController();
  const { signal } = ac;

  let el = (
    <div class={style.page}>
      <DesktopNotifications context={context} signal={signal} />
    </div>
  ) as HTMLDivElement;
  context.content.replaceChildren(el);

  const destroy = () => {
    ac.abort();

    context.content.replaceChildren();
  };
  return { destroy };
};

const DesktopNotifications = (props: {
  context: SettingsContext;
  signal: AbortSignal;
}) => {
  const strings = getStrings();

  const el = (
    <SettingsBlock.Root
      clickable
      hideArrow
      data-action="toggle_desktop_notifications"
    >
      <SettingsBlock.Icon name="branding_watermark" />
      <SettingsBlock.Details
        title={strings.desktopNotifications}
        description={t`Show desktop notifications even when the app is minimized.`}
      />
      <Checkbox.Root
        class="checkbox"
        checked={getLocalItem("desktopNotification") || false}
      >
        <Checkbox.Box />
      </Checkbox.Root>
    </SettingsBlock.Root>
  ) as HTMLDivElement;

  let notification: Notification | undefined = undefined;
  const handleToggleDesktopNotifications = async () => {
    if (!("Notification" in window)) {
      return alert({
        message: t`This browser does not support desktop notification.`,
      });
    }
    const newVal = !getLocalItem("desktopNotification") || false;
    if (newVal) {
      const state = await Notification.requestPermission();
      if (state === "denied") {
        return alert({
          message: t`Desktop notification permission denied.`,
        });
      }

      notification?.close();
      notification = new Notification(t`Desktop Notifications Enabled`, {
        icon: "/logo.png",
      });
    }
    setLocalItem("desktopNotification", newVal);
    const cb = el.querySelector(".checkbox") as HTMLDivElement;
    cb.dataset.checked = newVal + "";
  };

  props.context.content.addEventListener(
    "click",
    async (e) => {
      const target = e.target as HTMLDivElement;

      const actionEl = target.closest("[data-action]") as HTMLDivElement;
      const action = actionEl.dataset.action;

      if (action === "toggle_desktop_notifications") {
        handleToggleDesktopNotifications();
      }
    },
    { signal: props.signal },
  );

  return el;
};

export { getStrings, notificationSettingsPage as create };

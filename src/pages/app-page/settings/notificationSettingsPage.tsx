import { t } from "@lingui/core/macro";

import { Checkbox } from "../../../components/checkbox";
import { alert } from "../../../components/modal";
import { SettingsBlock } from "../../../components/SettingsBlock";
import { getLocalItem, setLocalItem } from "../../../utils/localStorage";
import { playSoundByType } from "../../../utils/sounds";
import { type SettingsContext } from "./Settings";

import style from "./notificationSettingsPage.module.css";

const getStrings = () => ({
  desktopNotifications: t`Desktop Notifications`,
  sounds: t`Sounds`,
  volume: t`Volume`,
});

const notificationSettingsPage = (context: SettingsContext) => {
  const ac = new AbortController();
  const { signal } = ac;

  let el = (
    <div class={style.page}>
      <DesktopNotifications signal={signal} />
      <NotificationSound signal={signal} />
    </div>
  ) as HTMLDivElement;
  context.content.replaceChildren(el);

  const destroy = () => {
    ac.abort();

    context.content.replaceChildren();
  };
  return { destroy };
};

const DesktopNotifications = (props: { signal: AbortSignal }) => {
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

  el.addEventListener(
    "click",
    async (e) => {
      const target = e.target as HTMLDivElement;

      const actionEl = target.closest("[data-action]") as HTMLDivElement;
      if (!actionEl) return;
      const action = actionEl.dataset.action;

      if (action === "toggle_desktop_notifications") {
        handleToggleDesktopNotifications();
      }
    },
    { signal: props.signal },
  );

  return el;
};

const NotificationSound = (props: { signal: AbortSignal }) => {
  const strings = getStrings();

  const el = (
    <SettingsBlock.Group>
      <SettingsBlock.Root
        clickable
        hideArrow
        data-action="toggle_desktop_sounds"
      >
        <SettingsBlock.Icon name="notifications_active" />
        <SettingsBlock.Details
          title={strings.sounds}
          description={t`If the notification sounds are too annoying, you can disable them.`}
        />
        <Checkbox.Root
          class="checkbox"
          checked={getLocalItem("soundNotification")!}
        >
          <Checkbox.Box />
        </Checkbox.Root>
      </SettingsBlock.Root>
      <SettingsBlock.Root>
        <SettingsBlock.Icon name="brand_awareness" />
        <SettingsBlock.Details
          title={strings.volume}
          description={t`Change the volume of the notification sounds.`}
        />
        <input
          value={getLocalItem("soundNotificationVolume")!}
          type="range"
          id="notificationVolume"
          min={0}
          max={100}
        />
        <div class={style.volumeValue}>
          {getLocalItem("soundNotificationVolume")}
        </div>
      </SettingsBlock.Root>
    </SettingsBlock.Group>
  ) as HTMLDivElement;

  const handleToggleNotificationSounds = async () => {
    const newVal = !getLocalItem("soundNotification")!;
    setLocalItem("soundNotification", newVal);
    const cb = el.querySelector(".checkbox") as HTMLDivElement;
    cb.dataset.checked = newVal + "";
  };

  const volumeSlider = el.querySelector(
    "#notificationVolume",
  ) as HTMLInputElement;

  const volumeVal = el.querySelector(`.${style.volumeValue}`) as HTMLDivElement;

  volumeSlider.addEventListener(
    "input",
    () => {
      volumeVal.innerText = volumeSlider.value;
    },
    { signal: props.signal },
  );
  volumeSlider.addEventListener(
    "change",
    () => {
      setLocalItem("soundNotificationVolume", parseInt(volumeSlider.value));
      playSoundByType("MESSAGE");
    },
    { signal: props.signal },
  );

  el.addEventListener(
    "click",
    async (e) => {
      const target = e.target as HTMLDivElement;

      const actionEl = target.closest("[data-action]") as HTMLDivElement;
      if (!actionEl) return;
      const action = actionEl.dataset.action;

      if (action === "toggle_desktop_sounds") {
        handleToggleNotificationSounds();
      }
    },
    { signal: props.signal },
  );

  return el;
};

export { getStrings, notificationSettingsPage as create };

import { t } from "@lingui/core/macro";

import { getLocalItem } from "./localStorage";

export const Sound = [
  "mute",
  "default",
  "default-call-join",
  "default-call-leave",
  "a-sudden-appearance",
  "button",
  "ding",
  "infographic-pop",
  "jug-pop",
  "level-up",
  "marimba-bloop",
  "message",
  "minimal-pop",
  "multi-pop",
  "music-box",
  "plinkaphone",
  "soft-notice",
  "start",
  "system-notification",
  "the-notification-email",
] as const;

export const SoundTypeInfo = [
  {
    id: "MESSAGE",
    icon: "message",
    name: () => t`Messages`,
  },
  {
    id: "MESSAGE_MENTION",
    icon: "alternate_email",
    name: () => t`Mentions`,
  },
  {
    id: "REMINDER",
    icon: "event_available",
    name: () => t`Reminders`,
  },
  {
    id: "CALL_JOIN",
    icon: "call",
    name: () => t`Call Join`,
  },
  {
    id: "CALL_LEAVE",
    icon: "call_end",
    name: () => t`Call Leave`,
  },
] as const;

export type Sound = (typeof Sound)[number];

export type SoundType = (typeof SoundTypeInfo)[number]["id"];

export function playSoundByType(type: SoundType) {
  const types = getLocalItem("soundNotificationTypes")!;
  playSound(types[type]);
}

export function playSound(name: Sound = "default") {
  if (!navigator.userActivation.hasBeenActive) return;
  const audio = new Audio();

  if (name === "mute") return;
  audio.src = `/sounds/${name}.mp3`;
  audio.volume = getLocalItem("soundNotificationVolume")! / 100;
  audio.load();
  audio.play();
}

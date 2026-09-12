import { getLocalItem } from "./localStorage";

export const Sound = [
  "nerimity-mute",
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

export const SoundType = [
  "MESSAGE",
  "MESSAGE_MENTION",
  "REMINDER",
  "CALL_JOIN",
  "CALL_LEAVE",
] as const;

export type Sound = (typeof Sound)[number];

export type SoundType = (typeof SoundType)[number];

export function playSoundByType(type: SoundType) {
  const types = getLocalItem("soundNotificationTypes")!;
  playSound(types[type]);
}

export function playSound(name: Sound = "default") {
  if (!navigator.userActivation.hasBeenActive) return;
  const audio = new Audio();

  if (name === "nerimity-mute") return;
  audio.src = `/sounds/${name}.mp3`;
  audio.volume = getLocalItem("soundNotificationVolume")! / 100;
  audio.load();
  audio.play();
}

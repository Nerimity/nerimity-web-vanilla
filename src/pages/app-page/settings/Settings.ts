import { t } from "@lingui/core/macro";

import type { CropPoints } from "../../../components/ImageCropModal";
import * as accountSettingsPage from "./accountSettingsPage";
import * as badgeSettingsPage from "./badgeSettingsPage";
import * as notificationSettingsPage from "./notificationSettingsPage";
import * as privacySettingsPage from "./privacySettingsPage";
import * as profileSettingsPage from "./profileSettingsPage";
import * as sessionsSettingsPage from "./sessionsSettingsPage";

export interface Page {
  destroy: () => void;
}

export interface HeaderOverrides {
  username?: string;
  tag?: string;
  avatar?: {
    url: string;
    cropPoints?: CropPoints;
  };
  banner?: {
    url: string;
    cropPoints?: CropPoints;
  };
}

export interface SettingsContext {
  content: HTMLDivElement;
  overrideHeader: (override: HeaderOverrides) => void;
}

export interface Setting {
  id: string;
  icon: string;
  name: () => string;
  path: string;
  load: {
    create: (context: SettingsContext) => Page;
    getStrings: () => Record<string, string>;
  };
}

export const Settings: Setting[] = [
  {
    id: "account",
    icon: "account_circle",
    name: () => t`Account`,
    path: "/account",
    load: accountSettingsPage,
  },
  {
    id: "profile",
    icon: "person",
    name: () => t`Profile`,
    path: "/profile",
    load: profileSettingsPage,
  },
  {
    id: "sessions",
    icon: "data_loss_prevention",
    name: () => t`Sessions`,
    path: "/sessions",
    load: sessionsSettingsPage,
  },
  {
    id: "badges",
    icon: "award_star",
    name: () => t`Badges`,
    path: "/badges",
    load: badgeSettingsPage,
  },
  {
    id: "notifications",
    icon: "notification_settings",
    name: () => t`Notifications`,
    path: "/notifications",
    load: notificationSettingsPage,
  },
  {
    id: "privacy",
    icon: "shield",
    name: () => t`Privacy`,
    path: "/privacy",
    load: privacySettingsPage,
  },
];

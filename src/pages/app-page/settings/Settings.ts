import { t } from "@lingui/core/macro";

import * as accountSettingsPage from "./accountSettingsPage";

export interface Page {
  destroy: () => void;
}

export interface SettingsContext {
  content: HTMLDivElement;
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
    load: {
      create() {
        return { destroy() {} };
      },
      getStrings() {
        return {};
      },
    },
  },
];

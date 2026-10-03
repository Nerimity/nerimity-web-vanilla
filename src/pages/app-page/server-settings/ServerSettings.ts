import { t } from "@lingui/core/macro";

import type { CropPoints } from "../../../components/ImageCropModal";
import * as auditLogsServerSettingsPage from "./auditLogsServerSettingsPage";
import * as channelsServerSettingsPage from "./channelsServerSettingsPage";
import * as generalServerSettingsPage from "./generalServerSettingsPage";
import * as roleServerSettingsPage from "./roleServerSettingsPage";
import * as rolesServerSettingsPage from "./rolesServerSettingsPage";

export interface Page {
  destroy: () => void;
}

export interface ServerHeaderOverrides {
  name?: string;
  avatar?: {
    url: string;
    cropPoints?: CropPoints;
  };
  banner?: {
    url: string;
    cropPoints?: CropPoints;
  };
}

export interface ServerSettingsContext {
  content: HTMLDivElement;
  overrideHeader: (override: ServerHeaderOverrides) => void;
}

export interface ServerSetting {
  id: string;
  icon: string;
  name: () => string;
  path: string;
  hideFromDrawer?: boolean;
  pattern?: string;
  load: {
    create: (context: ServerSettingsContext) => Page;
    getStrings: () => Record<string, string>;
  };
}

export const ServerSettings: ServerSetting[] = [
  {
    id: "general",
    icon: "info",
    name: () => t`General`,
    path: "/general",
    load: generalServerSettingsPage,
  },
  {
    id: "audit-logs",
    icon: "search_activity",
    name: () => t`Audit Logs`,
    path: "/audit-logs",
    load: auditLogsServerSettingsPage,
  },
  {
    id: "roles",
    icon: "leaderboard",
    name: () => t`Roles`,
    path: "/roles",
    pattern: "/roles{/*}?",
    load: {
      ...rolesServerSettingsPage,
      getStrings() {
        return {
          ...rolesServerSettingsPage.getStrings(),
          ...roleServerSettingsPage.getStrings(),
        };
      },
    },
  },
  {
    id: "role",
    icon: "leaderboard",
    name: () => t`Role`,
    path: "/roles/:roleId",
    hideFromDrawer: true,
    load: roleServerSettingsPage,
  },
  {
    id: "channels",
    icon: "tag",
    name: () => t`Channels`,
    path: "/channels",
    pattern: "/channels{/*}?",
    load: channelsServerSettingsPage,
  },
];

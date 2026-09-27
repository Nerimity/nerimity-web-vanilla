import { t } from "@lingui/core/macro";

import type { CropPoints } from "../../../components/ImageCropModal";
import * as auditLogsServerSettingsPage from "./auditLogsServerSettingsPage";
import * as generalServerSettingsPage from "./generalServerSettingsPage";

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
];

import { ph, plural, t } from "@lingui/core/macro";

import { Button } from "../../../components/button";
import { Icon } from "../../../components/icon";
import { Notice } from "../../../components/Notice";
import { SettingsBlock } from "../../../components/SettingsBlock";
import {
  DeviceType,
  getSessions,
  type DeviceTypeId,
  type UserSession,
} from "../../../services/userService";
import { accountStore } from "../../../store/accountStore";
import { formatTimestamp } from "../../../utils/date";
import type { SettingsContext } from "./Settings";

import style from "./sessionsSettingsPage.module.css";

const getStrings = () => ({
  destroyAllSessions: t`Destroy All Sessions`,
});

const sessionsSettingsPage = (context: SettingsContext) => {
  const ac = new AbortController();
  const { signal } = ac;
  const strings = getStrings();

  let sessionsContainer = (
    <div class={style.sessionsContainer}></div>
  ) as HTMLDivElement;

  let sessionsCountContainer = (
    <div class={style.sessionCount}></div>
  ) as HTMLDivElement;

  let el = (
    <div class={style.page}>
      <SettingsBlock.Root>
        <SettingsBlock.Icon name="key_off" />
        <SettingsBlock.Details
          title={strings.destroyAllSessions}
          description={t`You will be logged out everywhere.`}
        />
        <Button
          icon="delete"
          primary
          alert
          label={strings.destroyAllSessions}
        />
      </SettingsBlock.Root>
      <Notice
        type="info"
        description={t`A new session is created each time you log in. Normally a session is tied to one device, additional devices usually mean your IP address changed or your account was compromised. Inactive sessions expire automatically after 3 months.`}
      />
      <div>
        {sessionsCountContainer}
        {sessionsContainer}
      </div>
    </div>
  ) as HTMLDivElement;

  context.content.replaceChildren(el);

  let sessions: UserSession[] = [];

  interface SessionGroup {
    id: string;
    sessions: UserSession[];
    lastSeen: number;
    devices: Set<DeviceTypeId>;
  }
  const deviceTypeToIcon = (deviceType: DeviceTypeId) => {
    switch (deviceType) {
      case DeviceType.Mobile:
        return "mobile";
      case DeviceType.Desktop:
        return "computer";
      default:
        return "globe";
    }
  };

  const groupedSessions = () => {
    const sortedSessions = sessions.sort((a, b) => b.lastSeenAt - a.lastSeenAt);

    const groupedSessions: SessionGroup[] = [];

    for (const session of sortedSessions) {
      const sessionId = session.sessionId;

      let group = groupedSessions.find((g) => g.id === sessionId);

      if (!group) {
        group = {
          id: sessionId,
          sessions: [],
          lastSeen: session.lastSeenAt,
          devices: new Set(),
        };
        groupedSessions.push(group);
      }
      group.devices.add(session.deviceType);

      group.sessions.push(session);
    }

    return groupedSessions;
  };

  const renderSessions = () => {
    if (signal.aborted) return;
    const grouped = groupedSessions();

    const count = grouped.length;

    sessionsCountContainer.textContent = plural(count, {
      0: "No sessions",
      one: "# session",
      other: "# sessions",
    });

    sessionsContainer.replaceChildren(
      <>
        {grouped.map((g) => (
          <SettingsBlock.Group data-sid={g.id}>
            <SettingsBlock.Root expandable>
              <SettingsBlock.Icon name="key" />
              <SettingsBlock.Details
                title={
                  <div class={style.sessionTitle}>
                    {g.id === accountStore.sessionId
                      ? t`Session (Current)`
                      : t`Session`}

                    {[...g.devices].map((d) => (
                      <Icon
                        title={deviceTypeToIcon(d)}
                        class={style.icon}
                        name={deviceTypeToIcon(d)}
                      />
                    ))}
                  </div>
                }
                description={t`${plural(g.sessions.length, {
                  0: "No devices",
                  one: "# device",
                  other: "# devices",
                })} ~ Last seen ${ph({ date: formatTimestamp(g.lastSeen) })}`}
              />
              <Button alert icon="key_off" label={t`Destroy`} />
            </SettingsBlock.Root>
          </SettingsBlock.Group>
        ))}
      </>,
    );
  };

  sessionsContainer.addEventListener(
    "click",
    (e) => {
      const target = e.target as HTMLDivElement;

      const button = target.closest(".button");
      if (button) return;

      const container = target.closest(".settingsBlock") as HTMLDivElement;
      if (!container) return;
      const group = target.closest(".settingsBlockGroup") as HTMLDivElement;
      const sessionId = group.dataset.sid;

      if (!sessionId) return;

      const dataset = container.dataset;
      const expanded = !(dataset.expanded === "true");
      dataset.expanded = String(expanded);

      if (!expanded) {
        [...group.children].slice(1).forEach((el) => el.remove());
      }

      const sessions = groupedSessions().find(
        (s) => s.id === sessionId,
      )?.sessions;

      if (!sessions?.length) return;

      if (expanded) {
        group.appendChild(
          <>
            {sessions.map((s) => (
              <SettingsBlock.Root>
                <SettingsBlock.Icon name={deviceTypeToIcon(s.deviceType)} />
                <SettingsBlock.Details
                  title={s.location || "Unknown"}
                  description={t`Last seen ${ph({ date: formatTimestamp(s.lastSeenAt) })}`}
                />
              </SettingsBlock.Root>
            ))}
          </>,
        );
      }
    },
    { signal },
  );

  (async () => {
    const [res] = await getSessions();
    if (!res) return;
    sessions = res;
    renderSessions();
  })();

  const destroy = () => {
    ac.abort();
    el.remove();
    (el as any) = null;
  };
  return { destroy };
};

export { getStrings, sessionsSettingsPage as create };

import { t } from "@lingui/core/macro";
import { Plural, Trans } from "@trans";

import { Icon } from "../../../components/icon";
import { Notice } from "../../../components/Notice";
import { SettingsBlock } from "../../../components/SettingsBlock";
import { Avatar } from "../../../components/ui/avatar";
import { Link } from "../../../components/ui/link";
import {
  getServerInvites,
  type ServerInvite,
} from "../../../services/serverService";
import { serverStore } from "../../../store/serverStore";
import { formatTimestamp } from "../../../utils/date";
import { closestFromEvent } from "../../../utils/dom";
import type { ServerSettingsContext } from "./ServerSettings";

import style from "./inviteSettingsPage.module.css";

const getStrings = () => ({});

const inviteSettingsPage = (context: ServerSettingsContext) => {
  const ac = new AbortController();
  const { signal } = ac;

  let el = (<div class={style.page}></div>) as HTMLDivElement;

  let invites: ServerInvite[] = [];

  const rerender = () => {
    const verified = serverStore.currentServer()?.verified;

    el.replaceChildren(
      <>
        {!verified && (
          <Notice
            type="info"
            description={t`Custom invite links are only available for verified servers.`}
          />
        )}
        <SettingsBlock.Root class={!verified && style.disabled}>
          <SettingsBlock.Icon name="mail" />
          <SettingsBlock.Details title={t`Custom Invite`} />
        </SettingsBlock.Root>
        <SettingsBlock.Group class="group">
          {invites.map((invite) => (
            <ServerInviteItem invite={invite} />
          ))}
        </SettingsBlock.Group>
      </>,
    );
  };

  rerender();

  getServerInvites(serverStore.currentServerId!).then(([res]) => {
    if (!res) return;
    invites = res.sort((a, b) => {
      if (a.isCustom && !b.isCustom) return -1;
      if (!a.isCustom && b.isCustom) return 1;

      return b.createdAt - a.createdAt;
    });
    rerender();
  });

  el.addEventListener(
    "click",
    async (event) => {
      const actionEl = closestFromEvent(event, "[data-action]");
      const action = actionEl?.dataset?.action;
      if (action === "create-role") {
      }
    },
    { signal },
  );

  context.content.replaceChildren(el);

  const destroy = () => {
    ac.abort();
    el.remove();
    (el as any) = null;
  };

  return { destroy };
};

const ServerInviteItem = (props: { invite: ServerInvite }) => {
  // const href = `https://nerimity.com/i/${props.invite.code}`;

  const creator = props.invite.createdBy;

  return (
    <SettingsBlock.Root>
      <Avatar user={creator} size={32} />
      <div class={style.outerDetails}>
        <div class={style.code}>
          <code>
            <span class={style.dim}>https://nerimity.com/i/</span>
            {props.invite.code}
          </code>
          <Icon class={style.copyIcon} name="content_copy" />
        </div>

        <div class={style.details}>
          <Icon name="person" />
          <Link href={`https://nerimity.com/app/profile/${creator.id}`}>
            {creator.username}
          </Link>
          <Icon name="person" />
          <Plural
            value={props.invite.uses}
            _0={
              <Trans>
                <span class={style.full}>No</span> Use
              </Trans>
            }

            one={
              <Trans>
                <span class={style.full}>#</span> Use
              </Trans>
            }
            other={
              <Trans>
                <span class={style.full}>#</span> uses
              </Trans>
            }
          />
          <Icon name="person" />
          <span>{formatTimestamp(props.invite.createdAt)}</span>
        </div>
      </div>
    </SettingsBlock.Root>
  );
};

export { getStrings, inviteSettingsPage as create };

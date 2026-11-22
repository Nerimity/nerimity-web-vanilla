import { plural, t } from "@lingui/core/macro";
import { Plural, Trans } from "@trans";

import { Icon } from "../../../components/icon";
import { Notice } from "../../../components/Notice";
import { SettingsBlock } from "../../../components/SettingsBlock";
import { Avatar } from "../../../components/ui/avatar";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Link } from "../../../components/ui/link";
import { alert } from "../../../components/ui/modal";
import {
  createServerCustomInvite,
  createServerInvite,
  deleteServerInvites,
  getServerInvites,
  type ServerInvite,
} from "../../../services/serverService";
import { accountStore } from "../../../store/accountStore";
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

  const getCustomInvite = () => invites.find((i) => i.isCustom);

  const rerender = () => {
    const verified = serverStore.currentServer()?.verified;

    const customInvite = getCustomInvite();

    const isCreator =
      serverStore.currentServer()?.createdById === accountStore.currentUser?.id;

    el.replaceChildren(
      <>
        {isCreator && (
          <>
            {!verified && (
              <Notice
                type="info"
                description={t`Custom invite links are only available for verified servers.`}
              />
            )}
            <SettingsBlock.Group class="group">
              <SettingsBlock.Root class={!verified && style.disabled}>
                <SettingsBlock.Icon name="mail" />
                <SettingsBlock.Details title={t`Custom Invite`} />
                <div class={style.createCustomInvite}>
                  <Input
                    class={style.customInviteInput}
                    value={customInvite?.code || ""}
                    placeholder="code"
                  />
                  <Button icon="save" data-action="update_custom_invite" />
                </div>
              </SettingsBlock.Root>
              {customInvite && <ServerInviteItem invite={customInvite!} />}
            </SettingsBlock.Group>
          </>
        )}
        <SettingsBlock.Group class="group">
          <SettingsBlock.Root>
            <SettingsBlock.Icon name="mail" />
            <SettingsBlock.Details
              title={t`Invites`}
              description={plural(invites.length, {
                0: "No invites",
                one: "# invite  ",
                other: "# invites",
              })}
            />
            <Button icon="add" label={t`Create`} data-action="create_invite" />
          </SettingsBlock.Root>

          {invites
            .filter((i) => !i.isCustom)
            .map((invite) => (
              <ServerInviteItem invite={invite} />
            ))}
        </SettingsBlock.Group>
      </>,
    );
  };

  getServerInvites(serverStore.currentServerId!).then(([res]) => {
    if (!res) return;
    invites = res.sort((a, b) => {
      return b.createdAt - a.createdAt;
    });
    rerender();
  });

  el.addEventListener(
    "click",
    async (event) => {
      const actionEl = closestFromEvent(event, "[data-action]");
      const action = actionEl?.dataset?.action;

      const inviteItem = closestFromEvent(event, `[data-invite-code]`);
      const inviteCode = inviteItem?.dataset.inviteCode;

      if (action === "update_custom_invite") {
        const inputEl = el.querySelector<HTMLInputElement>(
          `.${style.customInviteInput} input`,
        );
        const value = inputEl?.value.trim();
        if (!value) return;

        createServerCustomInvite(serverStore.currentServerId!, value).then(
          ([res, err]) => {
            if (err) {
              alert({ message: err.message });
              return;
            }
            const existingInvite = invites.find((i) => i.isCustom);
            if (existingInvite) {
              existingInvite.code = value;
            }
            const customInvite = {
              ...res,
              createdBy: accountStore.currentUser,
            };

            invites.unshift(customInvite as ServerInvite);
            rerender();
          },
        );
      }
      if (action === "create_invite") {
        createServerInvite(serverStore.currentServerId!).then(([res, err]) => {
          if (err) {
            alert({ message: err.message });
            return;
          }
          const customInvite = { ...res, createdBy: accountStore.currentUser };
          invites.unshift(customInvite as ServerInvite);
          rerender();
        });
      }
      if (action === "copy") {
        navigator.clipboard.writeText(`https://nerimity.com/i/${inviteCode}`);
        alert({ message: t`Copied to clipboard.`, alert: false });
      }
      if (action === "delete") {
        deleteServerInvites(serverStore.currentServerId!, inviteCode!).then(
          ([, err]) => {
            if (err) {
              alert({ message: err.message });
              return;
            }
            invites = invites.filter((i) => i.code !== inviteCode!);
            rerender();
          },
        );
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
  const creator = props.invite.createdBy;

  return (
    <SettingsBlock.Root data-invite-code={props.invite.code}>
      <Avatar user={creator} size={32} />
      <div class={style.outerDetails}>
        <div class={style.code}>
          <code>
            <span class={style.dim}>nerimity.com/i/</span>
            {props.invite.code}
          </code>
          <Icon class={style.copyIcon} data-action="copy" name="content_copy" />
        </div>

        <div class={style.details}>
          <div class={style.detail}>
            <Icon name="person" />
            <Link href={`https://nerimity.com/app/profile/${creator.id}`}>
              {creator.username}
            </Link>
          </div>
          <div class={style.detail}>
            <Icon name="login" />
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
          </div>
          <div class={style.detail}>
            <Icon name="event" />
            <span>{formatTimestamp(props.invite.createdAt)}</span>
          </div>
        </div>
      </div>
      <Button icon="delete" alert data-action="delete" />
    </SettingsBlock.Root>
  );
};

export { getStrings, inviteSettingsPage as create };

import { ph, t } from "@lingui/core/macro";
import { Trans } from "@trans";

import { accountStore } from "../store/accountStore";
import { formatTimestamp } from "../utils/date";
import { getLocalItem } from "../utils/localStorage";
import { logout } from "../utils/logout";
import { Button } from "./button";
import { createModal, Modal } from "./modal";

import style from "./createAuthErrorModal.module.css";

const AuthErrorModal = () => {
  const error = accountStore.authError;

  const hasToken = !!getLocalItem("userToken");

  const type = error?.data?.type;
  const suspended = type === "suspend";
  const ipBanned = type === "ip-ban";

  const label = (() => {
    if (suspended) return t`Suspended`;
    if (ipBanned) return t`IP Banned`;
    return t`Authentication Error`;
  })();

  const main = (() => {
    if (!hasToken) return t`Token not provided.`;
    if (suspended) return t`You are suspended.`;
    if (ipBanned) return `You are IP Banned.`;
    return error?.message;
  })();

  return (
    <Modal.Root ignoreBgClick>
      <Modal.Header icon="error" alert label={label} />
      <Modal.Body width="300px">
        <div class={style.main}>{main}</div>

        <div class={style.extra}>{suspended && <SuspendedBody />}</div>
        <div class={style.extra}>{ipBanned && <IpBanBody />}</div>
      </Modal.Body>
      <Modal.Footer>
        {hasToken && (
          <>
            <Button
              data-action="logout"
              icon="logout"
              alert
              hoverBorder
              label={t`Logout`}
            />
            <Button data-action="close" icon="check" label={t`Dismiss`} />
          </>
        )}
        {!hasToken && (
          <>
            <Button data-action="close" hoverBorder label={t`Dismiss`} />
            <Button
              data-action="login"
              icon="login"
              hoverBorder
              label={t`Login`}
            />
          </>
        )}
      </Modal.Footer>
    </Modal.Root>
  );
};

const IpBanBody = () => {
  const error = accountStore.authError;
  const data = error?.data;
  if (data?.type !== "ip-ban") return null;

  return (
    <div class={style.extraContainer}>
      <div>
        <Trans>
          <span class={style.dim}>Expires: </span>
          <span>
            {ph({
              date: data?.expire ? formatTimestamp(data.expire) : t`Never`,
            })}
          </span>
        </Trans>
      </div>
      <div
        class={style.notice}
      >{t`Someone with the same IP has been suspended from Nerimity. Your account is not affected.`}</div>
    </div>
  );
};
const SuspendedBody = () => {
  const error = accountStore.authError;
  const data = error?.data;
  if (data?.type !== "suspend") return null;

  return (
    <div class={style.extraContainer}>
      <div>
        <Trans>
          <span class={style.dim}>Reason: </span>
          <span>
            {ph({
              reason: data?.reason || t`Violating the Terms of Servie.`,
            })}
          </span>
        </Trans>
      </div>
      <div>
        <Trans>
          <span class={style.dim}>Expires: </span>
          <span>
            {ph({
              date: data?.expire ? formatTimestamp(data.expire) : t`Never`,
            })}
          </span>
        </Trans>
      </div>
      <div>
        <Trans>
          <span class={style.dim}>By: </span>
          <span>
            {ph({
              username: data?.by.username || t`Not Provided`,
            })}
          </span>
        </Trans>
      </div>
      {!data.expire && (
        <div
          class={style.notice}
        >{t`Your account and data will be deleted in 15 days.`}</div>
      )}
    </div>
  );
};

export const createAuthErrorModal = () => {
  const controller = new AbortController();
  const { signal } = controller;

  const modalEl = (<AuthErrorModal />) as HTMLDivElement;

  modalEl.addEventListener(
    "click",
    (event) => {
      const target = event.target as HTMLDivElement;
      const actionEl = target.closest("[data-action]") as HTMLDivElement;
      const action = actionEl?.dataset?.action;
      if (action === "close") return controller.abort();
      if (action === "login") return (location.href = "/login");
      if (action === "logout")
        return logout({ redirect: true, keepCache: false });
    },
    { signal },
  );

  createModal(() => modalEl, controller);
};

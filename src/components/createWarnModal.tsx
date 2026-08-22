import { ph, t } from "@lingui/core/macro";
import { Trans } from "@trans";

import { dismissNotice } from "../services/userService";
import { accountStore } from "../store/accountStore";
import type { RawNotice } from "../Types";
import { Button } from "./button";
import { createModal, Modal } from "./modal";

import style from "./createWarnModal.module.css";

const WarnModal = (props: { notice: RawNotice }) => {
  return (
    <Modal.Root ignoreBgClick>
      <Modal.Header icon="error" warn label={t`Warning`} />
      <Modal.Body width="300px">
        <div class={style.main}>{t`You have been warned.`}</div>

        <div class={style.extra}>
          <Body notice={props.notice} />
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button
          class={style.disabled}
          data-action="dismiss"
          warn
          icon="check"
          label={" "}
        />
      </Modal.Footer>
    </Modal.Root>
  );
};

const Body = ({ notice }: { notice: RawNotice }) => {
  return (
    <div class={style.extraContainer}>
      <div>
        <Trans>
          <span class={style.dim}>Reason: </span>
          <span>
            {ph({
              reason: notice?.content || t`Violating the Terms of Servie.`,
            })}
          </span>
        </Trans>
      </div>

      <div>
        <Trans>
          <span class={style.dim}>By: </span>
          <span>
            {ph({
              username: notice?.createdBy.username || t`Not Provided`,
            })}
          </span>
        </Trans>
      </div>
      <div
        class={style.notice}
      >{t`if you continue with this behavior, your account will be suspended.`}</div>
    </div>
  );
};

let controller: AbortController | undefined = undefined;

export const createWarnModal = () => {
  controller?.abort();
  const notice = accountStore.currentUser?.notices[0];
  if (!notice) return;

  controller = new AbortController();

  const { signal } = controller;

  const modalEl = (<WarnModal notice={notice} />) as HTMLDivElement;

  const dismissEl = modalEl.querySelector('[data-action="dismiss"] .label');

  let countdown = 11;

  const updateCountDownEl = () => {
    countdown--;
    if (!dismissEl) return;
    dismissEl.textContent = countdown
      ? t`Dismiss ~ ${ph({ countdown })}`
      : t`Dismiss`;
    if (countdown === 0) {
      dismissEl.parentElement?.classList.remove(style.disabled!);
      clearInterval(timerId);
    }
  };
  updateCountDownEl();

  const timerId = setInterval(() => {
    updateCountDownEl();
  }, 1000);

  signal.addEventListener(
    "abort",
    () => {
      clearInterval(timerId);
    },
    { once: true },
  );

  modalEl.addEventListener(
    "click",
    async (event) => {
      if (countdown !== 0) return;
      const target = event.target as HTMLDivElement;
      const actionEl = target.closest("[data-action]") as HTMLDivElement;
      const action = actionEl?.dataset?.action;
      if (action === "dismiss") {
        const currentUser = accountStore.currentUser;
        if (currentUser?.notices) {
          currentUser.notices = currentUser.notices.filter(
            (n) => n.id !== notice.id,
          );
        }
        createWarnModal();
        dismissNotice(notice.id);
      }
    },
    { signal },
  );

  createModal(() => modalEl, controller);
};

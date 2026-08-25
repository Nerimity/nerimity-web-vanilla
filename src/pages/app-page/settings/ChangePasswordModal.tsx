import { t } from "@lingui/core/macro";

import { Button } from "../../../components/button";
import { Input } from "../../../components/input";
import { createModal, Modal } from "../../../components/modal";
import { updateUser } from "../../../services/userService";
import { setLocalItem } from "../../../utils/localStorage";

import style from "./ChangePasswordModal.module.css";

export const createChangePasswordModal = () => {
  const abortController = new AbortController();

  const modal = (
    <Modal.Root ignoreBgClick>
      <Modal.Header label={t`Change Password`} icon="shield" />
      <Modal.Body width="280px">
        <div class={style.body}>
          <div class={style.details}>
            {t`You'll be logged out everywhere else.`}
          </div>
          <Input
            class={[style.currentPassword!, "current"]}
            label={t`Current Password`}
            type="password"
            placeholder="*******"
          />
          <Input
            class={"new"}
            label={t`New Password`}
            type="password"
            placeholder="*******"
          />
          <Input
            class={"newConfirm"}
            label={t`Confirm New Password`}
            type="password"
            placeholder="*******"
          />
        </div>
        <div class={style.error}></div>
      </Modal.Body>
      <Modal.Footer>
        <Button
          data-action="close"
          alert
          label={t`Don't Change`}
          icon="close"
          hoverBorder
        />
        <Button data-action="change" label={t`Change`} icon="check" primary />
      </Modal.Footer>
    </Modal.Root>
  ) as HTMLDivElement;

  const inputValue = (selector: string) => {
    return (modal.querySelector(selector + " input") as HTMLInputElement).value;
  };

  const setError = (val?: string) => {
    const el = modal.querySelector(`.${style.error}`) as HTMLDivElement;
    el.style.display = val ? "flex" : "none";
    el.textContent = val || "";
  };

  let changing = false;
  modal.addEventListener(
    "click",
    async (event) => {
      const target = event.target as HTMLElement;
      const button = target.closest(`[data-action]`) as HTMLElement;
      if (!button) return;

      if (button.dataset.action === "change") {
        const btnLabel = button.querySelector(".label") as HTMLDivElement;
        const currentPwd = inputValue(".current");
        const newPwd = inputValue(".new");
        const newConfirmPwd = inputValue(".newConfirm");
        if (!currentPwd || !newPwd || !newConfirmPwd) {
          setError(t`All fields must be filled`);
          return;
        }
        if (newPwd !== newConfirmPwd) {
          setError(t`Passwords don't match`);
          return;
        }
        if (changing) return;
        changing = true;
        setError();
        btnLabel.textContent = t`Changing...`;

        const [res, error] = await updateUser({
          password: currentPwd,
          newPassword: newPwd,
        });
        changing = false;
        btnLabel.textContent = t`Change`;
        if (error) {
          setError(error.message);
          return;
        }
        if (res.newToken) {
          setLocalItem("userToken", res.newToken);
          setTimeout(() => {
            location.reload();
          }, 1000);
        }
        abortController.abort();
      }
      if (button.dataset.action === "close") {
        abortController.abort();
      }
    },
    { signal: abortController.signal },
  );

  createModal(() => {
    return modal;
  }, abortController);
};

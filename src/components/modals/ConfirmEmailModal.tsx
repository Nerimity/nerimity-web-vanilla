import { t } from "@lingui/core/macro";

import {
  sendEmailConfirmCode,
  verifyEmailConfirmCode,
} from "../../services/userService";
import { closestFromEvent } from "../../utils/dom";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { createModal, Modal } from "../ui/modal";
import { createStatusMessage } from "../ui/StatusMessage";

import style from "./ConfirmEmailModal.module.css";

export const createConfirmEmailModal = (props: { onConfirm: () => void }) => {
  const abortController = new AbortController();
  const { signal } = abortController;

  const body = (<Modal.Body width="400px"></Modal.Body>) as HTMLDivElement;

  let inputs: HTMLDivElement[] = [];

  const getCode = () =>
    inputs
      .map((input) => (input.querySelector("input") as HTMLInputElement).value)
      .join("");

  let length = 5;

  for (let i = 0; i < length; i++) {
    const inputContainer = (
      <Input
        data-index={i}
        autocomplete={i === 0 ? "one-time-code" : "off"}
        class={style.codeInput}
        maxLength={1}
      />
    ) as HTMLDivElement;

    const inputEl = inputContainer.querySelector("input")!;

    inputEl.addEventListener(
      "focus",
      () => {
        inputEl.select();
      },
      { signal },
    );
    inputEl.addEventListener(
      "input",
      () => {
        inputEl.value = inputEl.value.replace(/\D/g, "").slice(-1);
        if (inputEl.value && i < length - 1) {
          const nextInput = inputs[i + 1]?.querySelector("input");
          nextInput?.focus();
        }
      },
      { signal },
    );

    inputEl.addEventListener(
      "paste",
      (e) => {
        const pastedDigits = e.clipboardData
          ?.getData("text")
          .replace(/\D/g, "");
        if (!pastedDigits) return;

        e.preventDefault();
        const digits = pastedDigits.slice(0, length - i);
        for (let offset = 0; offset < digits.length; offset++) {
          const targetInput = inputs[i + offset]?.querySelector("input");
          if (targetInput) targetInput.value = digits[offset]!;
        }

        const focusIndex = Math.min(i + digits.length, length - 1);
        const focusInput = inputs[focusIndex]?.querySelector("input");
        focusInput?.focus();
        focusInput?.select();
      },
      { signal },
    );

    inputEl.addEventListener(
      "keydown",
      (e) => {
        const prevInput = inputs[i - 1]?.querySelector("input");
        const nextInput = inputs[i + 1]?.querySelector("input");
        if (e.key === "Backspace" && !inputEl.value && i > 0) {
          e.preventDefault();
          if (prevInput) {
            prevInput.value = "";
            prevInput.focus();
          }
        }
        if (e.key === "ArrowLeft" && i > 0 && prevInput) {
          e.preventDefault();
          prevInput.focus();
          prevInput.select();
        }
        if (e.key === "ArrowRight" && i < length - 1 && nextInput) {
          e.preventDefault();
          nextInput.focus();
          nextInput.select();
        }
      },
      { signal },
    );

    inputs.push(inputContainer);
  }

  const statusMessage = createStatusMessage();
  statusMessage.set(t`Code Sending...`, "normal");
  body.replaceChildren(
    <div class={style.body}>
      <span
        class={style.message}
      >{t`Enter the 5 digit code from your email.`}</span>
      <div class={style.codeContainer}>{inputs}</div>
      {statusMessage.element}
    </div>,
  );

  const codeSentTimeout = setTimeout(async () => {
    const [_, error] = await sendEmailConfirmCode();
    if (signal.aborted) return;
    if (error) {
      statusMessage.set(error.message, "error");
      return;
    }
    statusMessage.set(t`Code Sent!`, "success");
  }, 2000);

  const modal = (
    <Modal.Root disableGestures ignoreBgClick>
      <Modal.Header label={t`Confirm Email`} icon="email" />
      {body}
      <Modal.Footer>
        <Button
          class="button"
          data-action="close"
          alert
          label={t`Don't Confirm`}
          hoverBorder
        />
        <Button
          data-action="confirm"
          class="button"
          icon="logout"
          label={t`Confirm`}
          primary
        />
      </Modal.Footer>
    </Modal.Root>
  ) as HTMLDivElement;

  let requesting = false;

  const handleConfirm = async (button: HTMLElement) => {
    if (requesting) return;
    const label = button?.querySelector(".label")!;
    requesting = true;
    label.textContent = t`Confirming...`;

    const [, error] = await verifyEmailConfirmCode(getCode());
    label.textContent = t`Confirm`;

    if (error) {
      requesting = false;
      statusMessage.set(error.message, "error");
      return;
    }

    statusMessage.set(t`Email Confirmed!`, "success");
    props.onConfirm();
    setTimeout(() => {
      abortController.abort();
    }, 1000);
  };

  modal.addEventListener(
    "click",
    async (e) => {
      const button = closestFromEvent(e, ".button");
      const action = button?.dataset.action;
      if (action === "confirm") {
        handleConfirm(button!);
        return;
      }
      if (action === "close") {
        abortController.abort();
      }
    },
    { signal },
  );

  abortController.signal.addEventListener("abort", () => {
    clearTimeout(codeSentTimeout);
  });

  createModal(() => {
    return modal;
  }, abortController);
};

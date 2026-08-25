import { t } from "@lingui/core/macro";

import { Button } from "../button";

import style from "./SettingsActions.module.css";

export const createSettingsActions = (props: { signal: AbortSignal }) => {
  let errorEl = (
    <div class={style.error} style={{ display: "none" }}>
      Error
    </div>
  ) as HTMLDivElement;
  let el = (
    <div class={[style.container, style.hide]}>
      <div class={style.innerContainer}>
        {errorEl}
        <div class={style.buttons}>
          <Button
            data-action="undo"
            alert
            label={t`Undo`}
            icon="undo"
            hoverBorder
          />
          <Button data-action="save" primary label={t`Save`} icon="save" />
        </div>
      </div>
    </div>
  ) as HTMLDivElement;

  let savePending = false;

  const setError = (message?: string) => {
    errorEl.style.display = message ? "flex" : "none";
    errorEl.textContent = message || "";
    el.classList.toggle(style.hasError!, !!message);

    const buttonLabel = el.querySelector(
      `[data-action="save"] .label`,
    ) as HTMLDivElement;

    buttonLabel.textContent = t`Save`;
  };

  let saveHandlerCb: ((done: (error?: string) => void) => void) | undefined =
    undefined;
  let undoHandlerCb: (() => void) | undefined = undefined;

  const handleSaveClick = (cb: typeof saveHandlerCb) => {
    saveHandlerCb = cb;
  };

  el.addEventListener(
    "click",
    (event) => {
      const target = event.target as HTMLDivElement;
      const button = target.closest("[data-action]") as HTMLDivElement;
      if (!button) return;
      const action = button.dataset.action as "undo" | "save";
      if (action === "save") {
        if (savePending) return;
        savePending = true;
        setError();
        button.querySelector(".label")!.textContent = t`Saving...`;
        saveHandlerCb?.((err) => {
          savePending = false;
          setError(err);
        });
      }
      if (action === "undo") {
        if (savePending) return;
        undoHandlerCb?.();
      }
    },
    { signal: props.signal },
  );

  const handleUndoClick = (cb: () => void) => {
    undoHandlerCb = cb;
  };

  const setVisibility = (visibility: boolean) => {
    el.classList.toggle(style.hide!, !visibility);
  };

  props.signal.addEventListener(
    "abort",
    () => {
      console.log("uuf");
      errorEl.remove();
      el.remove();
      (errorEl as any) = null;
      (el as any) = null;
      saveHandlerCb = undefined;
      undoHandlerCb = undefined;
    },
    { once: true },
  );

  return {
    get el() {
      return el;
    },
    setVisibility,
    handleSaveClick,
    handleUndoClick,
  };
};

import { t } from "@lingui/core/macro";

import { Button } from "../../../components/button";
import { Input } from "../../../components/input";
import { createSettingsActions } from "../../../components/settings-actions/SettingsActions";
import { SettingsBlock } from "../../../components/SettingsBlock";
import { accountStore } from "../../../store/accountStore";
import { createUpdatedHandler } from "../../../utils/createUpdatedHandler";
import type { SettingsContext } from "./Settings";

import style from "./accountSettingsPage.module.css";

const getStrings = () => ({
  email: t`Email`,
  username: t`Username`,
  tag: t`Tag`,
});

const accountSettingsPage = (context: SettingsContext) => {
  const ac = new AbortController();
  const { signal } = ac;
  const strings = getStrings();

  const currentUser = accountStore.currentUser;

  const initialValues = () => ({
    email: currentUser?.email || "",
    username: currentUser?.username || "",
    tag: currentUser?.tag || "",
  });

  const actions = createSettingsActions({ signal });

  const updateHandler = createUpdatedHandler(initialValues, signal);

  const hiddenEmail = () => {
    const user = accountStore.currentUser;

    if (!user?.email) return "";
    const emailSplit = user.email.split("@");

    const asterisks = emailSplit?.[0]
      ?.split("")
      .map(() => "*")
      .join("");
    return `${asterisks}@${emailSplit?.[1]}`;
  };

  let emailRevealed = false;
  const el = (
    <div class={style.page}>
      {/* Email */}
      <SettingsBlock.Root>
        <SettingsBlock.Icon name="email" />
        <SettingsBlock.Details title={strings.email} />
        <Input
          class="emailInput"
          value={hiddenEmail()}
          suffix={<Button class={style.editEmailButton} icon="edit" />}
        />
      </SettingsBlock.Root>

      {/* Username */}
      <SettingsBlock.Root>
        <SettingsBlock.Icon name="face" />
        <SettingsBlock.Details title={strings.username} />
        <Input class="usernameInput" value={initialValues().username} />
      </SettingsBlock.Root>

      {/* Tag */}
      <SettingsBlock.Root>
        <SettingsBlock.Icon name="face" />
        <SettingsBlock.Details title={strings.tag} />
        <Input
          maxLength={4}
          class={style.tagInput}
          value={initialValues().tag}
        />
      </SettingsBlock.Root>
      {actions.el}
    </div>
  ) as HTMLDivElement;

  const emailInput = el.querySelector(".emailInput") as HTMLDivElement;

  emailInput?.addEventListener(
    "click",
    () => {
      if (emailRevealed) return;
      emailRevealed = true;
      emailInput.querySelector("button")?.remove();
      emailInput.querySelector("input")!.value =
        accountStore.currentUser?.email || "";
    },
    { signal },
  );

  updateHandler.handleInput(emailInput, "email");
  updateHandler.handleInput(el.querySelector(".usernameInput")!, "username");
  updateHandler.handleInput(el.querySelector(`.${style.tagInput}`)!, "tag");

  updateHandler.onUpdate((_, hasChanges) => {
    actions.setVisibility(hasChanges);
  });

  actions.handleUndoClick(updateHandler.undo);

  actions.handleSaveClick((done) => {
    // await ...

    setTimeout(() => {
      done("no");
    }, 1000);
  });

  context.content.replaceChildren(el);

  const destroy = () => {
    ac.abort();
    el.remove();
  };

  return { destroy };
};

export { getStrings, accountSettingsPage as create };

import { t } from "@lingui/core/macro";

import { Button } from "../../../components/button";
import { createFileInput } from "../../../components/FileInput";
import {
  createImageCropModal,
  type CropPoints,
} from "../../../components/ImageCropModal";
import { Input } from "../../../components/input";
import { createSettingsActions } from "../../../components/settings-actions/SettingsActions";
import { SettingsBlock } from "../../../components/SettingsBlock";
import { accountStore } from "../../../store/accountStore";
import { createUpdatedHandler } from "../../../utils/createUpdatedHandler";
import { fileToDataUrl } from "../../../utils/file";
import type { SettingsContext } from "./Settings";

import style from "./accountSettingsPage.module.css";

const getStrings = () => ({
  email: t`Email`,
  username: t`Username`,
  tag: t`Tag`,
  avatar: t`Avatar`,
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

    avatar: null as null | string,
    avatarCropPoints: null as null | CropPoints,
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

      {/* Avatar */}
      <SettingsBlock.Root>
        <SettingsBlock.Icon name="image" />
        <SettingsBlock.Details title={strings.avatar} />
        <Button
          data-action="browseAvatar"
          icon="attach_file"
          label={t`Browse`}
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

  updateHandler.onUpdate((changes, hasChanges) => {
    context.overrideHeader({
      username: changes.username,
      tag: changes.tag,
      ...(changes.avatar
        ? {
            avatar: {
              url: changes.avatar,
              cropPoints: changes.avatarCropPoints || undefined,
            },
          }
        : { avatar: undefined }),
    });

    actions.setVisibility(hasChanges);
  });

  actions.handleUndoClick(updateHandler.undo);

  actions.handleSaveClick((done) => {
    // await ...

    setTimeout(() => {
      done("no");
    }, 1000);
  });

  const fileInput = createFileInput({
    signal,
    imageOnly: true,
    async onChange(file) {
      const url = file && (await fileToDataUrl(file));
      updateHandler.changeValue("avatar", url || null);

      if (!url) return;
      createImageCropModal({
        src: url,
        type: "avatar",
        onCrop(points) {
          updateHandler.changeValue("avatarCropPoints", points);
        },
      });
    },
  });

  el.addEventListener(
    "click",
    (event) => {
      const target = event.target as HTMLDivElement;
      const button = target.closest("[data-action]") as HTMLDivElement;
      if (!button) return;
      const action = button.dataset.action;
      if (action === "browseAvatar") {
        fileInput.trigger();
      }
    },
    { signal },
  );

  context.content.replaceChildren(el);

  const destroy = () => {
    ac.abort();
    el.remove();
  };

  return { destroy };
};

export { getStrings, accountSettingsPage as create };

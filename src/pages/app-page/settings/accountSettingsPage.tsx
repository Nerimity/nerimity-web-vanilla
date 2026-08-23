import { t } from "@lingui/core/macro";

import { Button } from "../../../components/button";
import { createFileInput } from "../../../components/FileInput";
import type { CropPoints } from "../../../components/ImageCropModal";
import { createImageCropModalLazy } from "../../../components/ImageCropModalLazy";
import { Input } from "../../../components/input";
import { createSettingsActions } from "../../../components/settings-actions/SettingsActions";
import { SettingsBlock } from "../../../components/SettingsBlock";
import { nerimityCDNUploadRequest } from "../../../services/cdnService";
import { updateUser } from "../../../services/userService";
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
  banner: t`Banner`,
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

    avatar: null as null | { file: File; url: string },
    avatarCropPoints: null as null | CropPoints,

    banner: null as null | { file: File; url: string },
    bannerCropPoints: null as null | CropPoints,
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
        <SettingsBlock.Icon name="sell" />
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

      {/* Banner */}
      <SettingsBlock.Root>
        <SettingsBlock.Icon name="panorama" />
        <SettingsBlock.Details title={strings.banner} />
        <Button
          data-action="browseBanner"
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
              url: changes.avatar.url,
              cropPoints: changes.avatarCropPoints || undefined,
            },
          }
        : { avatar: undefined }),
      ...(changes.banner
        ? {
            banner: {
              url: changes.banner.url,
              cropPoints: changes.bannerCropPoints || undefined,
            },
          }
        : { banner: undefined }),
    });

    actions.setVisibility(hasChanges);
  });

  actions.handleUndoClick(updateHandler.undo);

  actions.handleSaveClick(async (done) => {
    const { avatar, avatarCropPoints, banner, bannerCropPoints, ...updates } =
      updateHandler.changedValues;
    const userId = accountStore.currentUser?.id!;

    const passwordRequired = updates.email || updates.username || updates.tag;

    if (passwordRequired) {
      done("TODO: password verification modal not implemented :(");
      return;
    }

    let avatarId: string | undefined = undefined;
    let bannerId: string | undefined = undefined;

    if (avatar) {
      const [avatarRes, error] = await nerimityCDNUploadRequest({
        type: "avatars",
        groupId: userId,
        file: avatar.file,
        points: avatarCropPoints!,
      });
      if (error) {
        return done("Avatar upload failed: " + error.message);
      }
      avatarId = avatarRes?.fileId!;
    }
    if (banner) {
      const [bannerRes, error] = await nerimityCDNUploadRequest({
        type: "profile_banners",
        groupId: userId,
        file: banner.file,
        points: bannerCropPoints!,
      });
      if (error) {
        return done("Banner upload failed: " + error.message);
      }
      bannerId = bannerRes?.fileId!;
    }

    const body = {
      ...updates,
      bannerId,
      avatarId,
    };

    const [res, error] = await updateUser(body);
    if (error) {
      return done("Banner upload failed: " + error.message);
    }
    console.log(res);
  });

  let fileInputType: "avatar" | "banner" | null = null;
  const fileInput = createFileInput({
    signal,
    imageOnly: true,
    async onChange(file) {
      const url = file && (await fileToDataUrl(file));
      updateHandler.changeValue(fileInputType!, url ? { file, url } : null);

      if (!url) return;
      await createImageCropModalLazy({
        src: url,
        type: fileInputType!,
        onDiscard() {
          updateHandler.changeValue(fileInputType!, undefined);
          updateHandler.changeValue(`${fileInputType!}CropPoints`, undefined);
        },
        onCrop(points) {
          updateHandler.changeValue(`${fileInputType!}CropPoints`, points);
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
        fileInputType = "avatar";
        fileInput.trigger();
      }
      if (action === "browseBanner") {
        fileInputType = "banner";
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

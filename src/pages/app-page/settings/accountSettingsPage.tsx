import { t } from "@lingui/core/macro";

import { createFileInput } from "../../../components/FileInput";
import { createConfirmEmailModal } from "../../../components/modals/ConfirmEmailModal";
import { createConfirmPasswordModal } from "../../../components/modals/ConfirmPasswordModal";
import { createSettingsActions } from "../../../components/settings-actions/SettingsActions";
import { SettingsBlock } from "../../../components/SettingsBlock";
import { Button } from "../../../components/ui/button";
import type { CropPoints } from "../../../components/ui/ImageCropModal";
import { createImageCropModalLazy } from "../../../components/ui/ImageCropModalLazy";
import { Input } from "../../../components/ui/input";
import { alert } from "../../../components/ui/modal";
import { MAX_IMAGE_UPLOAD_SIZE } from "../../../config";
import { nerimityCDNUploadRequest } from "../../../services/cdnService";
import { postResetPassword, updateUser } from "../../../services/userService";
import { accountStore, type CurrentUser } from "../../../store/accountStore";
import { userStore } from "../../../store/userStore";
import { createUpdatedHandler } from "../../../utils/createUpdatedHandler";
import { closestFromEvent } from "../../../utils/dom";
import { fileToDataUrl } from "../../../utils/file";
import { createChangePasswordModal } from "./ChangePasswordModal";
import { createDeleteAccountModal } from "./DeleteAccountModal";
import type { SettingsContext } from "./Settings";
import { createUpdateDMNoticeModal } from "./UpdateDMNoticeModal";

import style from "./accountSettingsPage.module.css";

const getStrings = () => ({
  email: t`Email`,
  username: t`Username`,
  tag: t`Tag`,
  avatar: t`Avatar`,
  banner: t`Banner`,
  changePassword: t`Change Password`,
  forgotPassword: t`Forgot Password`,
  dmNotice: t`DM Notice`,
  deleteAccount: t`Delete Account`,
});

const accountSettingsPage = (context: SettingsContext) => {
  const ac = new AbortController();
  const { signal } = ac;
  const strings = getStrings();

  const initialValues = () => {
    const currentUser = accountStore.currentUser;
    return {
      email: currentUser?.email || "",
      username: currentUser?.username || "",
      tag: currentUser?.tag || "",

      avatar: null as null | { file: File; url: string },
      avatarCropPoints: null as null | CropPoints,

      banner: null as null | { file: File; url: string },
      bannerCropPoints: null as null | CropPoints,
    };
  };

  const actions = createSettingsActions({ signal });

  const updateHandler = createUpdatedHandler(initialValues, signal);

  const hiddenEmail = () => {
    const user = accountStore.currentUser;

    if (!user?.email) return "";
    const emailSplit = user.email.split("@");

    return `***@${emailSplit?.[1]}`;
  };
  let emailRevealed = false;

  const EmailGroup = () => (
    <SettingsBlock.Group>
      {!accountStore.currentUser?.emailConfirmed && (
        <SettingsBlock.Root
          class={style.confirmEmailBlock}
          clickable
          data-action="confirm-email"
        >
          <SettingsBlock.Icon name="warning" alert />
          <SettingsBlock.Details
            title={t`Confirm your email`}
            description={t`We'll send you a link to verify your address.`}
          />
        </SettingsBlock.Root>
      )}
      {/* Email */}
      <SettingsBlock.Root>
        <SettingsBlock.Icon name="email" />
        <SettingsBlock.Details title={strings.email} />
        <Input
          id="emailInput"
          class="emailInput"
          value={
            emailRevealed
              ? (accountStore.currentUser?.email ?? "")
              : hiddenEmail()
          }
          suffix={<Button class={style.editEmailButton} icon="edit" />}
        />
      </SettingsBlock.Root>
    </SettingsBlock.Group>
  );

  const emailContainer = (<div></div>) as HTMLDivElement;

  const rerenderEmailContainer = () => {
    emailContainer.replaceChildren(<EmailGroup />);
  };

  rerenderEmailContainer();

  let el = (
    <div class={style.page}>
      {emailContainer}
      <SettingsBlock.Group>
        {/* Username */}
        <SettingsBlock.Root>
          <SettingsBlock.Icon name="face" />
          <SettingsBlock.Details title={strings.username} />
          <Input
            id="usernameInput"
            class="usernameInput"
            value={initialValues().username}
          />
        </SettingsBlock.Root>

        {/* Tag */}
        <SettingsBlock.Root>
          <SettingsBlock.Icon name="sell" />
          <SettingsBlock.Details title={strings.tag} />
          <Input
            id="tagInput"
            maxLength={4}
            class={style.tagInput}
            value={initialValues().tag}
          />
        </SettingsBlock.Root>
      </SettingsBlock.Group>

      <SettingsBlock.Group>
        {/* Avatar */}
        <SettingsBlock.Root>
          <SettingsBlock.Icon name="wallpaper" />
          <SettingsBlock.Details
            title={strings.avatar}
            description="JPG, PNG, GIF or WEBP. Max 12MB"
          />
          <Button
            data-action="browseAvatar"
            icon="attach_file"
            label={t`Browse`}
          />
        </SettingsBlock.Root>

        {/* Banner */}
        <SettingsBlock.Root>
          <SettingsBlock.Icon name="panorama" />
          <SettingsBlock.Details
            title={strings.banner}
            description="JPG, PNG, GIF or WEBP. Max 12MB"
          />
          <Button
            data-action="browseBanner"
            icon="attach_file"
            label={t`Browse`}
          />
        </SettingsBlock.Root>
      </SettingsBlock.Group>

      <SettingsBlock.Group>
        {/* Change Password */}
        <SettingsBlock.Root clickable data-action="change-password">
          <SettingsBlock.Icon name="password" />
          <SettingsBlock.Details
            title={strings.changePassword}
            description="You'll need to enter your current password to set a new one."
          />
        </SettingsBlock.Root>

        <SettingsBlock.Root clickable data-action="forgor">
          <SettingsBlock.Icon name="cognition" />
          <SettingsBlock.Details
            title={strings.forgotPassword}
            description={t`Send a password reset link to your email.`}
          />
        </SettingsBlock.Root>
      </SettingsBlock.Group>

      <SettingsBlock.Root clickable data-action="update-dm-notice">
        <SettingsBlock.Icon name="info" />
        <SettingsBlock.Details
          title={strings.dmNotice}
          description={t`Show a notice when a user DMs you for the first time.`}
        />
      </SettingsBlock.Root>

      <SettingsBlock.Root href="/app/settings/profile">
        <SettingsBlock.Icon name="person" />
        <SettingsBlock.Details
          title={t`Profile`}
          description={t`Customize your profile bio, colors and more.`}
        />
      </SettingsBlock.Root>

      <div class={style.separator}></div>

      <SettingsBlock.Root data-action="delete-account" clickable>
        <SettingsBlock.Icon name="delete" alert />
        <SettingsBlock.Details
          title={strings.deleteAccount}
          description={t`Permanently delete your account and all associated data.`}
        />
      </SettingsBlock.Root>
      {actions.el}
    </div>
  ) as HTMLDivElement;

  let getEmailInput = () => el.querySelector(".emailInput") as HTMLDivElement;

  const revealEmail = () => {
    if (emailRevealed) return;
    emailRevealed = true;
    getEmailInput().querySelector("button")?.remove();
    getEmailInput().querySelector("input")!.value =
      accountStore.currentUser?.email || "";
  };

  emailContainer.addEventListener(
    "click",
    (event) => {
      if (
        event.target instanceof Element &&
        event.target.closest(".emailInput")
      ) {
        revealEmail();
      }
    },
    { signal },
  );
  emailContainer.addEventListener(
    "focusin",
    (event) => {
      if (
        event.target instanceof HTMLInputElement &&
        event.target.closest(".emailInput")
      ) {
        revealEmail();
      }
    },
    { signal },
  );

  emailContainer.addEventListener(
    "input",
    (event) => {
      if (
        event.target instanceof HTMLInputElement &&
        event.target.closest(".emailInput")
      ) {
        updateHandler.changeValue("email", event.target.value);
      }
    },
    { signal },
  );
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

  actions.handleUndoClick(() => {
    updateHandler.undo();
    getEmailInput().querySelector("input")!.value = emailRevealed
      ? (accountStore.currentUser?.email ?? "")
      : hiddenEmail();
  });

  const handleSave = async (
    done: (msg?: string) => void,
    password?: string,
  ) => {
    const { avatar, avatarCropPoints, banner, bannerCropPoints, ...updates } =
      updateHandler.changedValues;

    const userId = accountStore.currentUser?.id!;

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
      password,
    };

    const [res, error] = await updateUser(body);
    if (error) {
      return done(error.message);
    }

    userStore.users.get(userId)?.update({
      ...res.user,
      ...(updates.email ? { email: updates.email, emailConfirmed: false } : {}),
    });
    done();
    updateHandler.undo();
    rerenderEmailContainer();
  };

  actions.handleSaveClick(async (done) => {
    const updates = updateHandler.changedValues;

    const passwordRequired = updates.email || updates.username || updates.tag;

    if (passwordRequired) {
      createConfirmPasswordModal({
        onConfirm(password) {
          if (password === undefined) return done();
          handleSave(done, password);
        },
      });
      return;
    }
    handleSave(done);
  });

  let fileInputType: "avatar" | "banner" | null = null;
  const fileInput = createFileInput({
    signal,
    imageOnly: true,
    maxSize: MAX_IMAGE_UPLOAD_SIZE,
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

  let requestingForgotPassword = false;
  const handleForgotPassword = async () => {
    if (requestingForgotPassword) return;
    requestingForgotPassword = true;

    const [, error] = await postResetPassword(accountStore.currentUser?.email!);
    requestingForgotPassword = false;
    if (error) {
      alert({ message: error.message });
      return;
    }

    alert({
      icon: "skull",
      alert: false,
      title: t`Forgot Password`,
      message: t`Email Sent. Please check your email to reset your password.`,
    });
  };

  el.addEventListener(
    "click",
    (event) => {
      const button = closestFromEvent(event, "[data-action]");
      if (!button) return;
      const action = button.dataset.action;

      if (action === "confirm-email") {
        createConfirmEmailModal({
          onConfirm() {
            userStore.users
              .get(accountStore.currentUser!.id)
              ?.update<CurrentUser>({
                emailConfirmed: true,
              });
            rerenderEmailContainer();
          },
        });
      }

      if (action === "browseAvatar") {
        fileInputType = "avatar";
        fileInput.trigger();
      }
      if (action === "browseBanner") {
        fileInputType = "banner";
        fileInput.trigger();
      }

      if (action === "forgor") {
        handleForgotPassword();
      }

      if (action === "change-password") {
        createChangePasswordModal();
      }
      if (action === "update-dm-notice") {
        createUpdateDMNoticeModal();
      }
      if (action === "delete-account") {
        createDeleteAccountModal();
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

export { getStrings, accountSettingsPage as create };

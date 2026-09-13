import { t } from "@lingui/core/macro";

import { Button } from "../../../components/button";
import { createFileInput } from "../../../components/FileInput";
import type { CropPoints } from "../../../components/ImageCropModal";
import { createImageCropModalLazy } from "../../../components/ImageCropModalLazy";
import { Input } from "../../../components/input";
import { createSettingsActions } from "../../../components/settings-actions/SettingsActions";
import { SettingsBlock } from "../../../components/SettingsBlock";
import { MAX_IMAGE_UPLOAD_SIZE } from "../../../config";
import { nerimityCDNUploadRequest } from "../../../services/cdnService";
import { updateUser } from "../../../services/userService";
import { accountStore } from "../../../store/accountStore";
import { serverStore } from "../../../store/serverStore";
import { userStore } from "../../../store/userStore";
import { createUpdatedHandler } from "../../../utils/createUpdatedHandler";
import { fileToDataUrl } from "../../../utils/file";
import { router } from "../../../utils/router";
import type { ServerSettingsContext } from "./ServerSettings";

import style from "./generalServerSettingsPage.module.css";

const getStrings = () => ({
  name: t`Name`,
  avatar: t`Avatar`,
  banner: t`Banner`,
  deleteServer: t`Delete Server`,
});

const generalServerSettingsPage = (context: ServerSettingsContext) => {
  const ac = new AbortController();
  const { signal } = ac;
  const strings = getStrings();

  const initialValues = () => {
    const serverId = router.match<{ serverId: string }>(
      "/app/servers/:serverId/*",
    )?.params.serverId;
    const server = serverStore.servers.get(serverId!);

    return {
      name: server?.name || "",

      avatar: null as null | { file: File; url: string },
      avatarCropPoints: null as null | CropPoints,

      banner: null as null | { file: File; url: string },
      bannerCropPoints: null as null | CropPoints,
    };
  };

  const actions = createSettingsActions({ signal });

  const updateHandler = createUpdatedHandler(initialValues, signal);

  let el = (
    <div class={style.page}>
      {/* name */}
      <SettingsBlock.Root>
        <SettingsBlock.Icon name="edit" />
        <SettingsBlock.Details title={strings.name} />
        <Input id="nameInput" class="nameInput" value={initialValues().name} />
      </SettingsBlock.Root>

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

      <div class={style.separator}></div>

      <SettingsBlock.Root data-action="delete-server" clickable>
        <SettingsBlock.Icon name="delete" alert />
        <SettingsBlock.Details
          title={strings.deleteServer}
          description={t`Permanently delete this server and all associated data.`}
        />
      </SettingsBlock.Root>
      {actions.el}
    </div>
  ) as HTMLDivElement;

  updateHandler.handleInput(el.querySelector(".nameInput")!, "name");

  updateHandler.onUpdate((changes, hasChanges) => {
    context.overrideHeader({
      name: changes.name,
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

    userStore.users.get(userId)?.update(res.user);
    done();
    updateHandler.undo();
  };

  actions.handleSaveClick(async (done) => {
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

      if (action === "delete-server") {
        // createDeleteAccountModal();
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

export { getStrings, generalServerSettingsPage as create };

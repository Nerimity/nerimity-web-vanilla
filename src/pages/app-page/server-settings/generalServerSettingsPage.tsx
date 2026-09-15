import { t } from "@lingui/core/macro";

import { Button } from "../../../components/button";
import { Dropdown } from "../../../components/createDropdown";
import { createFileInput } from "../../../components/FileInput";
import { createGenericDeleteModal } from "../../../components/GenericDeleteModal";
import type { CropPoints } from "../../../components/ImageCropModal";
import { createImageCropModalLazy } from "../../../components/ImageCropModalLazy";
import { Input } from "../../../components/input";
import { createSettingsActions } from "../../../components/settings-actions/SettingsActions";
import { SettingsBlock } from "../../../components/SettingsBlock";
import { MAX_IMAGE_UPLOAD_SIZE } from "../../../config";
import { nerimityCDNUploadRequest } from "../../../services/cdnService";
import { deleteServer, updateServer } from "../../../services/serverService";
import { serverStore } from "../../../store/serverStore";
import { ChannelType } from "../../../Types";
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
  defaultChannel: t`Default Channel`,
  systemChannel: t`System Channel`,
});

const generalServerSettingsPage = (context: ServerSettingsContext) => {
  const ac = new AbortController();
  const { signal } = ac;
  const strings = getStrings();

  const getServerId = () =>
    router.match<{ serverId: string }>("/app/servers/:serverId/*")?.params
      .serverId;

  const getServer = () => serverStore.servers.get(getServerId()!);

  const initialValues = () => {
    const server = getServer();

    return {
      name: server?.name || "",

      avatar: null as null | { file: File; url: string },
      avatarCropPoints: null as null | CropPoints,

      banner: null as null | { file: File; url: string },
      bannerCropPoints: null as null | CropPoints,

      systemChannelId: server?.systemChannelId,
      defaultChannelId: server?.defaultChannelId,
    };
  };
  const actions = createSettingsActions({ signal });
  const updateHandler = createUpdatedHandler(initialValues, signal);

  const serverChannels = () => {
    return serverStore
      .sortedChannels(getServerId()!, false)
      .filter((c) => c.type !== ChannelType.CATEGORY);
  };

  console.log(updateHandler.values.defaultChannelId!);

  const defaultChannelDropdown = Dropdown.create({
    signal,
    onChange(id) {
      updateHandler.changeValue("defaultChannelId", id);
    },
    initialSelectedId: () => updateHandler.values.defaultChannelId!,
    items: () => {
      const channels = serverChannels();
      return channels.map((c) => {
        return (
          <Dropdown.Item id={c.id}>
            <Dropdown.Label>{c.name}</Dropdown.Label>
          </Dropdown.Item>
        );
      });
    },
  });
  const systemChannelDropdown = Dropdown.create({
    signal,
    onChange(id) {
      updateHandler.changeValue("systemChannelId", id);
    },
    initialSelectedId: () => updateHandler.values.systemChannelId ?? "none",
    items: () => {
      const channels = serverChannels();
      return [
        <Dropdown.Item id="none">
          <Dropdown.Label>{t`None`}</Dropdown.Label>
        </Dropdown.Item>,
        ...channels.map((c) => {
          return (
            <Dropdown.Item id={c.id}>
              <Dropdown.Label>{c.name}</Dropdown.Label>
            </Dropdown.Item>
          );
        }),
      ];
    },
  });

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
      <SettingsBlock.Group>
        {/* Default Channel */}
        <SettingsBlock.Root>
          <SettingsBlock.Icon name="tag" />
          <SettingsBlock.Details
            title={strings.defaultChannel}
            description={t`New members will be directed to this channel.`}
          />
          {defaultChannelDropdown.el}
        </SettingsBlock.Root>

        {/* System Channel */}
        <SettingsBlock.Root>
          <SettingsBlock.Icon name="fact_check" />
          <SettingsBlock.Details
            title={strings.systemChannel}
            description={t`Where system messages should appear.`}
          />
          {systemChannelDropdown.el}
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

  const handleUndo = () => {
    updateHandler.undo();
    systemChannelDropdown.update();
    defaultChannelDropdown.update();
  };

  actions.handleUndoClick(handleUndo);

  const handleSave = async (
    done: (msg?: string) => void,
    password?: string,
  ) => {
    const {
      avatar,
      avatarCropPoints,
      banner,
      bannerCropPoints,
      systemChannelId,
      ...updates
    } = updateHandler.changedValues;

    const serverId = getServerId()!;
    let avatarId: string | undefined = undefined;
    let bannerId: string | undefined = undefined;

    if (avatar) {
      const [avatarRes, error] = await nerimityCDNUploadRequest({
        type: "avatars",
        groupId: serverId,
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
        groupId: serverId,
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
      systemChannelId: systemChannelId === "none" ? null : systemChannelId,
      bannerId,
      avatarId,
      password,
    };

    const [res, error] = await updateServer(serverId, body);
    if (error) {
      return done(error.message);
    }

    serverStore.servers.get(serverId)?.update(res);
    done();
    handleUndo();
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
        createGenericDeleteModal({
          confirmLabel: getServer()?.name!,
          title: t`Delete Server`,
          async onDelete(done) {
            const [, error] = await deleteServer(getServerId()!);
            done(error?.message);
            if (!error) {
              router.navigate("/app");
            }
          },
        });
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

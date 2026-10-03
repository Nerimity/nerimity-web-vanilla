import { t } from "@lingui/core/macro";

import { Button } from "../../../components/button";
import { CdnIcon } from "../../../components/cdnIcon";
import { Icon } from "../../../components/icon";
import { Link } from "../../../components/link";
import { SettingsBlock } from "../../../components/SettingsBlock";
import type { Channel } from "../../../store/channelStore";
import { serverStore } from "../../../store/serverStore";
import { ChannelType } from "../../../Types";
import type { ServerSettingsContext } from "./ServerSettings";

import style from "./channelsServerSettingsPage.module.css";

const getStrings = () => ({});

const rolesServerSettingsPage = (context: ServerSettingsContext) => {
  const ac = new AbortController();
  const { signal } = ac;

  const getServerId = () => serverStore.currentServerId;

  let channelListEl = (<div class={style.channelList}></div>) as HTMLDivElement;

  let el = (
    <div class={style.page}>
      <SettingsBlock.Root>
        <SettingsBlock.Icon name="add" />
        <SettingsBlock.Details title={t`Create new channel Or category`} />
        <Button data-action="create-channel" icon="add" label={t`Create`} />
      </SettingsBlock.Root>
      {channelListEl}
    </div>
  ) as HTMLDivElement;

  const rerender = async () => {
    const serverChannels =
      serverStore.sortedChannels(getServerId()!, false) || [];

    const channelsWithoutCategory = serverChannels.filter((c) => !c.categoryId);

    channelListEl.replaceChildren(
      <>
        {channelsWithoutCategory.map((channel) => (
          <ChannelItem channel={channel} serverChannels={serverChannels} />
        ))}
      </>,
    );
  };

  rerender();

  // let createdChannelId = "";
  el.addEventListener(
    "click",
    async (event) => {
      const target = event.target as HTMLDivElement;

      const actionEl = target.closest("[data-action]") as HTMLDivElement;
      const action = actionEl?.dataset?.action;
      if (action === "create-channel") {
        // const [role] = await createServerRole(getServerId()!);
        // if (role) {
        //   createdChannelId = role.id;
        //   navigateToCreatedChannel(role.id);
        // }
      }
    },
    { signal },
  );

  // const navigateToCreatedChannel = (channelId: string) => {
  //   if (createdChannelId != channelId) return;
  //   if (signal.aborted) return;
  //   const channel = channelStore.channels.get(channelId);
  //   if (channel) return;
  //   router.navigate(`./channels/${channelId}`);
  // };

  context.content.replaceChildren(el);

  const destroy = () => {
    ac.abort();
    channelListEl.remove();
    (channelListEl as any) = null;
    el.remove();
    (el as any) = null;
  };

  return { destroy };
};

const ChannelItem = (props: {
  channel: Channel;
  serverChannels: Channel[];
}) => {
  const isCategory = props.channel.type === ChannelType.CATEGORY;

  const channelsInCategory = !isCategory
    ? []
    : props.serverChannels?.filter((c) => c.categoryId === props.channel.id) ||
      [];

  return (
    <div class={[style.channelItem, isCategory && style.categoryItem]}>
      <Link
        href={`/app/servers/${props.channel.serverId!}/settings/channels/${props.channel.id}`}
        data-channel-id={props.channel.id}
        class={[style.link, isCategory && style.categoryLink]}
      >
        <CdnIcon size={18} channel={props.channel} />
        <div class={style.roleDetails}>
          <span class={style.roleText}>{props.channel.name}</span>
        </div>
        <Icon name="chevron_forward" class={style.arrow} />
      </Link>
      <div class={[style.channelList, style.categoryList]}>
        {channelsInCategory.map((channel) => (
          <ChannelItem
            channel={channel}
            serverChannels={props.serverChannels}
          />
        ))}
      </div>
    </div>
  );
};

export { getStrings, rolesServerSettingsPage as create };

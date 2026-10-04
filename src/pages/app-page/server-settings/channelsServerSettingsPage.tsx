import { t } from "@lingui/core/macro";
import type Sortable from "sortablejs";

import { Button } from "../../../components/button";
import { CdnIcon } from "../../../components/cdnIcon";
import { Icon } from "../../../components/icon";
import { Link } from "../../../components/link";
import { SettingsBlock } from "../../../components/SettingsBlock";
import { updateChannelOrder } from "../../../services/serverService";
import type { Channel } from "../../../store/channelStore";
import { serverStore } from "../../../store/serverStore";
import { ChannelType } from "../../../Types";
import { storeEmitter } from "../../../utils/EventEmitter";
import { lazySortable } from "../../../utils/lazySortable";
import type { ServerSettingsContext } from "./ServerSettings";

import style from "./channelsServerSettingsPage.module.css";

const getStrings = () => ({});

const channelsServerSettingsPage = (context: ServerSettingsContext) => {
  const ac = new AbortController();
  const { signal } = ac;

  const getServerId = () => serverStore.currentServerId;

  let channelListEl = (<div class={style.channelList}></div>) as HTMLDivElement;

  let sortable: Sortable | null = null;

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

  let rerenderAc = new AbortController();

  const rerender = async () => {
    rerenderAc.abort();

    rerenderAc = new AbortController();
    const rerenderSignal = rerenderAc.signal;

    const serverChannels =
      serverStore.sortedChannels(getServerId()!, false) || [];

    const channelsWithoutCategory = serverChannels.filter((c) => !c.categoryId);

    channelListEl.replaceChildren(
      <>
        {channelsWithoutCategory.map((channel) => (
          <ChannelItem
            signal={rerenderSignal}
            channel={channel}
            serverChannels={serverChannels}
            rerender={rerender}
          />
        ))}
      </>,
    );

    sortable?.destroy();
    sortable = null;
    const Sortable = await lazySortable();
    if (signal.aborted) return;

    sortable = new Sortable(el.querySelector(`.${style.channelList}`)!, {
      delayOnTouchOnly: true,
      delay: 200,
      touchStartThreshold: 5,
      draggable: `.${style.channelItem}`,
      group: "channel",
      filter: ".ignoreDrag",
      onAdd(event) {
        rerender();
      },
      onUpdate(event) {
        // triggered when channel outside are re-ordered.
        const children = [...event.target.children] as HTMLDivElement[];
        const channelIds = children.map((el) => el.dataset.channelId!);

        updateChannelOrder(getServerId()!, {
          channelIds,
        });

        rerender();
      },
    });
  };

  rerender();

  storeEmitter.on(
    "update_channel",
    (channel) => {
      if (channel.serverId !== getServerId()) return;
      rerender();
    },
    signal,
  );

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
    sortable?.destroy();
    rerenderAc.abort();
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
  signal: AbortSignal;
  rerender?: () => void;
}) => {
  const isCategory = props.channel.type === ChannelType.CATEGORY;

  let categoryListEl = (
    <div class={[style.channelList, style.categoryList]}></div>
  ) as HTMLDivElement;

  let el = (
    <div
      class={[style.channelItem, isCategory && style.categoryItem]}
      data-is-category={isCategory ? "true" : undefined}
      data-channel-id={props.channel.id}
    >
      <Link
        href={`/app/servers/${props.channel.serverId!}/settings/channels/${props.channel.id}`}
        class={[style.link, isCategory && style.categoryLink]}
      >
        <CdnIcon size={18} channel={props.channel} />
        <div class={style.channelDetails}>
          <span>{props.channel.name}</span>
        </div>
        <Icon name="chevron_forward" class={style.arrow} />
      </Link>
      {categoryListEl}
    </div>
  ) as HTMLDivElement;

  const channelsInCategory = !isCategory
    ? []
    : props.serverChannels?.filter((c) => c.categoryId === props.channel.id) ||
      [];
  categoryListEl.replaceChildren(
    <>
      {channelsInCategory.map((channel) => (
        <ChannelItem
          channel={channel}
          signal={props.signal}
          serverChannels={props.serverChannels}
        />
      ))}
    </>,
  );

  let sortable: Sortable | null = null;

  if (isCategory) {
    (async () => {
      const Sortable = await lazySortable();
      if (props.signal.aborted) return;

      sortable = new Sortable(categoryListEl, {
        delayOnTouchOnly: true,
        delay: 200,
        touchStartThreshold: 5,
        group: {
          name: "channel",
          put: (_to, _from, dragged) => dragged.dataset.isCategory !== "true",
        },
        draggable: `.${style.channelItem}`,
        filter: ".ignoreDrag",

        onAdd(event) {
          props.rerender?.();
        },
        onUpdate(event) {
          const children = [...event.target.children] as HTMLDivElement[];
          const channelIds = children.map((el) => el.dataset.channelId!);

          updateChannelOrder(props.channel.serverId!, {
            categoryId: props.channel.id,
            channelIds,
          });

          props.rerender?.();
        },
      });
    })();
  }
  props.signal.addEventListener(
    "abort",
    () => {
      el.remove();
      categoryListEl.remove();
      (el as any) = null;
      (categoryListEl as any) = null;
      sortable?.destroy();
    },
    { once: true },
  );

  return el;
};

export { getStrings, channelsServerSettingsPage as create };

import { t } from "@lingui/core/macro";

import {
  klipySearch,
  klipyTrending,
  type KlipyItem,
  type KlipyResult,
} from "../../../services/klipyService";
import { debounce } from "../../../utils/debounce";
import { closestFromEvent } from "../../../utils/dom";
import { getLocalItem, setLocalItem } from "../../../utils/localStorage";
import { userAgent } from "../../../utils/userAgent";
import { Icon } from "../../icon";
import { Button } from "../button";
import { Input } from "../input";
import { Skeleton } from "../skeleton";

import style from "./GifPicker.module.css";

interface EmojiPickerOpts {
  abortController: AbortController;
  onPick?: (gif: KlipyItem) => void;
}
export const createGifPicker = (opts: EmojiPickerOpts) => {
  const abortController = new AbortController();
  const { signal } = abortController;

  let klipyResult: KlipyResult | null = null;
  let isLoading = false;
  let paginationFailed = false;
  let requestId = 0;
  let paginationObserver: IntersectionObserver | null = null;
  let showFavorites = false;

  let gifContainer = (<div class={style.GifContainer}></div>) as HTMLDivElement;

  const backButton = (
    <Button class={style.backButton} icon="chevron_backward" />
  ) as HTMLButtonElement;
  let el = (
    <div class={style.gifPicker}>
      <div class={style.innerGifPicker}>
        <div class={style.inputOuterContainer}>
          {backButton}
          <Input
            id="gif-search"
            class={style.search}
            placeholder={t`Search Klipy...`}
          />
        </div>
        {gifContainer}
      </div>
    </div>
  ) as HTMLDivElement;

  let inputEl = el.querySelector("input")! as HTMLInputElement;

  const GifItem = (props: { gif: KlipyItem; index: number }) => {
    const aspect = props.gif.previewWidth / props.gif.previewHeight;
    return (
      <div
        class={style.gifItem}
        style={{ aspectRatio: `${aspect}` }}
        data-index={props.index}
      >
        <img src={props.gif.previewUrl} alt="GIF" />
        <Button
          icon="favorite"
          iconOutlined={!isFavorite(props.gif)}
          data-action="favorite"
          class={style.favoriteButton}
        />
      </div>
    );
  };

  const rerender = () => {
    paginationObserver?.disconnect();
    paginationObserver = null;

    const skeletons = Array.from(
      { length: isLoading || klipyResult?.next ? 26 : 0 },
      () => (
        <div class={style.gifItem} style={{ aspectRatio: `1/1` }}>
          <Skeleton class={style.skeleton} />
        </div>
      ),
    ) as HTMLDivElement[];
    const columns = Array.from({ length: 2 }, () => (
      <div class={style.gifColumn}></div>
    )) as HTMLDivElement[];

    let items = [
      ...(klipyResult?.results?.map((gif, i) => (
        <GifItem gif={gif} index={i} />
      )) ?? []),
      ...skeletons,
    ] as HTMLDivElement[];

    if (showFavorites) {
      items = getFavoriteGifs().map((gif, i) => (
        <GifItem gif={gif} index={i} />
      )) as HTMLDivElement[];
    }

    if (!getSearchValue() && !showFavorites)
      items.unshift(
        (
          <div
            class={[style.gifItem, style.favoriteItem]}
            style={{ aspectRatio: `1.5/1` }}
          >
            <Icon name="favorite" />
            {t`Favorites`}
          </div>
        ) as HTMLDivElement,
      );

    items.forEach((item, index) => {
      columns[index % columns.length]!.appendChild(item);
    });
    gifContainer.replaceChildren(...columns);
    if (
      skeletons.length &&
      klipyResult?.next &&
      !isLoading &&
      !paginationFailed
    ) {
      paginationObserver = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting) && !isLoading) {
            paginationObserver?.disconnect();
            paginationObserver = null;
            fetchItems();
          }
        },
        { root: gifContainer },
      );
      skeletons.forEach((skeleton) => paginationObserver!.observe(skeleton));
    }
  };

  const getSearchValue = () => inputEl.value.trim();

  const fetchItems = async (reset = false) => {
    if ((!reset && isLoading) || (!reset && !klipyResult?.next)) return;

    const shouldRenderLoadingState = !isLoading || klipyResult !== null;
    const currentRequestId = reset ? ++requestId : requestId;
    const searchVal = getSearchValue();
    const pos = reset ? undefined : klipyResult!.next;
    const previousResults = reset ? [] : klipyResult!.results;
    isLoading = true;
    paginationFailed = false;
    if (reset) klipyResult = null;
    if (shouldRenderLoadingState) rerender();

    let result: KlipyResult | null;
    let error: { message: string } | null;
    if (searchVal) {
      [result, error] = await klipySearch(searchVal, pos);
    } else {
      [result, error] = await klipyTrending(pos);
    }
    if (signal.aborted || currentRequestId !== requestId) return;
    isLoading = false;
    if (error) {
      paginationFailed = true;
      console.error("Failed to load GIFs:", error);
    } else {
      klipyResult = {
        ...result!,
        results: [...previousResults, ...result!.results],
      };
    }
    rerender();
  };

  fetchItems(true);

  requestAnimationFrame(() => {
    rerender();
    if (!userAgent.mobile) {
      inputEl.focus();
    }
  });

  const debouncedSearch = debounce(() => fetchItems(true), 800);

  inputEl.addEventListener(
    "input",
    () => {
      const shouldRenderLoadingState =
        !isLoading ||
        klipyResult !== null ||
        showFavorites ||
        gifContainer.querySelector(`.${style.favoriteItem}`) !== null;
      showFavorites = false;
      backButton.style.display = "none";
      requestId++;
      klipyResult = null;
      isLoading = true;
      paginationFailed = false;
      paginationObserver?.disconnect();
      paginationObserver = null;
      if (shouldRenderLoadingState) rerender();
      gifContainer.scrollTop = 0;
      debouncedSearch();
    },
    { signal },
  );

  el.addEventListener(
    "click",
    (event) => {
      if (closestFromEvent(event, `.${style.backButton}`)) {
        showFavorites = false;
        backButton.style.display = "none";
        rerender();
      }
      if (closestFromEvent(event, `.${style.favoriteItem}`)) {
        showFavorites = !showFavorites;
        backButton.style.display = showFavorites ? "flex" : "none";
        rerender();
      }

      const gifEl = closestFromEvent(event, `.${style.gifItem}[data-index]`);
      if (gifEl) {
        const index = parseInt(gifEl.dataset.index!);
        const gifItem = showFavorites
          ? getFavoriteGifs()[index]
          : klipyResult?.results[index];
        if (!gifItem) return;
        const faveBtn = closestFromEvent(event, '[data-action="favorite"]');
        if (faveBtn) {
          toggleGifFavorite(gifItem);
          rerender();
          return;
        }
        opts.abortController.abort();
        opts.onPick?.(gifItem);
      }
    },
    { signal },
  );
  signal.addEventListener(
    "abort",
    () => {
      paginationObserver?.disconnect();
      el.remove();
      (el as any) = null;

      gifContainer.remove();
      (gifContainer as any) = null;
    },
    { once: true },
  );

  return { abortController, el };
};

const getFavoriteGifs = () => {
  return getLocalItem("favoriteGifs", [])!;
};

const isFavorite = (gifItem: KlipyItem) => {
  const recentFavorites = getLocalItem("favoriteGifs", [])!;
  return recentFavorites.find((item) => item.url === gifItem.url);
};

const toggleGifFavorite = (gifItem: KlipyItem) => {
  let recentFavorites = getLocalItem("favoriteGifs", [])!;

  const existingIndex = recentFavorites.findIndex(
    (item) => item.url === gifItem.url,
  );

  let status = 0;
  if (existingIndex !== -1) {
    recentFavorites.splice(existingIndex, 1);
    status = -1;
  } else {
    recentFavorites.unshift(gifItem);
    status = 1;
  }

  setLocalItem("favoriteGifs", recentFavorites);
  return status;
};

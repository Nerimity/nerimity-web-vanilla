// TODO:
// This library (coloris) kinda sucks and memory leaks. Maybe make your own color picker, it doesn't seem hard.

import "@melloware/coloris/dist/coloris.css";
import Coloris from "@melloware/coloris";

import { parseGradient, type ColorStop } from "../utils/color";
import { debounce } from "../utils/debounce";
import { Icon } from "./icon";
import { Item } from "./item";
import { createModal, Modal } from "./modal";

import style from "./createColorPickerModal.module.css";

export type ColorPickerModalAnchor =
  | "top-left"
  | "top-center"
  | "top-right"
  | "center-left"
  | "center"
  | "center-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

export interface ColorPickerModalOpts {
  color: string;
  triggerEl: HTMLElement;
  anchor?: ColorPickerModalAnchor;
  onChange?: (color: string) => void;
  onClose?: (color: string, colors?: string[]) => void;
  alpha?: boolean;
  gradientTab?: boolean;
  gradientStopLimit?: number;
}

Coloris.init();

const Tabs = () => {
  return (
    <div class={style.tabs}>
      <Item.Base handlePosition="bottom" data-tab="solid">
        <Item.Icon name="format_color_fill" />
        <Item.Label>Solid</Item.Label>
      </Item.Base>
      <Item.Base handlePosition="bottom" data-tab="gradient">
        <Item.Icon name="gradient" />
        <Item.Label>Gradient</Item.Label>
      </Item.Base>
    </div>
  );
};

type Tab = "solid" | "gradient";

const stopsToGradient = (stops: ColorStop[]) => {
  return `linear-gradient(90deg, ${stops
    .map((s) => `${s.color} ${s.percent}%`)
    .join(", ")})`;
};
const createGradientSlider = (props: {
  stops: ColorStop[];
  signal: AbortSignal;
  onChange: (stops: ColorStop[]) => void;
  onSelectedStopChange: (selectedStopIndex: number) => void;
  stopLimit?: number;
}) => {
  const el = (<div class={style.gradientSlider}></div>) as HTMLDivElement;

  let selectedStopIndex = 0;

  const update = () => {
    el.style.background = stopsToGradient(props.stops);

    el.replaceChildren(
      <>
        {props.stops.map((stop, i) => (
          <div
            data-index={i}
            class={[style.colorStop, selectedStopIndex === i && style.active]}
            style={{
              left: `${stop.percent}%`,
              background: stop.color,
              position: "absolute",
              transform: "translateX(-50%)",
            }}
          >
            {props.stops.length > 2 && (
              <div class={style.removeButton}>
                <Icon name="close" class={style.removeIcon} />
              </div>
            )}
          </div>
        ))}
      </>,
    );
  };
  update();

  let draggingIndex = -1;
  const onMouseUp = () => {
    document.removeEventListener("pointermove", onMouseMove);
    document.removeEventListener("pointerup", onMouseUp);
    draggingIndex = -1;
  };
  const onMouseMove = (e: PointerEvent) => {
    if (draggingIndex === -1) return;

    const rect = el.getBoundingClientRect();

    const relativeX = e.clientX - rect.left;

    let percent = Math.round((relativeX / rect.width) * 100);
    percent = Math.max(0, Math.min(100, percent));

    props.stops[draggingIndex] = {
      ...props.stops[draggingIndex]!,
      percent: percent,
    };
    props.onChange(props.stops);
    update();
  };

  const updateSelectedStop = (forceIndex?: number) => {
    if (forceIndex !== undefined) {
      selectedStopIndex = forceIndex;
    }
    const stopEls = el.querySelectorAll("[data-index]");
    stopEls.forEach((el, stopIndex) => {
      const stopEl = el as HTMLDivElement;
      stopEl.classList.toggle(style.active!, stopIndex === selectedStopIndex);
    });
    props.onSelectedStopChange(selectedStopIndex);
  };
  updateSelectedStop();

  const addStop = (event: PointerEvent) => {
    if (event.currentTarget !== event.target) return;

    if (props.stopLimit) {
      if (props.stops.length >= props.stopLimit) return;
    }

    const rect = el.getBoundingClientRect();
    const relativeX = event.clientX - rect.left;
    let percent = Math.round((relativeX / rect.width) * 100);
    percent = Math.max(0, Math.min(100, percent));

    const newStop = { color: "#000000", percent: percent };

    const insertIndex = props.stops.findIndex((stop) => stop.percent > percent);

    if (insertIndex === -1) {
      props.stops.push(newStop);
    } else {
      props.stops.splice(insertIndex, 0, newStop);
    }

    props.onChange(props.stops);
    update();
    updateSelectedStop(insertIndex);
  };

  const removeStop = (index: number) => {
    if (props.stops.length <= 2) return;
    props.stops.splice(index, 1);
    updateSelectedStop(0);
  };

  el.addEventListener(
    "pointerdown",
    (event) => {
      const target = event.target as HTMLDivElement;
      const stopEl = target.closest("[data-index]") as HTMLDivElement;

      if (target.closest(`.${style.removeButton}`)) {
        removeStop(parseInt(stopEl.dataset.index!));
        return;
      }

      if (!stopEl) return addStop(event);
      event.preventDefault();
      event.stopPropagation();

      draggingIndex = parseInt(stopEl.dataset.index!);
      selectedStopIndex = draggingIndex;
      updateSelectedStop();

      document.addEventListener("pointerup", onMouseUp, {
        signal: props.signal,
      });
      document.addEventListener("pointermove", onMouseMove, {
        signal: props.signal,
      });
    },
    { signal: props.signal },
  );

  return { el, update, updateSelectedStop };
};

export const _createColorPickerModal = (opts: ColorPickerModalOpts) => {
  const ac = new AbortController();
  const { signal } = ac;

  const isInitialColorGradient = opts.color.startsWith("linear-gradient");

  let currentTab: Tab = isInitialColorGradient ? "gradient" : "solid";

  const parsedGradient = () =>
    parseGradient(
      isInitialColorGradient
        ? opts.color!
        : `linear-gradient(90deg, ${opts.color || "#ff0000"} 0%, #000000 100%)`,
    );

  let stops = parsedGradient().stops || [];

  let selectedStop = 0;

  let currentColor = opts.color;

  let input = (
    <input name="coloris" class={style.input} type="text" />
  ) as HTMLInputElement;
  let colorisEl = (
    <div class={style.colorisContainer}></div>
  ) as HTMLDivElement;

  let gradientSlider = createGradientSlider({
    stops,
    stopLimit: opts.gradientStopLimit,
    signal,
    onChange: (newStops) => {
      stops = newStops;
      currentColor = stopsToGradient(stops);
      opts.onChange?.(currentColor);
    },
    onSelectedStopChange: (index) => {
      selectedStop = index;
      const color = stops[index]?.color!;
      requestAnimationFrame(() => {
        Coloris.setColor(color, input);
      });
    },
  });

  let container = (
    <div>
      {opts.gradientTab && <Tabs />}
      <div class="gradientSliderContainer" style={{ display: "none" }}>
        {gradientSlider.el}
      </div>
      {colorisEl}
      {input}
    </div>
  ) as HTMLDivElement;

  const updateTab = () => {
    const tabs = container.querySelectorAll("[data-tab]");
    tabs.forEach((t) => {
      const tab = t as HTMLDivElement;
      tab.dataset.selected = tab.dataset.tab === currentTab ? "true" : "false";
    });

    const gradientSliderEl = container.querySelector(
      ".gradientSliderContainer",
    ) as HTMLDivElement;

    requestAnimationFrame(() => {
      gradientSliderEl.style.display =
        currentTab === "gradient" ? "flex" : "none";
      if (currentTab === "gradient") {
        gradientSlider.updateSelectedStop(0);
        gradientSlider.update();
      }
      if (currentTab === "solid") {
        currentColor = stops[0]?.color || "#fff";
        Coloris.setColor(currentColor, input);
      }
    });
  };

  updateTab();

  container.addEventListener(
    "click",
    (e) => {
      const target = e.target as HTMLDivElement;

      const tabEl = target.closest("[data-tab]") as HTMLDivElement;
      if (!tabEl) return;
      currentTab = tabEl.dataset.tab as Tab;
      updateTab();
    },
    { signal },
  );

  const rect = opts.triggerEl.getBoundingClientRect();

  const getPosFromAnchor = () => {
    const defaultPos = {
      x: rect.left + "px",
      y: rect.bottom + "px",
    };

    if (!opts.anchor) return defaultPos;

    const anchorMap: Record<
      ColorPickerModalAnchor,
      { x: string; y: string; anchor: ColorPickerModalAnchor }
    > = {
      "top-left": {
        x: rect.left + "px",
        y: rect.top + "px",
        anchor: "bottom-left",
      },
      "top-center": {
        x: rect.left + rect.width / 2 + "px",
        y: rect.top + "px",
        anchor: "bottom-center",
      },
      "top-right": {
        x: rect.right + "px",
        y: rect.top + "px",
        anchor: "bottom-right",
      },
      "center-left": {
        x: rect.left + "px",
        y: rect.top + rect.height / 2 + "px",
        anchor: "center-right",
      },
      center: {
        x: rect.left + rect.width / 2 + "px",
        y: rect.top + rect.height / 2 + "px",
        anchor: "center",
      },
      "center-right": {
        x: rect.right + "px",
        y: rect.top + rect.height / 2 + "px",
        anchor: "center-left",
      },
      "bottom-left": {
        x: rect.left + "px",
        y: rect.bottom + "px",
        anchor: "top-left",
      },
      "bottom-center": {
        x: rect.left + rect.width / 2 + "px",
        y: rect.bottom + "px",
        anchor: "top-center",
      },
      "bottom-right": {
        x: rect.right + "px",
        y: rect.bottom + "px",
        anchor: "top-right",
      },
    };

    return anchorMap[opts.anchor];
  };

  const pos = getPosFromAnchor();

  createModal(
    () => (
      <Modal.Root fullHeight backdropClass={style.modalBackdrop} pos={pos}>
        <Modal.Body class={style.modalBody}>{container}</Modal.Body>
      </Modal.Root>
    ),
    ac,
  );
  const debounceOnChange = debounce(() => {
    opts.onChange?.(currentColor);
  }, 100);
  Coloris({
    el: input,
    parent: colorisEl,
    themeMode: "dark",
    inline: true,
    alpha: opts.alpha,
    onChange: (color) => {
      currentColor = color;
      if (currentTab === "gradient") {
        stops[selectedStop]!.color = color!;
        gradientSlider.update();
        currentColor = stopsToGradient(stops);
      }
      debounceOnChange();
    },
    defaultColor: opts.color,
  });
  const updatePosInterval = setInterval(() => {
    Coloris.updatePosition();
  }, 500);

  window.addEventListener(
    "resize",
    () => {
      Coloris.setColor(input.value, input);
    },
    { signal },
  );

  ac.signal.addEventListener(
    "abort",
    () => {
      Coloris.close();
      opts.onChange?.(currentColor);
      opts.onClose?.(
        currentColor,
        currentTab === "gradient" ? stops.map((s) => s.color) : undefined,
      );
      clearInterval(updatePosInterval);
      input.remove();
      colorisEl.remove();
      container.remove();

      (input as any) = null;
      (colorisEl as any) = null;
      (container as any) = null;
    },
    { once: true },
  );
};

import style from "./SteppedSlider.module.css";

export interface SteppedSliderStep {
  label: string;
  value: number;
  [key: string]: unknown;
}

const positionPercent = (index: number, stepsCount: number) => {
  if (stepsCount <= 1) return 0;
  const ratio = index / (stepsCount - 1);
  return ratio * 100;
};

const Root = (props: {
  children?: any;
  disabled?: boolean;
  [key: string]: any;
}) => {
  const { children, disabled, ...rest } = props;
  return (
    <div
      data-disabled={disabled ? "true" : undefined}
      {...rest}
      class={[style.slider, props.class]}
    >
      {children}
    </div>
  );
};

const Bar = () => {
  return (
    <div class={style.sliderBar}>
      <div class={style.sliderFill}>
        <div class={style.sliderThumb} />
      </div>
    </div>
  );
};

const Labels = (props: { steps: SteppedSliderStep[] }) => {
  return (
    <div class={style.labels}>
      {props.steps.map((step, index) => (
        <div
          class={style.label}
          style={`left: ${positionPercent(index, props.steps.length)}%`}
        >
          <span class={style.labelText}>
            <span class={style.marker} />
            {step.label}
          </span>
        </div>
      ))}
    </div>
  );
};

const createHandler = (opts: {
  el: HTMLElement;
  steps: SteppedSliderStep[];
  onChange?: (step: SteppedSliderStep, el: HTMLElement) => void;
  signal: AbortSignal;
  initialValue?: () => number;
}) => {
  const rootEl = opts.el.querySelector(`.${style.slider}`) as HTMLDivElement;
  const barEl = rootEl?.querySelector(`.${style.sliderBar}`) as HTMLDivElement;
  const fillEl = rootEl?.querySelector(
    `.${style.sliderFill}`,
  ) as HTMLDivElement;
  const thumbEl = rootEl?.querySelector(
    `.${style.sliderThumb}`,
  ) as HTMLDivElement;
  const labelsEl = rootEl?.querySelector(`.${style.labels}`) as HTMLDivElement;
  if (!rootEl || !barEl || !fillEl || !thumbEl || !labelsEl) {
    return;
  }

  const stepsCount = opts.steps.length;
  const labels = [...labelsEl.querySelectorAll(`.${style.label}`)];

  const render = () => {
    const index = opts.steps.findIndex(
      (step) => step.value === Number(rootEl.dataset.value),
    );
    labels.forEach((label, labelIndex) => {
      (label as HTMLDivElement).dataset.selected = String(labelIndex === index);
    });
    const width = index < 0 ? 0 : positionPercent(index, stepsCount);
    fillEl.style.width = `${width}%`;

    if (index !== stepsCount - 1) {
      fillEl.style.background = "";
    }

    if (index !== 0 && index !== stepsCount - 1) {
      thumbEl.style.transform = "";
      return;
    }

    const marker = labels[index]?.querySelector(`.${style.marker}`);
    if (!marker) return;

    const barRect = barEl.getBoundingClientRect();
    const markerRect = marker.getBoundingClientRect();
    const fillEnd = barRect.left + (barRect.width * width) / 100;
    const markerCenter = markerRect.left + markerRect.width / 2;
    thumbEl.style.transform = `translateX(${markerCenter - fillEnd}px)`;

    if (index === stepsCount - 1) {
      const visibleFillWidth = markerCenter - barRect.left;
      fillEl.style.background = `linear-gradient(to right, var(--primary-color) ${visibleFillWidth}px, transparent ${visibleFillWidth}px)`;
    }
  };

  const setValue = (value: number, notify = true) => {
    const changed = rootEl.dataset.value !== `${value}`;
    rootEl.dataset.value = `${value}`;
    render();
    if (!notify || !changed) return;
    const step = opts.steps.find((s) => s.value === value);
    if (step) opts.onChange?.(step, rootEl);
  };

  const update = () => {
    if (!opts.initialValue) return;
    setValue(opts.initialValue(), false);
  };

  const valueFromEvent = (event: MouseEvent) => {
    if (stepsCount <= 1) return;
    const rect = barEl.getBoundingClientRect();
    const availableWidth = Math.max(0, rect.width);
    const clickX = Math.min(
      Math.max(0, event.clientX - rect.left),
      availableWidth,
    );
    const stepWidth = availableWidth / (stepsCount - 1);
    const index = Math.round(clickX / stepWidth);
    return opts.steps[index]?.value;
  };

  const applyEvent = (event: MouseEvent) => {
    const value = valueFromEvent(event);
    if (value !== undefined) setValue(value);
  };

  barEl.addEventListener(
    "mousedown",
    (event) => {
      if (rootEl.dataset.disabled === "true") return;
      applyEvent(event);

      const dragController = new AbortController();
      const stopDrag = () => dragController.abort();
      opts.signal.addEventListener("abort", stopDrag, { once: true });

      document.addEventListener("mousemove", applyEvent, {
        signal: dragController.signal,
      });
      document.addEventListener(
        "mouseup",
        () => {
          stopDrag();
          opts.signal.removeEventListener("abort", stopDrag);
        },
        { signal: dragController.signal },
      );
    },
    { signal: opts.signal },
  );

  update();

  const resizeObserver = new ResizeObserver(render);
  resizeObserver.observe(barEl);
  resizeObserver.observe(labelsEl);
  opts.signal.addEventListener("abort", () => resizeObserver.disconnect(), {
    once: true,
  });

  return { update, setValue };
};

export const SteppedSlider = {
  Root,
  Bar,
  Labels,
  createHandler,
};

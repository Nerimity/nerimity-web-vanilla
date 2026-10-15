import style from "./radiobox.module.css";

const Group = (props: { children: any; id: string }) => {
  return (
    <div class={style.group} data-id={props.id}>
      {props.children}
    </div>
  );
};
const Root = (props: {
  checked?: boolean;
  [key: string]: any;
  children?: any;
  disabled?: boolean;
}) => {
  const { checked, children, ...rest } = props;
  return (
    <div
      data-disabled={props.disabled}
      data-checked={checked}
      {...rest}
      class={[style.radioboxContainer, props.class]}
    >
      {children}
    </div>
  );
};

const Label = (props: { children: any }) => {
  return <div>{props.children}</div>;
};

const Box = () => {
  return <div class={style.box}></div>;
};

const createHandler = (opts: {
  el: HTMLDivElement;
  onChange: (event: {
    id: string;
    index: number;
    checked: boolean;
    el: HTMLElement;
  }) => void;
  signal: AbortSignal;
}) => {
  opts.el.addEventListener(
    "click",
    (el) => {
      const target = el.target as HTMLElement;

      const group = target.closest(`.${style.group}`) as HTMLDivElement;

      const checkEl = target?.closest(
        `.${style.radioboxContainer}`,
      ) as HTMLDivElement;
      if (checkEl) {
        if (checkEl.dataset.disabled) {
          return;
        }

        const checked = checkEl.dataset.checked === "true" ? false : true;

        const checkboxes = group.querySelectorAll(
          `.${style.radioboxContainer}`,
        );

        let index = -1;
        checkboxes.forEach((_el, i) => {
          const el = _el as HTMLDivElement;
          if (el === checkEl) {
            index = i;
          }
          el.dataset.checked = el === checkEl ? "true" : "false";
        });

        opts.onChange({
          id: group.dataset.id!,
          checked,
          index,
          el: checkEl,
        });
      }
    },
    { signal: opts.signal },
  );
};

export const Radiobox = {
  Group,
  Root,
  Label,
  Box,
  createHandler,
};

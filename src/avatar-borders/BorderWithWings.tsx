import style from "./BorderWithWings.module.css";

export const BorderWithWings = (props: { children: any }) => {
  return (
    <div class={style.container}>
      <img class={style.border} src="/avatar/borders/founder.webp" />
      <img
        class={[style.wing, style.left]}
        src="/avatar/borders/founder-left-wing.webp"
      />
      <img
        class={[style.wing, style.right]}
        src="/avatar/borders/founder-right-wing.webp"
      />
      {props.children}
    </div>
  );
};

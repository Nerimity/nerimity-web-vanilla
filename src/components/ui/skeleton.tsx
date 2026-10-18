import style from "./skeleton.module.css";

export const MessageSkeleton = (props: { wide?: boolean }) => (
  <div class={[style.skeletonItem, style.message]}>
    <div class={style.avatarSkeleton} />
    <div class={style.lines}>
      <div class={style.line} style={{ width: "120px" }} />
      <div class={style.line} style={{ width: props.wide ? "80%" : "50%" }} />
    </div>
  </div>
);

export const PostSkeleton = () => (
  <div class={[style.skeletonItem, style.post]} aria-hidden="true">
    <div class={style.avatarSkeleton} />
    <div class={style.postBody}>
      <div class={style.detailsLine}>
        <div class={[style.line, style.usernameSkeleton]} />
        <div class={[style.line, style.timestampSkeleton]} />
      </div>
      <div class={style.postContent}>
        <div class={[style.line, style.contentLine]} />
        <div class={[style.line, style.contentLine, style.shortContentLine]} />
      </div>
      <div class={style.postInfo}>
        <div class={style.actionSkeleton} />
        <div class={style.actionSkeleton} />
        <div class={style.actionSkeleton} />
      </div>
    </div>
  </div>
);

export const Skeleton = (props: { class?: string; style?: any }) => (
  <div
    class={[style.skeletonItem, style.raw, props.class]}
    style={props.style}
  />
);

export const InviteSkeleton = () => (
  <div class={[style.skeletonItem, style.invite]}>
    <div class={style.avatarSkeleton} />
    <div class={style.lines}>
      <div class={style.line} style={{ width: "120px" }} />
      <div class={style.line} style={{ width: "50%" }} />
    </div>
    <div class={style.buttonSkeleton} />
  </div>
);

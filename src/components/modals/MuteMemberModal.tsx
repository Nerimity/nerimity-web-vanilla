import { ph, t } from "@lingui/core/macro";
import { Trans } from "@trans";

import {
  muteServerMember,
  unmuteServerMember,
} from "../../services/serverService";
import { serverStore } from "../../store/serverStore";
import { userStore } from "../../store/userStore";
import { closestFromEvent } from "../../utils/dom";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { createModal, Modal } from "../ui/modal";
import { SteppedSlider } from "../ui/SteppedSlider";
import { createGenericConfirmModal } from "./GenericConfirmModal";

import style from "./MuteMemberModal.module.css";

const GetSteps = () => [
  { fullLabel: t`10 minutes`, label: t`10m`, value: 10 * 60000 },
  { fullLabel: t`60 minutes`, label: t`60m`, value: 60 * 60000 },
  { fullLabel: t`6 hours`, label: t`6h`, value: 6 * 3600000 },
  { fullLabel: t`12 hours`, label: t`12h`, value: 12 * 3600000 },
  { fullLabel: t`24 hours`, label: t`24h`, value: 24 * 3600000 },
  { fullLabel: t`7 days`, label: t`7d`, value: 7 * 86400000 },
  { fullLabel: t`30 days`, label: t`30d`, value: 30 * 86400000 },
  { fullLabel: t`Never`, label: t`Never`, value: 0 },
];

export const createMuteMemberModal = (props: {
  userId: string;
  username?: string;
}) => {
  const Steps = GetSteps();
  const abortController = new AbortController();
  const { signal } = abortController;

  const user = userStore.users.get(props.userId)!;
  const username = props.username || user.username;

  const body = (<Modal.Body width="400px"></Modal.Body>) as HTMLDivElement;

  let selected = Steps[0]?.value!;

  const valToFullLabel = () =>
    Steps.find((s) => s.value === selected)?.fullLabel!;

  body.replaceChildren(
    <div class={style.body}>
      <span class={style.message}>
        <Trans>
          <span class={style.username}>{username}</span> {""} will not be able
          to talk in this server for:{" "}
          <span class={style.notTalkFor}>{ph({ time: valToFullLabel() })}</span>
        </Trans>
      </span>

      <SteppedSlider.Root>
        <SteppedSlider.Bar />
        <SteppedSlider.Labels steps={Steps} />
      </SteppedSlider.Root>

      <Input id="mute-reason" label={t`Reason (optional)`} />
    </div>,
  );

  SteppedSlider.createHandler({
    el: body,
    steps: Steps,
    signal,
    initialValue: () => selected,
    onChange: (step) => {
      selected = step.value;
      body.querySelector(`.${style.notTalkFor}`)!.textContent =
        valToFullLabel();
    },
  });

  const modal = (
    <Modal.Root>
      <Modal.Header alert label={t`Mute ${username}`} icon="volume_off" />
      {body}
      <Modal.Footer>
        <Button
          class="button"
          data-action="close"
          label={t`Don't Mute`}
          hoverBorder
        />
        <Button
          data-action="mute"
          class="button"
          icon="volume_off"
          label={t`Mute`}
          alert
          primary
        />
      </Modal.Footer>
    </Modal.Root>
  ) as HTMLDivElement;

  let requesting = false;

  const handleMute = async (button: HTMLElement) => {
    if (requesting) return;
    const label = button?.querySelector(".label")!;
    requesting = true;
    label.textContent = t`Muting...`;

    const reason = (document.getElementById("mute-reason") as HTMLInputElement)
      .value;

    let expireAt = new Date(Date.now() + selected || 0).getTime();

    if (selected === 0) {
      // set expireAt to 2099
      const date = new Date();
      date.setFullYear(2099);
      expireAt = date.getTime();
    }

    const [, error] = await muteServerMember({
      serverId: serverStore.currentServerId!,
      userId: props.userId,
      body: {
        reason: reason || undefined,
        expireAt,
      },
    });
    requesting = false;
    label.textContent = t`Mute`;
    if (!error) {
      abortController.abort();
    }
  };

  modal.addEventListener(
    "click",
    async (e) => {
      const button = closestFromEvent(e, ".button");
      const action = button?.dataset.action;
      if (action === "mute") {
        handleMute(button!);
        return;
      }
      if (action === "close") {
        abortController.abort();
      }
    },
    { signal },
  );

  createModal(() => {
    return modal;
  }, abortController);
};

export const createUnmuteMemberModal = (props: {
  userId: string;
  username?: string;
}) => {
  const user = userStore.users.get(props.userId);
  if (!user) return;

  const username = props.username || user.username;

  createGenericConfirmModal({
    title: t`Unmute ${username}`,
    body: (
      <div class={style.body}>
        <span class={style.message}>
          <Trans>
            Are you sure you want to unmute{" "}
            <span class={style.username}>{username}</span>?
          </Trans>
        </span>
      </div>
    ),
    cancelIcon: "close",
    cancelLabel: t`Don't Unmute`,
    confirmLabel: t`Unmute`,
    confirmIcon: "volume_up",
    headerIcon: "volume_up",
    alert: true,
    onConfirm: async (done) => {
      const [, error] = await unmuteServerMember({
        serverId: serverStore.currentServerId!,
        userId: props.userId,
      });
      done(error?.message);
    },
  });
};

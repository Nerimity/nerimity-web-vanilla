import { t } from "@lingui/core/macro";

import { deleteReminder, updateReminder } from "../../services/reminderService";
import { accountStore } from "../../store/accountStore";
import { Message } from "../../store/messageStore";
import type { RawReminder } from "../../Types";
import { formatTimestamp } from "../../utils/date";
import { closestFromEvent } from "../../utils/dom";
import { storeEmitter } from "../../utils/EventEmitter";
import { createTimeModal } from "../modals/TimeModal";
import { PostItem } from "../posts/PostItem";
import { Button } from "../ui/button";
import { ContextMenu } from "../ui/ContextMenu";
import { createModal, Modal } from "../ui/modal";
import { MessageItem } from "./messageItem";

import style from "./RemindersModal.module.css";

const sameTimeTomorrow = (reminderAt: number, now: number) => {
  const d = new Date(now);
  d.setDate(d.getDate() + 1);
  const original = new Date(reminderAt);
  d.setHours(
    original.getHours(),
    original.getMinutes(),
    original.getSeconds(),
    original.getMilliseconds(),
  );
  return d.getTime();
};

const snoozeOptions = (reminderAt: number, now = Date.now()) => [
  { id: "5m", name: t`5 Minutes`, until: now + 60_000 * 5 },
  { id: "1h", name: t`1 Hour`, until: now + 60_000 * 60 },
  { id: "3h", name: t`3 Hours`, until: now + 60_000 * 60 * 3 },
  {
    id: "tomorrow",
    name: t`Same time tomorrow`,
    until: sameTimeTomorrow(reminderAt, now),
  },
];

const Item = (props: { item: RawReminder; body: HTMLDivElement }) => {
  const item = props.item;

  const isActive = item.remindAt <= Date.now();

  return (
    <div class={style.item} data-reminder-id={item.id} data-active={isActive}>
      {formatTimestamp(item.remindAt)}
      {item.message && (
        <MessageItem
          hideNewDayMarker
          container={props.body}
          message={new Message(item.message)}
        />
      )}
      {item.post && (
        <PostItem container={props.body} hideNewDayMarker post={item.post} />
      )}
      <div class={style.actions}>
        {isActive && (
          <>
            <Button
              data-action="dismiss"
              primary
              success
              icon="check"
              label={t`Dismiss`}
            />

            <div class={style.snoozeContainer}>
              <Button
                data-action="snooze"
                primary
                icon="timer"
                label={t`Snooze (5 Minutes)`}
              />
              <Button
                data-action="snooze_more"
                primary
                icon="keyboard_arrow_down"
              />
            </div>
          </>
        )}
        {!isActive && (
          <>
            <Button
              data-action="edit"
              hoverBorder
              icon="edit"
              label={t`Edit`}
            />
            <Button
              data-action="dismiss"
              icon="delete"
              hoverBorder
              alert
              class={style.deleteButton}
            />
          </>
        )}
      </div>
    </div>
  );
};

const hasActiveReminders = () =>
  accountStore.currentUser?.reminders.find((r) => r.remindAt <= Date.now());

export const createRemindersModal = () => {
  const abortController = new AbortController();
  const { signal } = abortController;

  let itemsEl = (<div class={style.items}></div>) as HTMLDivElement;

  const body = (
    <Modal.Body width="500px">{itemsEl}</Modal.Body>
  ) as HTMLDivElement;
  const rerenderItems = () => {
    const reminders =
      accountStore.currentUser?.reminders.sort(
        (a, b) => a.remindAt - b.remindAt,
      ) || [];

    itemsEl.replaceChildren(
      <>
        {reminders.map((r) => (
          <Item item={r} body={body} />
        ))}
      </>,
    );
  };

  if (accountStore.authenticated) {
    rerenderItems();
  }

  ContextMenu.createHandler({
    el: body,
    signal,
    mode: "click",
    selector: `[data-action="snooze_more"]`,
    idSelector: `.${style.item}`,
    attr: "reminderId",
    onAction(actionId, ctx) {
      const reminder = accountStore.currentUser?.reminders.find(
        (r) => r.id === ctx.id,
      );
      if (!reminder) return;
      const snoozeType = snoozeOptions(reminder.remindAt).find(
        (r) => r.id === actionId,
      );
      if (!snoozeType) return;
      updateReminder(reminder.id, snoozeType.until);
    },
    renderMenu(props) {
      return (
        <ContextMenu.Root pos={props}>
          {snoozeOptions(0).map((s) => (
            <ContextMenu.Item id={s.id}>
              <ContextMenu.Label>{s.name}</ContextMenu.Label>
            </ContextMenu.Item>
          ))}
        </ContextMenu.Root>
      );
    },
    resolveData() {
      return {};
    },
  });

  let requesting = false;
  body.addEventListener(
    "click",
    async (e) => {
      if (requesting) return false;
      const item = closestFromEvent(e, "[data-reminder-id]");
      if (!item) return;
      const reminderId = item.dataset.reminderId;
      if (!reminderId) return;

      if (closestFromEvent(e, `[data-action="dismiss"]`)) {
        requesting = true;
        await deleteReminder(reminderId);
        requesting = false;
      }
      if (closestFromEvent(e, `[data-action="snooze"]`)) {
        requesting = true;
        await updateReminder(reminderId, Date.now() + 60_000 * 5);
        requesting = false;
      }
      if (closestFromEvent(e, `[data-action="edit"]`)) {
        createTimeModal({
          mode: "RELATIVE",
          onConfirm(event) {
            if (event.type === "tr") {
              requesting = true;
              updateReminder(reminderId, event.val * 1000);
              requesting = false;
            }
          },
        });
      }
    },
    { signal },
  );

  const modal = (
    <Modal.Root>
      <Modal.Header label={t`Reminders`} icon="event" />
      {body}
    </Modal.Root>
  ) as HTMLDivElement;

  storeEmitter.on(
    "reminders:update",
    () => {
      rerenderItems();
    },
    signal,
  );

  const intervalId = setInterval(() => {
    if (hasActiveReminders()) {
      rerenderItems();
    }
  }, 1000);

  signal.addEventListener(
    "abort",
    () => {
      clearInterval(intervalId);
    },
    { once: true },
  );

  createModal(() => {
    return modal;
  }, abortController);
};

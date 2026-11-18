import type { RawReminder } from "../Types";
import { request } from "./request";

interface AddReminderOpts {
  postId?: string;
  messageId?: string;
  timestamp: number;
}

export const addReminder = (opts: AddReminderOpts) => {
  const data = request<RawReminder>("/reminders", {
    method: "POST",
    body: opts,
    useToken: true,
  });
  return data;
};

export const deleteReminder = (reminderId: string) => {
  return request<any>("/reminders/" + reminderId, {
    method: "DELETE",
    useToken: true,
  });
};

export const updateReminder = (reminderId: string, timestamp: number) => {
  return request<RawReminder>("/reminders/" + reminderId, {
    method: "POST",
    useToken: true,
    body: { timestamp },
  });
};

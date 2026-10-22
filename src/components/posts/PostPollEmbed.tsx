import { t } from "@lingui/core/macro";
import { Plural, Trans } from "@trans";

import { votePostPoll } from "../../services/PostService";
import { accountStore } from "../../store/accountStore";
import type { RawPostPoll } from "../../Types";
import { closestFromEvent } from "../../utils/dom";
import { Button } from "../ui/button";
import { Radiobox } from "../ui/radiobox";

import style from "./PostPollEmbed.module.css";

const PostPollTotalVotes = ({ total }: { total: number }) => {
  const totalLocale = total.toLocaleString();
  return (
    <Plural
      value={totalLocale}
      _0={
        <Trans>
          <span class={style.full}>No</span> Votes
        </Trans>
      }

      one={
        <Trans>
          <span class={style.full}>#</span> vote
        </Trans>
      }
      other={
        <Trans>
          <span class={style.full}>#</span> Votes
        </Trans>
      }
    />
  );
};

let elementToPoll = new WeakMap<
  HTMLDivElement,
  { postCreatorId?: string; poll: RawPostPoll }
>();

export const PostPollEmbed = (props: {
  poll: RawPostPoll;
  pollCreatorId?: string;
}) => {
  const { poll } = props;

  const total = poll._count.votedUsers;

  const selfPollCreator = props.pollCreatorId === accountStore.currentUser?.id;
  const votedChoiceId = poll.votedUsers[0]?.pollChoiceId;
  const selfVoted = !!votedChoiceId;

  const showFill = selfPollCreator || selfVoted;

  const el = (
    <div
      class={[style.pollEmbed, "pollEmbed"]}
      data-id={poll.id}
      data-self-voted={selfVoted}
      data-self-poll-creator={selfPollCreator}
    >
      <div class={style.options}>
        {poll.choices.map((choice) => {
          const percent = (choice._count.votedUsers / total) * 100;
          return (
            <div data-id={choice.id} class={style.option}>
              <Radiobox.Root
                class={style.radiobox}
                checked={votedChoiceId === choice.id}
              >
                <Radiobox.Box />
              </Radiobox.Root>
              {showFill && (
                <div
                  class={style.bgFill}
                  style={{
                    width: percent + "%",
                  }}
                ></div>
              )}
              {choice.content}
              {showFill && (
                <span class={style.percent}>
                  {isNaN(percent) ? "0%" : percent.toFixed(0) + "%"}
                </span>
              )}
            </div>
          );
        })}
      </div>
      <div class={style.footer}>
        <div class={style.totalVotes}>
          <PostPollTotalVotes total={total} />
        </div>
        <Button data-action="vote" icon="check" label={t`Vote`} />
      </div>
    </div>
  ) as HTMLDivElement;
  elementToPoll.set(el, { poll, postCreatorId: props.pollCreatorId });

  return el;
};

export const handlePostPollEmbed = (opts: {
  signal: AbortSignal;
  container: HTMLDivElement;
}) => {
  let voting = false;
  opts.container.addEventListener(
    "click",
    async (e) => {
      const post = closestFromEvent(e, ".postItemOuter");
      if (!post) return;
      const pollEmbed = closestFromEvent(e, ".pollEmbed");
      if (!pollEmbed) return;

      const poll = elementToPoll.get(pollEmbed);
      if (!poll) return;

      const radios = [
        ...pollEmbed.querySelectorAll(`.${style.radiobox}`),
      ] as HTMLDivElement[];

      if (closestFromEvent(e, `[data-action="vote"]`)) {
        const post = closestFromEvent(e, ".postItemOuter");
        if (!post) return;
        const postId = post.dataset.id!;
        const pollEmbed = closestFromEvent(e, ".pollEmbed");
        if (!pollEmbed) return;
        const pollId = pollEmbed.dataset.id!;
        const choiceEl = radios.find(
          (r) => r.dataset.checked === "true",
        )?.parentElement;
        if (!choiceEl) return;
        const choiceId = choiceEl.dataset.id!;
        if (voting) return;
        voting = true;

        const [, err] = await votePostPoll({
          postId,
          pollId,
          choiceId,
        });
        voting = false;
        if (opts.signal.aborted) return;
        if (err) {
          alert({ message: err.message });
          return;
        }

        poll.poll._count.votedUsers += 1;
        poll.poll.votedUsers.push({ pollChoiceId: choiceId });
        const choice = poll.poll.choices.find((c) => c.id === choiceId);
        if (choice) {
          choice._count.votedUsers += 1;
        }
        pollEmbed.replaceWith(
          <PostPollEmbed poll={poll.poll} pollCreatorId={poll.postCreatorId} />,
        );

        return;
      }

      const choice = closestFromEvent(e, `.${style.option}`);
      if (!choice) return;

      const radio = choice.querySelector(
        `.${style.radiobox}`,
      ) as HTMLDivElement;
      if (!radio) return;

      radios.forEach((r) => {
        r.dataset.checked = r === radio ? "true" : "false";
      });
      const voteButton = pollEmbed.querySelector(
        `[data-action="vote"]`,
      ) as HTMLButtonElement;
      voteButton.style.display = "flex";
    },
    { signal: opts.signal },
  );
};

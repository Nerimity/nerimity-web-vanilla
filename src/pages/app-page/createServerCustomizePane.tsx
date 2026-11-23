import { t } from "@lingui/core/macro";

import { CdnIcon } from "../../components/cdnIcon";
import { Icon } from "../../components/icon";
import { Button } from "../../components/ui/button";
import { Checkbox } from "../../components/ui/checkbox";
import { GradientText } from "../../components/ui/gradientText";
import { alert } from "../../components/ui/modal";
import { Radiobox } from "../../components/ui/radiobox";
import {
  answerWelcomeQuestion,
  getWelcomeQuestions,
  removeAnswerWelcomeQuestion,
} from "../../services/serverService";
import { accountStore } from "../../store/accountStore";
import type { ServerRole } from "../../store/serverRoleStore";
import { serverStore } from "../../store/serverStore";
import type {
  RawServerWelcomeAnswer,
  RawServerWelcomeQuestion,
} from "../../Types";
import { resolveGradient } from "../../utils/color";
import { closestFromEvent } from "../../utils/dom";
import { storeEmitter } from "../../utils/EventEmitter";
import { getAppHeader, type RouteContext } from "./AppPage";

import style from "./createServerCustomizePane.module.css";

const createServerCustomizePane = ({ content }: RouteContext) => {
  const ac = new AbortController();
  const { signal } = ac;

  const el = (<div class={style.page}></div>) as HTMLDivElement;

  let questions: RawServerWelcomeQuestion[] = [];

  const getQuestions = () => {
    getWelcomeQuestions(serverStore.currentServerId!).then(([res]) => {
      if (signal.aborted) return;
      if (!res) return;
      questions = res;
      rerender();
    });
  };

  storeEmitter.on(
    "ws:authStateUpdate",
    (state) => {
      if (!state) return;
      getQuestions();
    },
    signal,
  );

  if (accountStore.authenticated) {
    getQuestions();
  }

  const rerender = () => {
    const orderedQuestions = questions.sort((a, b) => a.order - b.order);

    const channel = serverStore.currentServer()?.defaultChannel;
    const channelName = channel?.name || "";

    el.replaceChildren(
      <>
        <Button
          class={style.continueButton}
          href={`/app/servers/${serverStore.currentServerId!}/${channel?.id}`}
          icon="chevron_backward"
          label={t`Continue to ${channelName}`}
          primary
        />
        {orderedQuestions.map((q) => (
          <QuestionItem question={q} />
        ))}
      </>,
    );
  };

  getAppHeader()?.updateHeader({
    label: t`Customize`,
    icon: "dashboard_customize",
  });

  content.replaceChildren(el);

  const removeAnswer = async (answerId: string, questionId: string) => {
    const [, err] = await removeAnswerWelcomeQuestion(
      serverStore.currentServerId!,
      answerId,
    );

    if (err) {
      alert({ message: err });
      return;
    }

    questions.forEach((q) => {
      if (q.id === questionId) {
        q.answers.forEach((a) => {
          if (a.id === answerId) {
            a.answered = false;
          }
        });
      }
    });
    rerender();
  };
  const updateAnswer = async (answerId: string, questionId: string) => {
    const [, err] = await answerWelcomeQuestion(
      serverStore.currentServerId!,
      answerId,
    );

    if (err) {
      alert({ message: err });
      return;
    }

    questions.forEach((q) => {
      if (q.id === questionId) {
        q.answers.forEach((a) => {
          if (q.multiselect) {
            if (a.id === answerId) {
              a.answered = true;
            }
          } else {
            a.answered = a.id === answerId;
          }
        });
      }
    });
    rerender();
  };

  el.addEventListener(
    "click",
    async (e) => {
      const answerEl = closestFromEvent(e, "[data-answer-id");
      if (!answerEl) return;
      const answerId = answerEl.dataset.answerId!;
      const questionId = answerEl.dataset.questionId!;
      const answered = answerEl.dataset.answered === "true";

      if (answered) {
        removeAnswer(answerId, questionId);
      } else {
        updateAnswer(answerId, questionId);
      }
    },
    { signal },
  );

  const destroy = () => {
    ac.abort();
    el.remove();
    getAppHeader()?.updateHeader({ trigger: false });
  };

  return { destroy };
};

const QuestionItem = (props: { question: RawServerWelcomeQuestion }) => {
  const orderedAnswers = props.question.answers.sort(
    (a, b) => a.order - b.order,
  );

  return (
    <div class={style.questionItem}>
      <div class={style.title}>{props.question.title}</div>
      <div class={style.answerList}>
        {orderedAnswers.map((a) => (
          <AnswerItem answer={a} question={props.question} />
        ))}
      </div>
    </div>
  );
};

const AnswerItem = (props: {
  answer: RawServerWelcomeAnswer;
  question: RawServerWelcomeQuestion;
}) => {
  const serverId = serverStore.currentServerId!;
  const roleIds = props.answer.roleIds;
  const orderedRoles = serverStore
    .serverSortedRoles(serverId)
    .filter((r) => roleIds.includes(r.id));

  const multiselect = props.question.multiselect;

  return (
    <div
      class={style.answerItem}
      data-answer-id={props.answer.id}
      data-question-id={props.question.id}
      data-answered={props.answer.answered}
    >
      <div class={style.header}>
        {multiselect ? (
          <Checkbox.Root checked={props.answer.answered} class={style.box}>
            <Checkbox.Box />
          </Checkbox.Root>
        ) : (
          <Radiobox.Root checked={props.answer.answered} class={style.box}>
            <Radiobox.Box />
          </Radiobox.Root>
        )}
        <div class={style.answeredCount}>
          <Icon name="group" />
          {props.answer._count.answeredUsers.toLocaleString()}
        </div>
      </div>
      <div>{props.answer.title}</div>
      {!!orderedRoles.length && (
        <div class={style.roleList}>
          {orderedRoles.map((r) => (
            <RoleItem role={r} />
          ))}
        </div>
      )}
    </div>
  );
};

const RoleItem = (props: { role: ServerRole }) => {
  const color = resolveGradient(props.role.gradient || props.role.hexColor);

  return (
    <div class={style.role}>
      {props.role.icon && (
        <CdnIcon role={props.role} size={14} class={style.icon} />
      )}
      <GradientText color={color} class={style.roleText}>
        {props.role.name}
      </GradientText>
    </div>
  );
};

export default createServerCustomizePane;

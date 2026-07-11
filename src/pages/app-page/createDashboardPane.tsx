import { h } from "../../h";

const createDashboardPane = (content: HTMLElement) => {
  const abortController = new AbortController();
  console.log("hmm", content);
  const { signal } = abortController;

  const el = <div>Dashboard</div>;

  content.replaceChildren(el);

  const destroy = () => {
    abortController.abort();
    (content as any) = null;
  };

  return { destroy };
};

export default createDashboardPane;

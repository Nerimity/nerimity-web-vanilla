import style from "./StatusMessage.module.css";

export const createStatusMessage = () => {
  const container = (<div></div>) as HTMLDivElement;

  const set = (
    message?: string | null,
    type: "error" | "success" | "normal" = "error",
  ) => {
    container.textContent = message || "";
    container.style.display = message ? "block" : "none";
    container.classList.remove(style.error!, style.success!);
    if (type !== "normal") {
      container.classList.add(type === "error" ? style.error! : style.success!);
    }
  };
  return {
    set,
    element: container,
  };
};

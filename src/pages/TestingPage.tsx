import { SettingsBlock } from "../components/SettingsBlock";
import { ExpressionPickerLazy } from "../components/ui/expression-picker/ExpressionPickerLazy";
import { createModal, Modal } from "../components/ui/modal";
import { isMobileWidth } from "../config";
import { closestFromEvent } from "../utils/dom";
import { Fonts } from "../utils/font";

import style from "./TestingPage.module.css";

interface Test {
  name: string;
  description: string;
  action: (target: HTMLElement) => void;
}

const Tests: Test[] = [
  {
    name: "Fonts",
    description: "Test each user font",
    action: () => FontTests(),
  },
  {
    name: "Expression picker",
    description: "Test the emoji and GIF picker",
    action: (target) => ExpressionPickerTests(target),
  },
];

const createTestingPage = () => {
  const ac = new AbortController();
  const { signal } = ac;
  const app = document.getElementById("app")!;
  const updateResponsiveClasses = () => {
    document.body.classList.toggle("mobileWidth", isMobileWidth());
    document.body.classList.toggle("desktopWidth", !isMobileWidth());
  };
  updateResponsiveClasses();
  window.addEventListener("resize", updateResponsiveClasses, { signal });

  const content = (
    <div class={style.container}>
      <SettingsBlock.Group class={style.group}>
        {Tests.map((test, i) => (
          <SettingsBlock.Root clickable data-index={i}>
            <SettingsBlock.Details
              title={test.name}
              description={test.description}
            />
          </SettingsBlock.Root>
        ))}
      </SettingsBlock.Group>
    </div>
  ) as HTMLFormElement;

  content.addEventListener(
    "click",
    (e) => {
      const blockClicked = closestFromEvent(e, "[data-index]");
      if (!blockClicked) return;
      const index = Number(blockClicked.dataset.index);
      Tests[index]?.action(blockClicked);
    },
    { signal },
  );

  const destroy = () => {
    ac.abort();
    content.remove();
  };

  const render = () => {
    app.replaceChildren(content);
  };

  return { render, destroy };
};

function FontTests() {
  const ac = new AbortController();

  createModal(
    () => (
      <Modal.Root>
        <Modal.Body>
          {Fonts.map((font) => (
            <div class={style.fontContainer}>
              <span class={["font", font.class, style.text]}>
                {font.name} <br />
              </span>
            </div>
          ))}
        </Modal.Body>
      </Modal.Root>
    ),
    ac,
  );
}

function ExpressionPickerTests(target: HTMLElement) {
  ExpressionPickerLazy({
    targetEl: target,
    onEmojiPick: () => {},
  });
}

export default createTestingPage;

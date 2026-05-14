import { css } from "@linaria/core";
import { t } from "@lingui/core/macro";

import { Button } from "../components/button";
import { Input } from "../components/input";
import { h } from "../h";
import { postLogin } from "../services/authService";
import { setLocalItem } from "../utils/localStorage";
import { router } from "../utils/router";

const loginPage = css`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  width: 100%;
  overflow: auto;
  .container {
    display: flex;
    flex-direction: column;
    max-width: 256px;
    width: 100%;
    padding-left: 8px;
    padding: 8px;
  }
  .inputs {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 8px;
    margin-top: 18px;
  }
  .title {
    font-size: 24px;
    font-weight: bold;
    color: var(--primary-color);
  }
  .error {
    display: none;
    color: var(--alert-color);
    font-size: 14px;
  }
  .loginButton {
    margin-top: 8px;
    .icon {
      font-size: 18px;
    }
  }
`;

export const createLoginPage = () => {
  const app = document.getElementById("app")!;

  const contentPane = (
    <div class={loginPage}>
      <div class="container">
        <div class="title">{t`Login to continue`}</div>
        <div class="inputs">
          <Input class="emailInput" label={t`Email`} />
          <Input class="passwordInput" label={t`Password`} type="password" />
        </div>
        <div class="error"></div>
        <Button class="loginButton" icon="login" label={t`Login`} primary />
      </div>
    </div>
  ) as unknown as HTMLDivElement;

  const abortController = new AbortController();

  let loggingIn = false;

  const loginButton = contentPane.querySelector(".loginButton")!;
  const loginText = loginButton.querySelector(".label")!;
  const emailInput = contentPane.querySelector(
    ".emailInput input",
  )! as HTMLInputElement;
  const passwordInput = contentPane.querySelector(
    ".passwordInput input",
  )! as HTMLInputElement;
  const error = contentPane.querySelector(".error")! as HTMLDivElement;

  const resetError = () => {
    error.textContent = "";
    error.style.display = "none";
  };

  const setError = (message: string) => {
    error.textContent = message;
    error.style.display = "block";
    loginText.textContent = t`Login`;
    loggingIn = false;
  };

  loginButton.addEventListener(
    "click",
    async () => {
      if (loggingIn) return;
      loggingIn = true;
      resetError();
      loginText.textContent = t`Logging in...`;

      const email = emailInput.value as string;
      const password = passwordInput.value as string;

      const [res, err] = await postLogin({ email, password });
      if (err) {
        setError(err.message);
        return;
      }
      setLocalItem("userToken", res.token);
      router.navigate("/app/", { replace: true });
    },
    { signal: abortController.signal },
  );

  const destroy = () => {
    abortController.abort();
  };

  const render = () => {
    app.replaceChildren(contentPane);
  };

  return { render, destroy };
};

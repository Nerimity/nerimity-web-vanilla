import { t } from "@lingui/core/macro";

import { Button } from "../components/button";
import { Input } from "../components/input";
import { h } from "../h";
import { postLogin } from "../services/authService";
import { setLocalItem } from "../utils/localStorage";
import { router } from "../utils/router";

import style from "./LoginPage.module.css";

const createLoginPage = () => {
  const app = document.getElementById("app")!;
  const form = (
    <form class={style.inputs}>
      <Input class="emailInput" label={t`Email`} autocomplete="email" />
      <Input
        class="passwordInput"
        label={t`Password`}
        type="password"
        autocomplete="current-password"
      />
      <div class={style.error}></div>
      <Button class={style.loginButton} icon="login" label={t`Login`} primary />
    </form>
  ) as unknown as HTMLFormElement;

  const contentPane = (
    <div class={style.loginPage}>
      <div class={style.container}>
        <div class={style.title}>{t`Login to continue`}</div>
        {form}
      </div>
    </div>
  ) as unknown as HTMLDivElement;

  const abortController = new AbortController();

  let loggingIn = false;

  const loginButton = contentPane.querySelector(`.${style.loginButton}`)!;
  const loginText = loginButton.querySelector(".label")!;
  const emailInput = contentPane.querySelector(
    ".emailInput input",
  )! as HTMLInputElement;
  const passwordInput = contentPane.querySelector(
    ".passwordInput input",
  )! as HTMLInputElement;
  const error = contentPane.querySelector(`.${style.error}`)! as HTMLDivElement;

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

  const handleLogin = async () => {
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
  };

  form.addEventListener(
    "submit",
    (e) => {
      e.preventDefault();
      handleLogin();
    },
    {
      signal: abortController.signal,
    },
  );

  const destroy = () => {
    abortController.abort();
    contentPane.remove();
  };

  const render = () => {
    app.replaceChildren(contentPane);
  };

  return { render, destroy };
};

export default createLoginPage;

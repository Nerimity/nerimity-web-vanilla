import { t } from "@lingui/core/macro";

import { createCaptcha } from "../components/createCaptcha";
import { Notice } from "../components/Notice";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { registerRequest } from "../services/authService";
import { setLocalItem } from "../utils/localStorage";
import { Header } from "./Header";

import style from "./RegisterPage.module.css";

const createRegisterPage = () => {
  const abortController = new AbortController();

  const app = document.getElementById("app")!;

  let captchaToken = "";
  const captcha = createCaptcha({
    signal: abortController.signal,
    onVerify(token) {
      captchaToken = token;
    },
  });

  const form = (
    <form class={style.inputs}>
      <Input
        icon="mail"
        class="emailInput"
        label={t`Email`}
        autocomplete="email"
      />
      <Input
        icon="alternate_email"
        class="usernameInput"
        label={t`Username`}
        autocomplete="username"
      />
      <Input
        icon="key"
        class="passwordInput"
        label={t`Password`}
        type="password"
        autocomplete="new-password"
      />
      <Input
        icon="key"
        class="passwordConfirmInput"
        label={t`Confirm Password`}
        type="password"
        autocomplete="new-password"
      />
      {captcha.element}
      <div class={style.error}></div>
      <Button
        class={style.loginButton}
        icon="add"
        label={t`Register`}
        primary
      />
    </form>
  ) as unknown as HTMLFormElement;

  const contentPane = (
    <div class={style.page}>
      <Header padding signal={abortController.signal} />
      <div class={style.container}>
        <div class={style.title}>{t`Welcome to Nerimity!`}</div>
        <Notice
          type="info"
          description={[
            t`Do not be toxic.`,
            t`No NSFW content.`,
            t`You must be 14 or older.`,
          ]}
        />
        {form}

        <Button icon="login" href="/login" label={t`Login`} hoverBorder />
      </div>
    </div>
  ) as unknown as HTMLDivElement;

  let requesting = false;

  const loginButton = contentPane.querySelector(`.${style.loginButton}`)!;
  const loginText = loginButton.querySelector(".label")!;

  const emailInput = contentPane.querySelector(
    ".emailInput input",
  )! as HTMLInputElement;
  const usernameInput = contentPane.querySelector(
    ".usernameInput input",
  )! as HTMLInputElement;

  const passwordInput = contentPane.querySelector(
    ".passwordInput input",
  )! as HTMLInputElement;
  const passwordConfirmInput = contentPane.querySelector(
    ".passwordConfirmInput input",
  )! as HTMLInputElement;

  const error = contentPane.querySelector(`.${style.error}`)! as HTMLDivElement;

  const resetError = () => {
    error.textContent = "";
    error.style.display = "none";
  };

  const setError = (message: string) => {
    error.textContent = message;
    error.style.display = "block";
    loginText.textContent = t`Register`;
    requesting = false;
  };

  const handleRegister = async () => {
    const email = emailInput.value as string;
    const username = usernameInput.value as string;
    const password = passwordInput.value as string;
    const passwordConfirm = passwordConfirmInput.value as string;
    if (requesting) return;
    resetError();

    if (password !== passwordConfirm) {
      setError(t`Confirm password does not match.`);
      return;
    }

    if (password.length > 72) {
      setError(t`Password must be less than 72 characters.`);
      return;
    }

    requesting = true;
    loginText.textContent = t`Registering...`;

    const [res, err] = await registerRequest({
      email,
      password,
      token: captchaToken,
      username,
    });
    if (err) {
      captcha.reset();
      setError(err.message);
      return;
    }
    setLocalItem("userToken", res.token);

    location.replace("/app/");
  };

  form.addEventListener(
    "submit",
    (e) => {
      e.preventDefault();
      handleRegister();
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

export default createRegisterPage;

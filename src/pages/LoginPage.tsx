import { t } from "@lingui/core/macro";

import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { postLogin } from "../services/authService";
import { createGoogleAccountLink } from "../services/userService";
import { closestFromEvent } from "../utils/dom";
import { setLocalItem } from "../utils/localStorage";
import { router } from "../utils/router";
import { Header } from "./Header";

import style from "./LoginPage.module.css";

const createLoginPage = () => {
  const abortController = new AbortController();

  const getQuery = router.query<{ redirect?: string; code?: string }>();

  const app = document.getElementById("app")!;
  const form = (
    <form class={style.inputs}>
      <Input
        icon="alternate_email"
        class="emailInput"
        label={t`Email / username:tag`}
        autocomplete="username"
      />
      <Input
        icon="key"
        class="passwordInput"
        label={t`Password`}
        type="password"
        autocomplete="current-password"
      />
      <div class={style.error}></div>
      <Button class={style.loginButton} icon="login" label={t`Login`} primary />
    </form>
  ) as unknown as HTMLFormElement;

  let platform = "Google";

  const contentPane = (
    <div class={style.loginPage}>
      <Header padding signal={abortController.signal} />
      <div class={style.container}>
        <div class={style.title}>{t`Login to continue`}</div>
        {form}
        <div class={style.otherButtons}>
          <Button
            iconSrc="/third-party/google.svg"
            data-action="login_google"

            label={t`Login with ${platform}`}
          />
          <Button
            href="/register"
            icon="add"
            hoverBorder
            label={t`Create an Account`}
          />
        </div>
      </div>
    </div>
  ) as unknown as HTMLDivElement;

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

  const handleLogin = async (googleCode?: string) => {
    if (loggingIn) return;
    loggingIn = true;
    resetError();
    loginText.textContent = t`Logging in...`;

    const email = emailInput.value as string;
    const password = passwordInput.value as string;

    const [res, err] = await postLogin({ email, password, googleCode });
    if (err) {
      setError(err.message);
      return;
    }
    setLocalItem("userToken", res.token);

    const redirect = getQuery().redirect;

    if (redirect) {
      try {
        const redirectUrl = new URL(redirect, window.location.origin);

        if (redirectUrl.origin === window.location.origin) {
          location.replace(redirectUrl.href);
          return;
        }
      } catch {}
    }

    location.replace("/app/");
  };

  if (getQuery().code) {
    handleLogin(getQuery().code);
    router.setQuery("code", null);
  }

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

  contentPane.addEventListener("click", (e) => {
    if (closestFromEvent(e, `[data-action="login_google"]`)) {
      createGoogleAccountLink(true).then(([link]) => {
        if (link) {
          window.location.href = link;
        }
      });
    }
  });

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

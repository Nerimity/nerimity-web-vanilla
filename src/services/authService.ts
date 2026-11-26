import { request } from "./request";

interface LoginOpts {
  email: string;
  password: string;
  googleCode?: string;
}
export const postLogin = (opts: LoginOpts) => {
  const isUsernameAndTag = opts.email.includes(":");

  return request<{ token: string }>(`/users/login`, {
    method: "POST",
    body: {
      ...(isUsernameAndTag
        ? { usernameAndTag: opts.email }
        : { email: opts.email }),
      password: opts.password,
      ...(opts.googleCode ? { googleCode: opts.googleCode } : {}),
    },
  });
};

interface RegisterOpts {
  email: string;
  username: string;
  password: string;
  token: string;
}
export const registerRequest = (opts: RegisterOpts) => {
  const { email, password, token, username } = opts;
  return request<{ token: string }>(`/users/register`, {
    method: "POST",
    body: {
      email,
      username,
      password,
      token,
    },
  });
};

import { request } from "./request";

interface LoginOpts {
  email: string;
  password: string;
  googleCode?: string;
}
export const postLogin = async (opts: LoginOpts) => {
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

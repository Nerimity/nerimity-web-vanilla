import { request } from "./request";

interface LoginBody {
  email: string;
  password: string;
}
export const postLogin = async (body: LoginBody) => {
  return request<{ token: string }>(
    `/users/login
`,
    {
      method: "POST",
      body,
    },
  );
};

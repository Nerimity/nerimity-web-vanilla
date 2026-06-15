import { cdnUrl } from "../config";
import { getLocalItem, setLocalItem } from "../utils/localStorage";
import { request, xhrRequest } from "./request";

const generateToken = async (channelId?: string, userToken?: string | null) => {
  const tokens = getLocalItem("cdnToken", [])!;

  const existingToken = tokens.find((t) => t.channelId === channelId);

  if (existingToken) {
    const expired = Date.now() - existingToken.createdAt > 2 * 60 * 1000;
    if (!expired) {
      return existingToken.token;
    }
  }

  const [res, error] = await request<{ token: string }>(
    (channelId ? `/channels/${channelId}` : "") + "/cdn/token",
    { useToken: userToken || true, method: "POST" },
  );
  if (error) throw error;

  const newToken = {
    token: res.token,
    channelId,
    createdAt: Date.now(),
  };

  setLocalItem("cdnToken", [
    newToken,
    ...tokens
      .filter((t) => Date.now() - t.createdAt <= 2 * 60 * 1000)
      .slice(0, 9),
  ]);

  return res.token;
};

export async function nerimityCDNUploadRequest(opts: {
  type: "avatars" | "profile_banners" | "emojis" | "attachments";
  channelId?: string;
  points?: number[];
  file: File;
  groupId?: string;
  userToken?: string | null;
  onUploadProgress?: (percent: number, speed?: string) => void;
}) {
  const url = new URL(`${cdnUrl}${opts.type}/${opts.groupId || ""}`);

  return xhrRequest<{ fileId: string }>(url.href, {
    method: "POST",
    file: opts.file,
    params: opts.points ? { points: JSON.stringify(opts.points) } : undefined,
    useToken: await generateToken(opts.channelId, opts.userToken),
    onProgress: opts.onUploadProgress,
  });
}

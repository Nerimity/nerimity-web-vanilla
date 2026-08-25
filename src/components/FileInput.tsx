import { ph, t } from "@lingui/core/macro";

import { alert } from "./modal";

export const createFileInput = (opts: {
  signal: AbortSignal;
  onChange: (file?: File) => void;
  imageOnly?: boolean;
  maxSize?: number;
}) => {
  let input = document.createElement("input");
  input.type = "file";
  if (opts.imageOnly) {
    input.accept = "image/gif, image/webp, image/png, image/jpeg, image/avif";
  }

  input.addEventListener(
    "change",
    (event) => {
      const target = event.target as HTMLInputElement;
      const file = target.files?.[0];

      if (file && opts.maxSize && file?.size > opts.maxSize) {
        alert({
          message: t`Maximum file size allowed is ${ph({ size: opts.maxSize / (1024 * 1024) })} MB`,
        });
      } else {
        opts.onChange(file);
      }

      target.value = "";
    },
    { signal: opts.signal },
  );
  const trigger = () => input.click();

  opts.signal.addEventListener(
    "abort",
    () => {
      input.remove();
      (input as any) = null;
    },
    { once: true },
  );

  return { trigger };
};

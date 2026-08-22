export const createFileInput = (opts: {
  signal: AbortSignal;
  onChange: (file?: File) => void;
  imageOnly?: boolean;
}) => {
  const input = document.createElement("input");
  input.type = "file";
  if (opts.imageOnly) {
    input.accept = "image/gif, image/webp, image/png, image/jpeg, image/avif";
  }

  input.addEventListener(
    "change",
    (event) => {
      const target = event.target as HTMLInputElement;
      const file = target.files?.[0];
      opts.onChange(file);
      target.value = "";
    },
    { signal: opts.signal },
  );
  const trigger = () => input.click();
  return { input, trigger };
};

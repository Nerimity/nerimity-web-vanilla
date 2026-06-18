export const createFileInput = (opts: {
  signal: AbortSignal;
  onChange: (file?: File) => void;
}) => {
  const input = document.createElement("input");
  input.type = "file";

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
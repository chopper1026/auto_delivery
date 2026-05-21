export function copyWithTextareaFallback(text: string) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  textarea.setSelectionRange(0, text.length);
  const copied = document.execCommand("copy");
  document.body.removeChild(textarea);
  return copied;
}

export function copyText(text: string) {
  const fallbackCopied = copyWithTextareaFallback(text);
  if (!navigator.clipboard?.writeText) return Promise.resolve(fallbackCopied);

  return navigator.clipboard
    .writeText(text)
    .then(() => true)
    .catch(() => fallbackCopied);
}

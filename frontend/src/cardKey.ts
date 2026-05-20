function groupEveryFour(value: string) {
  return value.match(/.{1,4}/g) ?? [];
}

export function isAllowedCardKeyInputData(data: string | null): boolean {
  return data === null || /^[A-Za-z0-9\s-]*$/.test(data);
}

export function isAllowedCardKeyCompositionInput(input: { inputType?: string | null; isComposing?: boolean }): boolean {
  if (input.isComposing) return false;
  return !["insertCompositionText", "insertFromComposition", "deleteCompositionText"].includes(input.inputType ?? "");
}

export function applyCardKeyInputData(input: {
  value: string;
  data: string;
  selectionStart: number | null;
  selectionEnd: number | null;
}): string {
  const start = input.selectionStart ?? input.value.length;
  const end = input.selectionEnd ?? start;
  const nextValue = `${input.value.slice(0, start)}${input.data}${input.value.slice(end)}`;
  return formatCardKeyInput(nextValue);
}

export function formatCardKeyInput(input: string): string {
  const cleaned = input.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!cleaned) return "";
  if ("AD".startsWith(cleaned) && cleaned.length < 2) return cleaned;
  if (cleaned === "AD") return "AD";
  const body = (cleaned.startsWith("AD") ? cleaned.slice(2) : cleaned).slice(0, 16);
  if (!body) return "AD";
  return ["AD", ...groupEveryFour(body)].join("-");
}

export function isAllowedCardKey(value: string): boolean {
  return /^AD-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(formatCardKeyInput(value));
}

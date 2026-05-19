function groupEveryFour(value: string) {
  return value.match(/.{1,4}/g) ?? [];
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

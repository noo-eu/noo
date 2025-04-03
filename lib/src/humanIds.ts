export function uuidToHumanId(uuid: string, prefix: string) {
  return `${prefix}_${uuidToBase62(uuid)}`;
}

export function humanIdToUuid(humanId: string, expectedPrefix: string) {
  const parts = humanId.split("_");
  const id = parts[parts.length - 1];
  const prefix = parts.slice(0, -1).join("_");

  if (prefix !== expectedPrefix) {
    return undefined;
  }

  return base62ToUuid(id);
}

const BASE62_ALPHABET =
  "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

export function hexToBase62(hex: string) {
  let asNumber = BigInt(`0x${hex}`);

  let result = "";
  while (asNumber > 0) {
    const remainder = Number(asNumber % BigInt(BASE62_ALPHABET.length));
    result = BASE62_ALPHABET[remainder] + result;
    asNumber /= BigInt(BASE62_ALPHABET.length);
  }

  return result;
}

export function base62ToHex(base62: string) {
  let result = BigInt(0);

  for (const char of base62) {
    const value = BigInt(BASE62_ALPHABET.indexOf(char));
    result = result * BigInt(BASE62_ALPHABET.length) + value;
  }

  return result.toString(16);
}

export function uuidToBase62(uuid: string) {
  return hexToBase62(uuid.replace(/-/g, ""));
}

export function base62ToUuid(base62: string) {
  const hex = base62ToHex(base62).padStart(32, "0");
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join("-");
}

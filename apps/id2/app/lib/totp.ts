export function verifyTotpWithTolerance(
  secret: string,
  totp: string,
  tolerance: number = 5,
  timestamp: number = Date.now(),
): boolean {
  const attempts = [
    timestamp,
    timestamp - tolerance * 1000,
    timestamp + tolerance * 1000,
  ];

  for (const attempt of attempts) {
    if (generateTotp(secret, attempt) === totp) {
      return true;
    }
  }

  return false;
}

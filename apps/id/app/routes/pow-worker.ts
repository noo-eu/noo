self.onmessage = async (event) => {
  console.log("Worker received message:", event.data);

  const result = await startPow({
    challenge: "we3imeceonvwcriounsiwuencoiun",
    difficulty: 18,
    algorithm: "sha256",
  });

  self.postMessage(result);
};

export {};

type PowRequest = {
  // A base64url encoded string representing the challenge. This is a random
  // sequence of bytes that the client must find a nonce for.
  challenge: string;

  // A number representing the number if leading zero bits in the target value.
  difficulty: number;

  // The algorithm used for the challenge. This is either "SHA256" or "Argon2id".
  algorithm: "sha256" | "argon2id";
};

async function startPow(request: PowRequest) {
  const { challenge, difficulty, algorithm } = request;

  // Set a few bytes aside for the nonce.
  const nonceSize = 4;
  const buffer = new Uint8Array(challenge.length + nonceSize);

  // Write the challenge bytes to the buffer.
  buffer.set(new TextEncoder().encode(challenge), 0);

  // Helper to update the nonce portion of the buffer in big-endian.
  function updateNonce(nonce: number) {
    const offset = challenge.length;
    buffer[offset] = (nonce >> 24) & 0xff;
    buffer[offset + 1] = (nonce >> 16) & 0xff;
    buffer[offset + 2] = (nonce >> 8) & 0xff;
    buffer[offset + 3] = nonce & 0xff;
  }

  // Construct a 256-bit target value based on the difficulty.
  // 2^N is represented exactly in double precision (up to N = 1023),
  // so there's no need to use BigInt for the math.
  const target = BigInt(2 ** (256 - difficulty));

  let nonce = 0;
  while (true) {
    updateNonce(nonce);

    // Compute SHA-256 hash of the buffer.
    const arrayBuffer = await hash(algorithm, buffer);

    // Convert the hash to a big-int.
    let hashBigInt = BigInt(0);
    const hashArray = new Uint8Array(arrayBuffer);
    for (let i = 0; i < hashArray.length; i++) {
      hashBigInt = (hashBigInt << BigInt(8)) | BigInt(hashArray[i]);
    }

    // Check if the hash is less than the target.
    if (hashBigInt < target) {
      // If the hash is less than the target, return the nonce.
      return {
        nonce,
      };
    }

    nonce++;
  }
}

async function hash(algorithm: "sha256" | "argon2id", buffer: Uint8Array) {
  if (algorithm === "argon2id") {
    throw new Error("Argon2id is not supported in WebCrypto");
  }

  return await self.crypto.subtle.digest("SHA-256", buffer);
}

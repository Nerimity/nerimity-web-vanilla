const PBKDF2_ITERATIONS = 250_000;
const SALT_LENGTH = 16;
const IV_LENGTH = 12;

async function deriveKey(
  secret: string,
  salt: Uint8Array<ArrayBuffer>,
): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    "PBKDF2",
    false,
    ["deriveKey"],
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function encrypt(text: string, secret: string): Promise<string> {
  const salt = new Uint8Array(new ArrayBuffer(SALT_LENGTH));
  crypto.getRandomValues(salt);

  const iv = new Uint8Array(new ArrayBuffer(IV_LENGTH));
  crypto.getRandomValues(iv);

  const key = await deriveKey(secret, salt);
  const encoded = new TextEncoder().encode(text);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoded,
  );

  const combined = new Uint8Array(
    salt.length + iv.length + ciphertext.byteLength,
  );
  combined.set(salt, 0);
  combined.set(iv, salt.length);
  combined.set(new Uint8Array(ciphertext), salt.length + iv.length);

  return btoa(String.fromCharCode(...combined));
}

export async function decrypt(
  encrypted: string,
  secret: string,
): Promise<string> {
  const combined = Uint8Array.from(atob(encrypted), (c) => c.charCodeAt(0));

  const salt = combined.slice(0, SALT_LENGTH);
  const iv = combined.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const ciphertext = combined.slice(SALT_LENGTH + IV_LENGTH);

  const key = await deriveKey(secret, salt as Uint8Array<ArrayBuffer>);
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv as Uint8Array<ArrayBuffer> },
    key,
    ciphertext,
  );

  return new TextDecoder().decode(decrypted);
}

export function generateSecret(length = 32): string {
  const bytes = new Uint8Array(new ArrayBuffer(length));
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

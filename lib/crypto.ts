// @ts-nocheck

import { hash } from "@/lib/chain";

function arrayBufferToBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";

  for (let i = 0; i < bytes.byteLength; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }

  return btoa(binary);
}

function base64ToArrayBuffer(base64: string) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes.buffer;
}

export function createTransactionPayload(tx: any) {
  return {
    from: tx.from,
    to: tx.to,
    amount: Number(tx.amount || 0),
    fee: Number(tx.fee || 0),
    note: tx.note || "",
    createdAt: tx.createdAt || "",
  };
}

export function hashTransactionPayload(payload: any) {
  return hash(payload);
}

export async function generateSigningKeypair() {
  if (typeof crypto === "undefined" || !crypto.subtle) {
    throw new Error("Web Crypto API is not available in this environment.");
  }

  const keyPair = await crypto.subtle.generateKey(
    {
      name: "ECDSA",
      namedCurve: "P-256",
    },
    true,
    ["sign", "verify"]
  );

  const publicKeyBuffer = await crypto.subtle.exportKey("spki", keyPair.publicKey);
  const privateKeyBuffer = await crypto.subtle.exportKey("pkcs8", keyPair.privateKey);

  return {
    publicKey: arrayBufferToBase64(publicKeyBuffer),
    privateKey: arrayBufferToBase64(privateKeyBuffer),
  };
}

export async function importPrivateKey(privateKey: string) {
  return crypto.subtle.importKey(
    "pkcs8",
    base64ToArrayBuffer(privateKey),
    {
      name: "ECDSA",
      namedCurve: "P-256",
    },
    true,
    ["sign"]
  );
}

export async function importPublicKey(publicKey: string) {
  return crypto.subtle.importKey(
    "spki",
    base64ToArrayBuffer(publicKey),
    {
      name: "ECDSA",
      namedCurve: "P-256",
    },
    true,
    ["verify"]
  );
}

export async function signPayload(payload: any, privateKey: string) {
  const key = await importPrivateKey(privateKey);
  const encodedPayload = new TextEncoder().encode(JSON.stringify(payload));

  const signatureBuffer = await crypto.subtle.sign(
    {
      name: "ECDSA",
      hash: "SHA-256",
    },
    key,
    encodedPayload
  );

  return arrayBufferToBase64(signatureBuffer);
}

export async function verifyPayloadSignature(payload: any, signature: string, publicKey: string) {
  const key = await importPublicKey(publicKey);
  const encodedPayload = new TextEncoder().encode(JSON.stringify(payload));

  return crypto.subtle.verify(
    {
      name: "ECDSA",
      hash: "SHA-256",
    },
    key,
    base64ToArrayBuffer(signature),
    encodedPayload
  );
}

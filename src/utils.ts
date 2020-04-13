import sha256 from "crypto-js/sha256";
import { enc } from "crypto-js";

function urlSafeSha256(value: string) {
  return sha256(value)
    .toString(enc.Base64)
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

export function hash(record: any) {
  let stringifiedRecord: string;

  try {
    stringifiedRecord = JSON.stringify(record);
  } catch (err) {
    // TODO: handle error better
    throw "💥";
  }

  return urlSafeSha256(stringifiedRecord);
}

export class Cache {
  enabled = true;
  private store = new Map<string, any>();

  fetch = <T>(keyParts: any[], query: () => T): T => {
    if (this.enabled && this.store.has(hash(keyParts))) {
      return this.store.get(hash(keyParts));
    }

    const value = query();

    if (this.enabled) this.store.set(hash(keyParts), value);

    return value;
  };
}

export function compact<T>(arr: Array<T | null | undefined>): T[] {
  return arr.reduce((memo, item) => {
    if (item == null) {
      return memo;
    }

    return memo.concat([item]);
  }, [] as Array<T>);
}

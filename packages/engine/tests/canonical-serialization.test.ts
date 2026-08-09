import {
  CanonicalSerializationError,
  canonicalDescriptorV1,
  canonicalStringifyV1,
  hashCanonicalV1,
  sha256Hex,
} from "../src";
import { describe, expect, it } from "vitest";

describe("canonical JSON v1 and portable SHA-256", () => {
  it("sorts record keys while preserving array order and Unicode", () => {
    const first = { zebra: [3, 2, 1], alpha: { café: "花札", enabled: true }, middle: null };
    const second = { middle: null, alpha: { enabled: true, café: "花札" }, zebra: [3, 2, 1] };
    expect(canonicalStringifyV1(first)).toBe(
      '{"alpha":{"café":"花札","enabled":true},"middle":null,"zebra":[3,2,1]}',
    );
    expect(canonicalStringifyV1(second)).toBe(canonicalStringifyV1(first));
    expect(hashCanonicalV1(second)).toBe(hashCanonicalV1(first));
    expect(hashCanonicalV1({ ...second, zebra: [1, 2, 3] })).not.toBe(hashCanonicalV1(first));
  });

  it("matches the published SHA-256 empty and abc vectors", () => {
    expect(sha256Hex("")).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
    expect(sha256Hex("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });

  it("rejects values that cannot participate in the versioned hash contract", () => {
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    const sparse = [1, 2, 3];
    delete sparse[1];
    const accessor = Object.create(null) as Record<string, unknown>;
    Object.defineProperty(accessor, "value", { enumerable: true, get: () => 1 });
    const arrayAccessor = [1];
    Object.defineProperty(arrayAccessor, "0", { enumerable: true, get: () => 1 });
    const arrayNonenumerable = [1];
    Object.defineProperty(arrayNonenumerable, "0", { enumerable: false, value: 1 });
    const arrayExtra = [1] as number[] & { secret?: number };
    arrayExtra.secret = 2;
    for (const value of [
      undefined,
      Number.NaN,
      1.5,
      Number.MAX_SAFE_INTEGER + 1,
      1n,
      new Date(0),
      cyclic,
      sparse,
      accessor,
      arrayAccessor,
      arrayNonenumerable,
      arrayExtra,
    ]) {
      expect(() => canonicalStringifyV1(value)).toThrow(CanonicalSerializationError);
    }
  });

  it("returns an immutable, versioned descriptor", () => {
    const descriptor = canonicalDescriptorV1({ b: 2, a: 1 });
    expect(descriptor).toEqual({
      canonicalizationVersion: 1,
      algorithm: "sha256",
      hash: "sha256:43258cff783fe7036d8a43033f830adfc60ec037382473548ac742b888292777",
    });
    expect(Object.isFrozen(descriptor)).toBe(true);
  });
});

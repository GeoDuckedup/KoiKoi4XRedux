import { describe, expect, it } from "vitest";

import {
  createDerivativePlan,
  validateTransformValue,
  type AutoTransform,
  type ManualTransform,
} from "../src/index.ts";

describe("normalized transform math", () => {
  it("produces deterministic cover metadata", () => {
    const transform: AutoTransform = { mode: "auto", fit: "cover", focusX: 0.7, focusY: 0.5 };
    const first = createDerivativePlan(
      { width: 2400, height: 2560 },
      { width: 640, height: 1024 },
      transform,
    );
    const second = createDerivativePlan(
      { width: 2400, height: 2560 },
      { width: 640, height: 1024 },
      transform,
    );
    expect(second).toEqual(first);
    expect(first.normalizedSourceCrop).toEqual({
      x: 0.333333333333,
      y: 0,
      width: 0.666666666667,
      height: 1,
    });
    expect(Object.isFrozen(first)).toBe(true);
  });

  it("reproduces manual composition independently from output resolution", () => {
    const transform: ManualTransform = {
      mode: "manual",
      crop: { x: 0.04, y: 0.03, width: 0.92, height: 0.94 },
      zoom: 1.04,
      rotationDeg: 0,
    };
    const table = createDerivativePlan(
      { width: 1600, height: 2560 },
      { width: 640, height: 1024 },
      transform,
    );
    const thumbnail = createDerivativePlan(
      { width: 1600, height: 2560 },
      { width: 160, height: 256 },
      transform,
    );
    expect(table.normalizedSourceCrop).toEqual(thumbnail.normalizedSourceCrop);
    expect(table.sourcePixelCrop).toEqual(thumbnail.sourcePixelCrop);
    expect(table.output).not.toEqual(thumbnail.output);
  });

  it("models contain without destructive cropping", () => {
    const plan = createDerivativePlan(
      { width: 1600, height: 1600 },
      { width: 640, height: 1024 },
      { mode: "auto", fit: "contain", focusX: 0.5, focusY: 0.5 },
    );
    expect(plan.normalizedSourceCrop).toEqual({ x: 0, y: 0, width: 1, height: 1 });
    expect(plan.normalizedContentBox).toEqual({ x: 0, y: 0.1875, width: 1, height: 0.625 });
  });

  it("rejects out-of-range focal, crop, zoom, and rotation values", () => {
    expect(
      validateTransformValue({ mode: "auto", fit: "cover", focusX: 1.1, focusY: 0.5 }).map(
        (issue) => issue.code,
      ),
    ).toContain("FOCUS");
    expect(
      validateTransformValue({
        mode: "manual",
        crop: { x: 0.8, y: 0, width: 0.4, height: 1 },
        zoom: 0,
        rotationDeg: Number.POSITIVE_INFINITY,
      }).map((issue) => issue.code),
    ).toEqual(expect.arrayContaining(["CROP_BOUNDS", "ZOOM", "ROTATION"]));
  });
});

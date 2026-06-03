import { describe, expect, it } from "vitest";
import { createJobDedupeKey } from "./job-dedupe";

describe("job dedupe", () => {
  it("normalizes punctuation and simple US location differences", () => {
    const first = createJobDedupeKey({
      title: "Software Developer",
      employer: "NRT Technology Corp",
      location: "Las Vegas, NV, US",
    });
    const second = createJobDedupeKey({
      title: "Software Developer",
      employer: "NRT Technology Corp.",
      location: "Las Vegas, Nevada",
    });

    expect(second).toBe(first);
  });
});

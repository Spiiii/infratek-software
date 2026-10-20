import assert from "node:assert/strict";
import test from "node:test";

import { PRE_CALIBRATION_POLICY_VERSION } from "./types.ts";
import {
  PREVIEW_MVP_POLICY_VERSION,
  requiresHumanHandoff,
  selectRuntimeDecisionPolicy,
} from "./preview-mvp-policy.ts";

test("Preview MVP gate defaults/fails closed and never enables production", () => {
  assert.equal(selectRuntimeDecisionPolicy({ previewMvpEnabled: false, vercelEnvironment: "preview" }).version, PRE_CALIBRATION_POLICY_VERSION);
  assert.equal(selectRuntimeDecisionPolicy({ previewMvpEnabled: true, vercelEnvironment: "production" }).version, PRE_CALIBRATION_POLICY_VERSION);
  assert.equal(selectRuntimeDecisionPolicy({ previewMvpEnabled: true, vercelEnvironment: "preview" }).version, PREVIEW_MVP_POLICY_VERSION);
});

test("commercial commitments and universal metrics hand off without blocking ordinary service questions", () => {
  assert.equal(requiresHumanHandoff("Cho tôi giá cố định và SLA ràng buộc"), true);
  assert.equal(requiresHumanHandoff("Có đảm bảo mọi khách hàng đạt 96% không?"), true);
  assert.equal(requiresHumanHandoff("Infratek cung cấp giải pháp OCR nào?"), false);
  assert.equal(requiresHumanHandoff("Case study đã ghi nhận kết quả gì?"), false);
});

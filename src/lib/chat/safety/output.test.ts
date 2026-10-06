import assert from "node:assert/strict";
import test from "node:test";

import { validateProtectedOutput } from "./output.ts";

test("supported protected values pass with safe formatting normalization", () => {
  const context = [
    "Hệ thống xử lý 1.000 tài liệu với độ chính xác 98%.",
    "Liên hệ 0901 671 671 hoặc TRONG.NGO@INFRATEK.VN.",
    "Dự án Microsoft 365 được triển khai trong 30 ngày.",
    "Infratek Software cam kết thời gian phản hồi 24 giờ.",
  ].join("\n");
  const answer = [
    "Hệ thống xử lý 1,000 tài liệu và đạt 98% [S1].",
    "Có thể gọi 0901-671-671 hoặc trong.ngo@infratek.vn [S1].",
    "Microsoft 365 được triển khai trong 30 ngày [S1].",
    "Infratek Software cam kết thời gian phản hồi 24 giờ [S1].",
  ].join(" ");
  assert.deepEqual(validateProtectedOutput(answer, context), {
    state: "SUPPORTED",
    unsupported: false,
  });
});

test("unsupported number and risky timeline fail even with a valid citation label", () => {
  const result = validateProtectedOutput(
    "Thời gian triển khai là 14 ngày [S1].",
    "Thời gian triển khai là 30 ngày.",
  );
  assert.equal(result.state, "SAFE_FALLBACK");
  if (result.state !== "SAFE_FALLBACK") return;
  assert.deepEqual(result.categories, ["UNSUPPORTED_NUMBER", "UNSUPPORTED_RISKY_CLAIM"]);
  assert.equal("answer" in result, false);
});

test("unsupported phone and email fail while equivalent supported values pass", () => {
  assert.equal(
    validateProtectedOutput("Gọi 0901-671-671 [S1].", "Điện thoại: +84 901 671 671.").state,
    "SUPPORTED",
  );
  const phone = validateProtectedOutput("Gọi 0988 111 222 [S1].", "Gọi 0901 671 671.");
  assert.equal(phone.state, "SAFE_FALLBACK");
  if (phone.state === "SAFE_FALLBACK") assert.deepEqual(phone.categories, ["UNSUPPORTED_PHONE"]);

  assert.equal(
    validateProtectedOutput("Email SALES@EXAMPLE.COM [S1].", "Email sales@example.com.").state,
    "SUPPORTED",
  );
  const email = validateProtectedOutput("Email fake@example.com [S1].", "Email sales@example.com.");
  assert.equal(email.state, "SAFE_FALLBACK");
  if (email.state === "SAFE_FALLBACK") assert.deepEqual(email.categories, ["UNSUPPORTED_EMAIL"]);
});

test("proper customer names require support in supplied context", () => {
  assert.equal(
    validateProtectedOutput("Microsoft 365 là nền tảng được sử dụng [S1].", "Giải pháp Microsoft 365.").state,
    "SUPPORTED",
  );
  const result = validateProtectedOutput(
    "Khách hàng Contoso Limited đã triển khai [S1].",
    "Một khách hàng ẩn danh đã triển khai.",
  );
  assert.equal(result.state, "SAFE_FALLBACK");
  if (result.state === "SAFE_FALLBACK") {
    assert.ok(result.categories.includes("UNSUPPORTED_PROPER_NAME"));
  }
});

test("multiple violations reject the complete output without repair", () => {
  const raw = "Contoso Limited cam kết ROI 300% trong 14 ngày, email fake@example.com [S1].";
  const result = validateProtectedOutput(raw, "Nội dung không có các dữ kiện này.");
  assert.equal(result.state, "SAFE_FALLBACK");
  if (result.state !== "SAFE_FALLBACK") return;
  assert.equal(result.unsupported, true);
  assert.ok(result.categories.length >= 4);
  assert.equal("answer" in result, false);
  assert.equal(JSON.stringify(result).includes(raw), false);
});

test("unsupported price and non-numeric commitment fail closed", () => {
  const price = validateProtectedOutput("Giá là 50 triệu đồng [S1].", "Không công bố giá.");
  assert.equal(price.state, "SAFE_FALLBACK");
  if (price.state === "SAFE_FALLBACK") {
    assert.ok(price.categories.includes("UNSUPPORTED_NUMBER"));
    assert.ok(price.categories.includes("UNSUPPORTED_RISKY_CLAIM"));
  }

  const commitment = validateProtectedOutput(
    "Infratek Software cam kết thành công tuyệt đối [S1].",
    "Infratek Software cung cấp dịch vụ tư vấn.",
  );
  assert.equal(commitment.state, "SAFE_FALLBACK");
  if (commitment.state === "SAFE_FALLBACK") {
    assert.ok(commitment.categories.includes("UNSUPPORTED_RISKY_CLAIM"));
  }
});

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

test("proper names match canonical contiguous tokens across casing and Vietnamese diacritics", () => {
  assert.equal(
    validateProtectedOutput("Core Banking hỗ trợ xử lý hồ sơ [S1].", "Tích hợp vào core banking workflow.").state,
    "SUPPORTED",
  );
  assert.equal(
    validateProtectedOutput("Giai Phap OCR hỗ trợ xử lý hồ sơ [S1].", "Giải Pháp OCR hỗ trợ xử lý hồ sơ.").state,
    "SUPPORTED",
  );
  assert.equal(
    validateProtectedOutput("Document AI hỗ trợ xử lý hồ sơ [S1].", "Nền tảng Document AI hỗ trợ xử lý hồ sơ.").state,
    "SUPPORTED",
  );
});

test("proper-name support requires exact contiguous token boundaries", () => {
  for (const context of [
    "Nền tảng MegaContoso LimitedServices không phải tên khách hàng.",
    "Contoso là tên ví dụ và Limited xuất hiện ở vị trí khác.",
  ]) {
    const result = validateProtectedOutput("Contoso Limited đã triển khai [S1].", context);
    assert.equal(result.state, "SAFE_FALLBACK");
    if (result.state === "SAFE_FALLBACK") {
      assert.ok(result.categories.includes("UNSUPPORTED_PROPER_NAME"));
    }
  }
});

test("a valid citation cannot authorize a proper name absent from context", () => {
  const result = validateProtectedOutput(
    "Contoso Limited đã triển khai [S1].",
    "[S1] mô tả một khách hàng ẩn danh.",
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

test("ordinary grounded service descriptions allow harmless paraphrasing", () => {
  const context = [
    "Infratek Software cung cấp các giải pháp AI và phần mềm cho doanh nghiệp.",
    "AI Consulting hỗ trợ xác định use case và lộ trình ứng dụng AI.",
    "Software Development thiết kế web app và hệ thống tích hợp AI.",
    "IT Outsourcing bổ sung nhân sự kỹ thuật hoặc dedicated team.",
  ].join("\n");

  for (const answer of [
    "Infratek Software triển khai các giải pháp AI và phần mềm cho doanh nghiệp [S1].",
    "AI Consulting hỗ trợ xác định use case và lộ trình ứng dụng AI [S1].",
    "Software Development thiết kế web app và hệ thống tích hợp AI [S2].",
    "IT Outsourcing bổ sung nhân sự kỹ thuật hoặc dedicated team [S3].",
  ]) {
    assert.equal(validateProtectedOutput(answer, context).state, "SUPPORTED");
  }
});

test("service assessment language is not misclassified as a price claim", () => {
  const context = [
    "Infratek Software cung cấp dịch vụ tư vấn AI cho doanh nghiệp.",
    "AI Consulting hỗ trợ xác định use case và lộ trình ứng dụng AI.",
  ].join("\n");

  assert.equal(
    validateProtectedOutput(
      "Infratek Software cung cấp AI Consulting để đánh giá mức độ sẵn sàng và xây dựng lộ trình ứng dụng AI [S1].",
      context,
    ).state,
    "SUPPORTED",
  );
  assert.equal(
    validateProtectedOutput(
      "Infratek Software cung cấp AI Consulting de danh gia muc do san sang [S1].",
      context,
    ).state,
    "SUPPORTED",
  );
});

test("actual price claims remain protected with and without Vietnamese diacritics", () => {
  for (const answer of ["Giá dịch vụ là 50 triệu đồng [S1].", "Gia dich vu la 50 trieu dong [S1]."]) {
    const result = validateProtectedOutput(answer, "Nguồn chỉ mô tả dịch vụ tư vấn AI.");
    assert.equal(result.state, "SAFE_FALLBACK");
    if (result.state === "SAFE_FALLBACK") {
      assert.ok(result.categories.includes("UNSUPPORTED_RISKY_CLAIM"));
      assert.ok(result.categories.includes("UNSUPPORTED_NUMBER"));
    }
  }
});

test("unsupported SLA, deployment deadline, ROI and contractual entitlement fail closed", () => {
  const context = "Infratek Software cung cấp dịch vụ tư vấn và triển khai giải pháp theo nhu cầu.";
  for (const answer of [
    "Infratek Software cam kết SLA hỗ trợ ưu tiên [S1].",
    "Infratek Software hoàn tất triển khai trong 7 ngày [S1].",
    "Infratek Software đảm bảo ROI 300% [S1].",
    "Hợp đồng mặc định bao gồm hỗ trợ trọn đời [S1].",
  ]) {
    assert.equal(validateProtectedOutput(answer, context).state, "SAFE_FALLBACK");
  }
});

test("historical case-study metrics cannot become universal guarantees", () => {
  const result = validateProtectedOutput(
    "Infratek Software đảm bảo mọi khách hàng đạt độ chính xác 96% [S1].",
    "Một dự án OCR ghi nhận độ chính xác 96% trong phạm vi case study.",
  );
  assert.equal(result.state, "SAFE_FALLBACK");
  if (result.state === "SAFE_FALLBACK") {
    assert.ok(result.categories.includes("UNSUPPORTED_RISKY_CLAIM"));
  }
});

test("risky keywords are recognized consistently with and without Vietnamese diacritics", () => {
  for (const answer of [
    "Hệ thống đảm bảo bảo mật dữ liệu [S1].",
    "He thong dam bao bao mat du lieu [S1].",
    "Hệ thống cam kết kiểm tra kết quả [S1].",
    "He thong cam ket kiem tra ket qua [S1].",
  ]) {
    const result = validateProtectedOutput(answer, "Nguồn chỉ mô tả chức năng OCR.");
    assert.equal(result.state, "SAFE_FALLBACK");
    if (result.state === "SAFE_FALLBACK") {
      assert.ok(result.categories.includes("UNSUPPORTED_RISKY_CLAIM"));
    }
  }

  assert.equal(
    validateProtectedOutput(
      "He thong dam bao bao mat du lieu [S1].",
      "Hệ thống đảm bảo bảo mật dữ liệu.",
    ).state,
    "SUPPORTED",
  );
});

test("risky keyword matching requires full token boundaries", () => {
  assert.equal(
    validateProtectedOutput("giátrị tài liệu được trích xuất [S1].", "ocr hỗ trợ tài liệu.").state,
    "SUPPORTED",
  );
  assert.equal(
    validateProtectedOutput("có thể trienkhaiable trong hệ thống [S1].", "ocr hỗ trợ tài liệu.").state,
    "SUPPORTED",
  );
});

test("citations cannot authorize unsupported unaccented risky claims", () => {
  const result = validateProtectedOutput(
    "He thong cam ket chinh xac tuyet doi [S1].",
    "[S1] mô tả quy trình OCR.",
  );
  assert.equal(result.state, "SAFE_FALLBACK");
  if (result.state === "SAFE_FALLBACK") {
    assert.ok(result.categories.includes("UNSUPPORTED_RISKY_CLAIM"));
  }
});

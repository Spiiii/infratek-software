// File: src/components/features/ai-readiness-assessment.tsx
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ClipboardCheck,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { assessmentQuestions, calculateAssessmentResult } from "@/data/assessment";
import { leadCaptureSchema, type LeadCaptureValues } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AssessmentResult } from "@/types";

type Step = "intro" | "questions" | "lead" | "result";

const levelLabels = {
  beginner: { label: "Mới bắt đầu", color: "bg-slate-100 text-slate-700" },
  intermediate: { label: "Trung cấp", color: "bg-blue-50 text-blue-700" },
  advanced: { label: "Nâng cao", color: "bg-primary/10 text-primary" },
  leader: { label: "AI Leader", color: "bg-gradient-primary text-white" },
};

export function AIReadinessAssessment() {
  const [step, setStep] = useState<Step>("intro");
  const [currentQ, setCurrentQ] = useState(0);
  const [scores, setScores] = useState<number[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [result, setResult] = useState<AssessmentResult | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LeadCaptureValues>({
    resolver: zodResolver(leadCaptureSchema),
  });

  const progress =
    step === "questions"
      ? ((currentQ + (selected !== null ? 0.5 : 0)) / assessmentQuestions.length) * 100
      : step === "lead"
        ? 90
        : step === "result"
          ? 100
          : 0;

  const handleNext = () => {
    if (selected === null) return;
    const newScores = [...scores, selected];
    setScores(newScores);
    setSelected(null);

    if (currentQ < assessmentQuestions.length - 1) {
      setCurrentQ(currentQ + 1);
    } else {
      setStep("lead");
    }
  };

  const handleBack = () => {
    if (currentQ > 0) {
      setCurrentQ(currentQ - 1);
      setScores(scores.slice(0, -1));
      setSelected(null);
    }
  };

  const onLeadSubmit = (data: LeadCaptureValues) => {
    // In production: send lead to API
    console.log("Lead captured:", data);
    const assessmentResult = calculateAssessmentResult(scores);
    setResult(assessmentResult);
    setStep("result");
  };

  const reset = () => {
    setStep("intro");
    setCurrentQ(0);
    setScores([]);
    setSelected(null);
    setResult(null);
  };

  return (
    <Card className="mx-auto max-w-2xl border-border shadow-elevated">
      <CardHeader className="border-b border-border pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <ClipboardCheck className="h-5 w-5 text-primary" />
            AI Readiness Assessment
          </CardTitle>
          {step !== "intro" && (
            <span className="text-xs font-medium text-text-secondary">
              {Math.round(progress)}%
            </span>
          )}
        </div>
        {step !== "intro" && (
          <Progress value={progress} className="mt-3" />
        )}
      </CardHeader>

      <CardContent className="p-6">
        <AnimatePresence mode="wait">
          {step === "intro" && (
            <motion.div
              key="intro"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="text-center"
            >
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <h3 className="heading-sm mb-3">Đánh giá mức độ sẵn sàng AI</h3>
              <p className="body-md mb-6">
                Trả lời {assessmentQuestions.length} câu hỏi ngắn để nhận AI Readiness
                Score, khuyến nghị giải pháp phù hợp và gợi ý cá nhân hóa cho doanh
                nghiệp của bạn.
              </p>
              <Button onClick={() => setStep("questions")} size="lg">
                Bắt đầu đánh giá
                <ChevronRight className="h-4 w-4" />
              </Button>
            </motion.div>
          )}

          {step === "questions" && (
            <motion.div
              key={`q-${currentQ}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <p className="mb-1 text-xs font-medium text-primary">
                Câu hỏi {currentQ + 1}/{assessmentQuestions.length}
              </p>
              <h3 className="mb-6 text-lg font-semibold text-navy">
                {assessmentQuestions[currentQ].question}
              </h3>
              <div className="space-y-3">
                {assessmentQuestions[currentQ].options.map((opt) => (
                  <button
                    key={opt.label}
                    onClick={() => setSelected(opt.score)}
                    className={cn(
                      "w-full rounded-xl border p-4 text-left text-sm transition-all duration-200",
                      selected === opt.score
                        ? "border-primary bg-primary/5 text-navy shadow-soft"
                        : "border-border bg-white text-text-secondary hover:border-primary/30 hover:bg-surface-light"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                          selected === opt.score
                            ? "border-primary bg-primary"
                            : "border-border"
                        )}
                      >
                        {selected === opt.score && (
                          <div className="h-2 w-2 rounded-full bg-white" />
                        )}
                      </div>
                      {opt.label}
                    </div>
                  </button>
                ))}
              </div>
              <div className="mt-6 flex items-center justify-between">
                <Button
                  variant="ghost"
                  onClick={handleBack}
                  disabled={currentQ === 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Quay lại
                </Button>
                <Button onClick={handleNext} disabled={selected === null}>
                  {currentQ === assessmentQuestions.length - 1
                    ? "Hoàn thành"
                    : "Tiếp theo"}
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {step === "lead" && (
            <motion.div
              key="lead"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <h3 className="mb-2 text-lg font-semibold text-navy">
                Nhận báo cáo chi tiết
              </h3>
              <p className="mb-6 text-sm text-text-secondary">
                Để lại thông tin để nhận AI Readiness Score và khuyến nghị cá nhân hóa.
              </p>
              <form onSubmit={handleSubmit(onLeadSubmit)} className="space-y-4">
                <div>
                  <Label htmlFor="name">Họ và tên *</Label>
                  <Input id="name" className="mt-1.5" {...register("name")} />
                  {errors.name && (
                    <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input id="email" type="email" className="mt-1.5" {...register("email")} />
                  {errors.email && (
                    <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="company">Công ty *</Label>
                  <Input id="company" className="mt-1.5" {...register("company")} />
                  {errors.company && (
                    <p className="mt-1 text-xs text-red-500">{errors.company.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="phone">Số điện thoại</Label>
                  <Input id="phone" className="mt-1.5" {...register("phone")} />
                </div>
                <Button type="submit" className="w-full" size="lg">
                  Xem kết quả
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </form>
            </motion.div>
          )}

          {step === "result" && result && (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <div className="relative mx-auto mb-6 flex h-32 w-32 items-center justify-center">
                <svg className="absolute inset-0 h-full w-full -rotate-90">
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    fill="none"
                    stroke="#E2E8F0"
                    strokeWidth="8"
                  />
                  <motion.circle
                    cx="64"
                    cy="64"
                    r="56"
                    fill="none"
                    stroke="url(#scoreGrad)"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 56}
                    initial={{ strokeDashoffset: 2 * Math.PI * 56 }}
                    animate={{
                      strokeDashoffset:
                        2 * Math.PI * 56 * (1 - result.score / 100),
                    }}
                    transition={{ duration: 1.2, ease: "easeOut" }}
                  />
                  <defs>
                    <linearGradient id="scoreGrad" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#2563EB" />
                      <stop offset="100%" stopColor="#38BDF8" />
                    </linearGradient>
                  </defs>
                </svg>
                <span className="text-3xl font-bold text-navy">{result.score}</span>
              </div>

              <Badge className={cn("mb-4", levelLabels[result.level].color)}>
                {levelLabels[result.level].label}
              </Badge>

              <h3 className="mb-6 text-lg font-semibold text-navy">
                AI Readiness Score: {result.score}/100
              </h3>

              <div className="mb-6 text-left">
                <p className="mb-3 text-sm font-semibold text-navy">Khuyến nghị:</p>
                <ul className="space-y-2">
                  {result.recommendations.map((rec) => (
                    <li key={rec} className="flex items-start gap-2 text-sm text-text-secondary">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mb-6 text-left">
                <p className="mb-3 text-sm font-semibold text-navy">
                  Giải pháp đề xuất:
                </p>
                <div className="flex flex-wrap gap-2">
                  {result.solutions.map((s) => (
                    <Badge key={s} variant="default">
                      {s}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                <Button asChild>
                  <a href="/contact">Tư vấn chi tiết</a>
                </Button>
                <Button variant="secondary" onClick={reset}>
                  Làm lại
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
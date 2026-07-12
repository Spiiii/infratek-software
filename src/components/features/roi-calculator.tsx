// File: src/components/features/roi-calculator.tsx
"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Calculator, Clock, TrendingUp, DollarSign, Zap } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { calculateROI, formatCurrency, formatNumber } from "@/lib/roi";
import { AnimatedCounter } from "@/components/shared/animated-counter";

export function ROICalculator() {
  const [employees, setEmployees] = useState(20);
  const [avgSalary, setAvgSalary] = useState(20000000);
  const [hoursPerWeek, setHoursPerWeek] = useState(10);
  const [automationPercent, setAutomationPercent] = useState(60);
  const [projectCost, setProjectCost] = useState(500000000);

  const results = useMemo(
    () =>
      calculateROI({
        employees,
        avgSalary,
        hoursPerWeek,
        automationPercent,
        projectCost,
      }),
    [employees, avgSalary, hoursPerWeek, automationPercent, projectCost]
  );

  const inputs = [
    {
      label: "Số nhân viên bị ảnh hưởng",
      value: employees,
      display: `${employees} người`,
      min: 1,
      max: 500,
      step: 1,
      onChange: setEmployees,
    },
    {
      label: "Lương trung bình / tháng",
      value: avgSalary,
      display: formatCurrency(avgSalary),
      min: 5000000,
      max: 100000000,
      step: 1000000,
      onChange: setAvgSalary,
    },
    {
      label: "Giờ thủ công / người / tuần",
      value: hoursPerWeek,
      display: `${hoursPerWeek} giờ`,
      min: 1,
      max: 40,
      step: 1,
      onChange: setHoursPerWeek,
    },
    {
      label: "Tỷ lệ tự động hóa kỳ vọng",
      value: automationPercent,
      display: `${automationPercent}%`,
      min: 10,
      max: 95,
      step: 5,
      onChange: setAutomationPercent,
    },
    {
      label: "Chi phí dự án ước tính",
      value: projectCost,
      display: formatCurrency(projectCost),
      min: 50000000,
      max: 5000000000,
      step: 50000000,
      onChange: setProjectCost,
    },
  ];

  const kpis = [
    {
      icon: Clock,
      label: "Giờ tiết kiệm / năm",
      value: results.timeSavedHours,
      format: (v: number) => formatNumber(v),
      suffix: " giờ",
      color: "text-primary",
    },
    {
      icon: DollarSign,
      label: "Tiết kiệm chi phí / năm",
      value: results.annualSavings,
      format: (v: number) => formatCurrency(v),
      suffix: "",
      color: "text-primary",
    },
    {
      icon: TrendingUp,
      label: "ROI",
      value: results.roi,
      format: (v: number) => `${v}`,
      suffix: "%",
      color: results.roi >= 0 ? "text-primary" : "text-red-500",
    },
    {
      icon: Zap,
      label: "Tăng năng suất",
      value: results.productivityIncrease,
      format: (v: number) => `${v}`,
      suffix: "%",
      color: "text-primary-accent",
    },
  ];

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <Card className="border-border shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            Ước tính đầu vào
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-8">
          {inputs.map((input) => (
            <div key={input.label}>
              <div className="mb-3 flex items-center justify-between">
                <label className="text-sm font-medium text-navy">{input.label}</label>
                <span className="text-sm font-semibold text-primary">{input.display}</span>
              </div>
              <Slider
                value={[input.value]}
                min={input.min}
                max={input.max}
                step={input.step}
                onValueChange={([v]) => input.onChange(v)}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          {kpis.map((kpi, i) => (
            <motion.div
              key={kpi.label}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="card-hover border-border">
                <CardContent className="p-5">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/5">
                    <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
                  </div>
                  <p className="text-xs font-medium text-text-secondary">{kpi.label}</p>
                  <p className={`mt-1 text-2xl font-bold ${kpi.color}`}>
                    <AnimatedCounter
                      value={kpi.value}
                      suffix={kpi.suffix}
                      duration={800}
                    />
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary-accent/5">
          <CardContent className="p-6">
            <p className="text-sm font-medium text-text-secondary">
              Thời gian hoàn vốn ước tính
            </p>
            <p className="mt-1 text-3xl font-bold text-navy">
              {results.paybackMonths > 0
                ? `${results.paybackMonths} tháng`
                : "—"}
            </p>
            <p className="mt-3 text-xs leading-relaxed text-text-secondary">
              * Ước tính mang tính tham khảo dựa trên các giả định đầu vào. Kết quả
              thực tế phụ thuộc vào use case, data quality và implementation.
              Liên hệ để được tư vấn chi tiết.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
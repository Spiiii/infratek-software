// File: src/lib/roi.ts
import type { ROIInputs, ROIResults } from "@/types";

export function calculateROI(inputs: ROIInputs): ROIResults {
  const { employees, avgSalary, hoursPerWeek, automationPercent, projectCost } = inputs;

  const hourlyRate = avgSalary / (22 * 8);
  const weeklyHoursSaved = employees * hoursPerWeek * (automationPercent / 100);
  const timeSavedHours = weeklyHoursSaved * 52;
  const annualSavings = timeSavedHours * hourlyRate;
  const costReduction = annualSavings;
  const roi = projectCost > 0 ? ((annualSavings - projectCost) / projectCost) * 100 : 0;
  const productivityIncrease = automationPercent * 0.8;
  const paybackMonths = annualSavings > 0 ? (projectCost / annualSavings) * 12 : 0;

  return {
    timeSavedHours: Math.round(timeSavedHours),
    costReduction: Math.round(costReduction),
    roi: Math.round(roi),
    productivityIncrease: Math.round(productivityIncrease),
    paybackMonths: Math.round(paybackMonths * 10) / 10,
    annualSavings: Math.round(annualSavings),
  };
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("vi-VN").format(value);
}
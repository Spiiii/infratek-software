// File: src/types/index.ts
export interface NavItem {
  title: string;
  href: string;
  description?: string;
  children?: NavItem[];
}

export interface Solution {
  id: string;
  slug: string;
  title: string;
  shortTitle: string;
  description: string;
  problem: string;
  solution: string;
  icon: string;
  process: ProcessStep[];
  techStack: string[];
  businessValue: string[];
  color: string;
}

export interface ProcessStep {
  step: number;
  title: string;
  description: string;
}

export interface CaseStudy {
  id: string;
  slug: string;
  title: string;
  client: string;
  industry: string;
  summary: string;
  challenge: string;
  solution: string;
  architecture: ArchitectureNode[];
  techStack: string[];
  implementationFlow: ProcessStep[];
  results: CaseStudyResult[];
  metrics: Metric[];
  gallery: string[];
  featured: boolean;
  coverGradient: string;
  year: string;
  dataClassification: "verified" | "anonymized" | "illustrative";
}

export interface ArchitectureNode {
  id: string;
  label: string;
  type: "input" | "process" | "storage" | "output" | "ai";
  description: string;
}

export interface CaseStudyResult {
  title: string;
  description: string;
}

export interface Metric {
  label: string;
  value: number;
  suffix: string;
  prefix?: string;
  description: string;
}

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  category: BlogCategory;
  tags: string[];
  author: Author;
  publishedAt: string;
  updatedAt?: string;
  readingTime: number;
  featured: boolean;
  coverImage?: string;
}

export type BlogCategory =
  | "AI"
  | "OCR"
  | "Computer Vision"
  | "LLM"
  | "Automation"
  | "Cloud"
  | "Software Engineering"
  | "Digital Transformation"
  | "Tutorial"
  | "White Paper"
  | "Case Study";

export interface Author {
  name: string;
  role: string;
  avatar?: string;
}

export interface Technology {
  id: string;
  name: string;
  category: "ai" | "frontend" | "backend" | "cloud" | "data" | "devops";
  description: string;
}

export interface AICoreNode {
  id: string;
  label: string;
  description: string;
  angle: number;
  distance: number;
}

export interface TimelineStep {
  id: string;
  title: string;
  description: string;
  icon: string;
}

export interface Statistic {
  label: string;
  value: number;
  suffix: string;
  prefix?: string;
}

export interface DownloadResource {
  id: string;
  title: string;
  description: string;
  type: "pdf" | "docx" | "checklist";
  size: string;
  category: string;
}

export interface InnovationProject {
  id: string;
  title: string;
  description: string;
  status: "research" | "prototype" | "production";
  tags: string[];
}

export interface ContactFormData {
  name: string;
  email: string;
  phone: string;
  company: string;
  position: string;
  message: string;
}

export interface ROIInputs {
  employees: number;
  avgSalary: number;
  hoursPerWeek: number;
  automationPercent: number;
  projectCost: number;
}

export interface ROIResults {
  timeSavedHours: number;
  costReduction: number;
  roi: number;
  productivityIncrease: number;
  paybackMonths: number;
  annualSavings: number;
}

export interface AssessmentQuestion {
  id: string;
  question: string;
  options: AssessmentOption[];
}

export interface AssessmentOption {
  label: string;
  score: number;
}

export interface AssessmentResult {
  score: number;
  level: "beginner" | "intermediate" | "advanced" | "leader";
  recommendations: string[];
  solutions: string[];
}

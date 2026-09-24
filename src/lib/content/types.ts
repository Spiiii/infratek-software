import type {
  BlogPost,
  CaseStudy,
  InnovationProject,
  ProcessStep,
} from "@/types";

export type ContentStatus = "verified" | "placeholder";

export interface ContentBlock {
  status: ContentStatus;
  items: string[];
  note?: string;
}

export interface SolutionDomain {
  id: string;
  slug: string;
  title: string;
  shortTitle: string;
  description: string;
  icon: string;
  color: string;
  quickAnswer: string;
  needSignals: string[];
  deliverables: ContentBlock;
  process: ProcessStep[];
  outcomes: string[];
  relatedCaseStudySlugs: string[];
  audienceFit: ContentBlock;
  timelineAndInvestment: ContentBlock;
  faq: ContentBlock;
  techStack: string[];
}

export interface ResourceDomain {
  slug: string;
  title: string;
  description: string;
  type: "pdf" | "docx" | "checklist";
  category: string;
  size: string;
  availability: "coming-soon";
}

export interface CompanyDomain {
  name: string;
  tagline: string;
  missionVi: string;
  director: string;
  email: string;
  phone: string;
  phoneRaw: string;
  address: string;
  ward: string;
  city: string;
  fullAddress: string;
}

export interface ContentRepository {
  getCompany(): Promise<CompanyDomain>;
  getSolutions(): Promise<SolutionDomain[]>;
  getSolutionBySlug(slug: string): Promise<SolutionDomain | undefined>;
  getCaseStudies(): Promise<CaseStudy[]>;
  getCaseStudyBySlug(slug: string): Promise<CaseStudy | undefined>;
  getPosts(): Promise<BlogPost[]>;
  getPostBySlug(slug: string): Promise<BlogPost | undefined>;
  getResources(): Promise<ResourceDomain[]>;
  getResourceBySlug(slug: string): Promise<ResourceDomain | undefined>;
  getInnovationProjects(): Promise<InnovationProject[]>;
}

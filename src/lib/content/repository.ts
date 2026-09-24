import { blogPosts } from "@/data/blog";
import { caseStudies } from "@/data/case-studies";
import { company } from "@/data/company";
import { solutions } from "@/data/solutions";
import { downloadResources, innovationProjects } from "@/data/technologies";
import type { ContentBlock, ContentRepository, SolutionDomain } from "./types";

const pendingBlock = (note: string): ContentBlock => ({
  status: "placeholder",
  items: [],
  note,
});

const relatedCases: Record<string, string[]> = {
  "ai-consulting": [],
  "software-development": ["pms-project-management", "interview-ai"],
  "it-outsourcing": [],
  "digital-transformation": ["ocr-document-intelligence", "camera-ai-transformation"],
};

const solutionRecords: SolutionDomain[] = solutions.map((solution) => ({
  id: solution.id,
  slug: solution.slug,
  title: solution.title,
  shortTitle: solution.shortTitle,
  description: solution.description,
  icon: solution.icon,
  color: solution.color,
  quickAnswer: solution.solution,
  needSignals: [solution.problem],
  deliverables: pendingBlock("Đang cập nhật — liên hệ để biết thêm chi tiết."),
  process: solution.process,
  outcomes: solution.businessValue,
  relatedCaseStudySlugs: relatedCases[solution.slug] ?? [],
  audienceFit: pendingBlock("Đang cập nhật — liên hệ để biết thêm chi tiết."),
  timelineAndInvestment: pendingBlock("Đang cập nhật — liên hệ để biết thêm chi tiết."),
  faq: pendingBlock("Đang cập nhật — liên hệ để biết thêm chi tiết."),
  techStack: solution.techStack,
}));

export const staticContentRepository: ContentRepository = {
  async getCompany() {
    return company;
  },
  async getSolutions() {
    return solutionRecords;
  },
  async getSolutionBySlug(slug) {
    return solutionRecords.find((solution) => solution.slug === slug);
  },
  async getCaseStudies() {
    return caseStudies;
  },
  async getCaseStudyBySlug(slug) {
    return caseStudies.find((item) => item.slug === slug);
  },
  async getPosts() {
    return blogPosts;
  },
  async getPostBySlug(slug) {
    return blogPosts.find((post) => post.slug === slug);
  },
  async getResources() {
    return downloadResources.map((resource) => ({
      slug: resource.id,
      title: resource.title,
      description: resource.description,
      type: resource.type,
      category: resource.category,
      size: resource.size,
      availability: "coming-soon" as const,
    }));
  },
  async getResourceBySlug(slug) {
    const resources = await this.getResources();
    return resources.find((resource) => resource.slug === slug);
  },
  async getInnovationProjects() {
    return innovationProjects;
  },
};

export const getSolutions = () => staticContentRepository.getSolutions();
export const getCompany = () => staticContentRepository.getCompany();
export const getSolutionBySlug = (slug: string) =>
  staticContentRepository.getSolutionBySlug(slug);
export const getCaseStudies = () => staticContentRepository.getCaseStudies();
export const getCaseStudyBySlug = (slug: string) =>
  staticContentRepository.getCaseStudyBySlug(slug);
export const getPosts = () => staticContentRepository.getPosts();
export const getPostBySlug = (slug: string) =>
  staticContentRepository.getPostBySlug(slug);
export const getResources = () => staticContentRepository.getResources();
export const getResourceBySlug = (slug: string) =>
  staticContentRepository.getResourceBySlug(slug);
export const getInnovationProjects = () =>
  staticContentRepository.getInnovationProjects();

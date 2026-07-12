// File: src/data/blog.ts
import type { BlogPost, BlogCategory } from "@/types";

export const blogCategories: BlogCategory[] = [
  "AI",
  "OCR",
  "Computer Vision",
  "LLM",
  "Automation",
  "Cloud",
  "Software Engineering",
  "Digital Transformation",
  "Tutorial",
  "White Paper",
  "Case Study",
];

export const blogPosts: BlogPost[] = [
  {
    id: "1",
    slug: "enterprise-ai-adoption-roadmap-2025",
    title: "Roadmap triển khai AI cho doanh nghiệp năm 2025",
    excerpt:
      "Hướng dẫn chi tiết từng bước để doanh nghiệp Việt Nam xây dựng chiến lược AI thực tiễn — từ assessment đến scale, tránh những sai lầm phổ biến.",
    content: `
# Roadmap triển khai AI cho doanh nghiệp năm 2025

Trí tuệ nhân tạo không còn là công nghệ của tương lai — nó đang định hình lại cách doanh nghiệp vận hành ngay hôm nay. Tuy nhiên, theo khảo sát của McKinsey, chỉ khoảng 30% các sáng kiến AI mang lại giá trị kinh doanh đo lường được.

Vấn đề không nằm ở công nghệ. Vấn đề nằm ở **cách tiếp cận**.

## Bước 1: AI Readiness Assessment

Trước khi đầu tư vào bất kỳ model hay platform nào, hãy đánh giá 4 trụ cột:

1. **Dữ liệu** — Có đủ dữ liệu chất lượng không? Data có được label, clean, accessible không?
2. **Quy trình** — Quy trình nghiệp vụ đã được số hóa chưa? Có bottleneck rõ ràng không?
3. **Hạ tầng** — Cloud readiness, GPU capacity, security compliance?
4. **Con người** — Team có AI literacy không? Leadership có commitment không?

> "AI projects fail because of people and process, not because of algorithms."

## Bước 2: Use Case Prioritization

Không phải use case nào cũng đáng làm. Framework ưu tiên của chúng tôi:

| Tiêu chí | Trọng số |
|----------|----------|
| Business Impact | 35% |
| Data Availability | 25% |
| Technical Feasibility | 20% |
| Time to Value | 20% |

Bắt đầu với **quick wins** — use case có impact cao, data sẵn, và deliver được trong 4–8 tuần.

## Bước 3: Proof of Concept

PoC không phải để demo technology. PoC phải validate:

- Model accuracy trên **real data** của bạn
- Integration feasibility với hệ thống hiện tại
- User acceptance từ end users thực tế
- Cost estimate cho production scale

## Bước 4: Production Deployment

Khoảng cách giữa PoC và Production là nơi hầu hết dự án AI "chết". Cần:

- **MLOps pipeline** — training, versioning, deployment, monitoring
- **Human-in-the-loop** — exception handling khi model confidence thấp
- **Feedback loop** — continuous improvement từ production data
- **SLA & governance** — ai chịu trách nhiệm khi AI sai?

## Bước 5: Scale & Optimize

Khi use case đầu tiên thành công:

1. Document lessons learned
2. Build reusable AI infrastructure
3. Expand sang use cases liền kề
4. Train internal team để reduce dependency

## Kết luận

AI transformation là marathon, không phải sprint. Hãy bắt đầu nhỏ, đo lường chặt, và scale những gì đã proven.

Infratek Software đồng hành cùng doanh nghiệp trên toàn bộ hành trình này — từ assessment đến production AI systems.
    `,
    category: "AI",
    tags: ["AI Strategy", "Digital Transformation", "Enterprise"],
    author: {
      name: "Ngô Đức Trọng",
      role: "Director",
    },
    publishedAt: "2025-01-15",
    readingTime: 8,
    featured: true,
  },
  {
    id: "2",
    slug: "ocr-accuracy-optimization-guide",
    title: "Tối ưu độ chính xác OCR cho chứng từ tiếng Việt",
    excerpt:
      "Các kỹ thuật preprocessing, model selection và post-processing để đạt accuracy 98%+ trên hóa đơn, hợp đồng và giấy tờ tùy thân tiếng Việt.",
    content: `
# Tối ưu độ chính xác OCR cho chứng từ tiếng Việt

OCR cho tiếng Việt có những thách thức riêng: dấu thanh, font đa dạng, chất lượng scan thấp, và layout phức tạp của chứng từ doanh nghiệp.

## Thách thức đặc thù

- **Dấu thanh**: Các model train trên Latin script thường confuse "á" vs "à" vs "ả"
- **Font đa dạng**: Từ Times New Roman đến handwriting
- **Chất lượng input**: Scan nghiêng, mờ, stamp đè lên text
- **Layout phức tạp**: Tables, multi-column, stamps, signatures

## Pipeline tối ưu

### 1. Preprocessing

\`\`\`python
import cv2
import numpy as np

def preprocess(image):
    # Deskew
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    coords = np.column_stack(np.where(gray < 128))
    angle = cv2.minAreaRect(coords)[-1]
    
    # Denoise
    denoised = cv2.fastNlMeansDenoising(gray)
    
    # Adaptive threshold
    binary = cv2.adaptiveThreshold(
        denoised, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY, 11, 2
    )
    return binary
\`\`\`

### 2. Multi-engine approach

Không dựa vào một OCR engine duy nhất. Combine:

- **PaddleOCR** — mạnh với tiếng Việt
- **EasyOCR** — tốt với handwriting
- **Azure Document Intelligence** — mạnh với structured forms
- **Custom fine-tuned model** — cho document types đặc thù

### 3. Post-processing với LLM

Sử dụng LLM để correct OCR errors dựa trên context:

> Nếu field "Tổng tiền" extract được "1O0.OOO VNĐ" — LLM hiểu đây phải là "100.000 VNĐ"

## Kết quả thực tế

Trên dự án OCR cho financial services, pipeline này đạt:

- **98.2%** field-level accuracy trên printed invoices
- **94.5%** trên mixed printed + stamped documents
- **89%** trên handwritten forms

## Best practices

1. Luôn có confidence score cho từng field
2. Human-in-the-loop cho low-confidence extractions
3. Continuous retraining từ correction data
4. Validate với business rules (checksum, format, range)
    `,
    category: "OCR",
    tags: ["OCR", "Computer Vision", "Document AI"],
    author: {
      name: "Infratek AI Team",
      role: "Engineering",
    },
    publishedAt: "2025-01-08",
    readingTime: 10,
    featured: true,
  },
  {
    id: "3",
    slug: "yolo-tensorrt-edge-deployment",
    title: "Deploy YOLO với TensorRT trên Edge GPU",
    excerpt:
      "Hướng dẫn tối ưu inference YOLO từ PyTorch sang TensorRT, đạt 5–10x speedup trên NVIDIA edge devices cho Camera AI real-time.",
    content: `
# Deploy YOLO với TensorRT trên Edge GPU

Khi triển khai Camera AI cho 200+ camera, mỗi millisecond inference đều quan trọng. TensorRT là key để đạt real-time performance trên edge.

## Tại sao TensorRT?

| Framework | FPS (YOLOv8-m, 640px) | Latency |
|-----------|----------------------|---------|
| PyTorch | 45 | 22ms |
| ONNX Runtime | 80 | 12.5ms |
| TensorRT FP16 | 180 | 5.5ms |
| TensorRT INT8 | 250 | 4ms |

## Conversion Pipeline

\`\`\`bash
# 1. Export to ONNX
yolo export model=yolov8m.pt format=onnx opset=17

# 2. Build TensorRT engine
trtexec --onnx=yolov8m.onnx \\
        --saveEngine=yolov8m_fp16.engine \\
        --fp16 \\
        --workspace=4096
\`\`\`

## INT8 Calibration

INT8 cho tốc độ cao nhất nhưng cần calibration dataset đại diện:

1. Collect 500–1000 frames từ production cameras
2. Cover các điều kiện ánh sáng khác nhau
3. Include edge cases (night, rain, crowded)

## Production Architecture

Edge device mỗi site chạy:
- TensorRT inference server
- Frame sampler (không cần process mọi frame)
- Kafka producer cho detection events
- Local buffer khi network down

## Lessons learned

- **Dynamic batching** quan trọng khi số camera thay đổi
- **Model ensemble** không worth it trên edge — latency cost quá cao
- **ROI cropping** trước inference giảm 40% compute cho zone-specific detection
    `,
    category: "Computer Vision",
    tags: ["YOLO", "TensorRT", "Edge AI", "Camera AI"],
    author: {
      name: "Infratek AI Team",
      role: "Computer Vision",
    },
    publishedAt: "2024-12-20",
    readingTime: 12,
    featured: false,
  },
  {
    id: "4",
    slug: "llm-rag-enterprise-knowledge",
    title: "Xây dựng RAG system cho Knowledge Base doanh nghiệp",
    excerpt:
      "Kiến trúc Retrieval-Augmented Generation thực tế cho internal knowledge base — chunking strategies, embedding models, và evaluation framework.",
    content: `
# Xây dựng RAG system cho Knowledge Base doanh nghiệp

LLM mạnh nhưng không biết gì về data nội bộ của bạn. RAG (Retrieval-Augmented Generation) là pattern phổ biến nhất để đưa enterprise knowledge vào AI.

## Architecture Overview

\`\`\`
Documents → Chunking → Embedding → Vector DB
                                        ↓
User Query → Embedding → Retrieval → Context + Query → LLM → Answer
\`\`\`

## Chunking Strategies

Chunking là bước quan trọng nhất mà nhiều team underestimate:

- **Fixed-size** (512 tokens) — simple nhưng mất context
- **Semantic chunking** — split theo paragraph/section boundaries
- **Document-aware** — preserve headers, tables, lists structure
- **Parent-child** — retrieve small chunks, return parent context

Cho technical docs tiếng Việt, chúng tôi recommend semantic + parent-child.

## Embedding Model Selection

| Model | Dimensions | Vietnamese Support | Speed |
|-------|-----------|-------------------|-------|
| text-embedding-3-large | 3072 | Good | Medium |
| multilingual-e5-large | 1024 | Excellent | Fast |
| bge-m3 | 1024 | Excellent | Fast |

## Evaluation

Đừng deploy mà không evaluate. Metrics quan trọng:

1. **Retrieval Recall@k** — relevant docs có trong top-k không?
2. **Answer Faithfulness** — answer có grounded trong context không?
3. **Answer Relevance** — answer có đúng câu hỏi không?
4. **Latency** — end-to-end response time

## Production Tips

- Hybrid search (vector + keyword) outperform pure vector cho technical terms
- Reranking với cross-encoder cải thiện precision đáng kể
- Cache frequent queries
- Always cite sources trong response
    `,
    category: "LLM",
    tags: ["LLM", "RAG", "NLP", "Enterprise AI"],
    author: {
      name: "Infratek AI Team",
      role: "NLP Engineering",
    },
    publishedAt: "2024-12-10",
    readingTime: 11,
    featured: false,
  },
  {
    id: "5",
    slug: "digital-transformation-ai-first",
    title: "Chuyển đổi số AI-First: Tư duy mới cho doanh nghiệp",
    excerpt:
      "Tại sao digital transformation truyền thống đang thất bại, và cách tiếp cận AI-First thay đổi hoàn toàn cách thiết kế quy trình và hệ thống.",
    content: `
# Chuyển đổi số AI-First: Tư duy mới cho doanh nghiệp

Digital transformation truyền thống: số hóa giấy tờ → build software → automate workflows.

AI-First transformation: **bắt đầu từ câu hỏi "AI có thể làm gì ở đây?"** rồi thiết kế quy trình và hệ thống xung quanh khả năng đó.

## Sự khác biệt cốt lõi

### Traditional DT
- Số hóa quy trình hiện tại
- Automate các bước lặp lại
- Dashboard cho human decisions
- AI là add-on sau

### AI-First DT
- Reimagine quy trình với AI capabilities
- AI handles judgment tasks, không chỉ repetitive
- AI recommends/decides, human supervises
- AI là foundation, không phải feature

## Framework 5 lớp

1. **Data Foundation** — unified data platform, quality pipelines
2. **Intelligence Layer** — models, RAG, agents
3. **Process Layer** — AI-native workflows
4. **Experience Layer** — AI-assisted interfaces
5. **Governance Layer** — ethics, audit, compliance

## Case: Từ OCR đến Intelligent Document Processing

Traditional: Scan → Manual data entry → Approve

AI-First: Capture → AI classify + extract + validate → Auto-approve (high confidence) / Human review (low confidence) → Continuous learning

Sự khác biệt: AI không chỉ thay thế data entry — nó thay đổi toàn bộ decision flow.

## Bắt đầu như thế nào?

1. Chọn 1 domain có data sẵn và pain rõ
2. Map "judgment points" — nơi con người đang ra quyết định lặp lại
3. Prototype AI cho judgment points đó
4. Redesign workflow xung quanh AI capability
5. Measure, learn, expand
    `,
    category: "Digital Transformation",
    tags: ["Digital Transformation", "AI Strategy", "Enterprise"],
    author: {
      name: "Ngô Đức Trọng",
      role: "Director",
    },
    publishedAt: "2024-11-28",
    readingTime: 7,
    featured: false,
  },
  {
    id: "6",
    slug: "multi-agent-systems-enterprise",
    title: "Multi-Agent Systems trong môi trường Enterprise",
    excerpt:
      "Khám phá cách multi-agent architecture giải quyết các bài toán phức tạp hơn single LLM — orchestration patterns, tool use, và production challenges.",
    content: `
# Multi-Agent Systems trong môi trường Enterprise

Single LLM call đủ cho Q&A đơn giản. Nhưng enterprise workflows phức tạp cần **multi-agent systems** — nhiều AI agents chuyên biệt phối hợp với nhau.

## Khi nào cần Multi-Agent?

- Task yêu cầu nhiều specialized skills
- Workflow có branching logic phức tạp
- Cần parallel processing nhiều sub-tasks
- Cần separation of concerns (research vs write vs review)

## Architecture Patterns

### 1. Supervisor Pattern
Một orchestrator agent phân task cho specialist agents và aggregate results.

### 2. Pipeline Pattern
Agents xử lý tuần tự: Research → Analyze → Write → Review → Publish

### 3. Swarm Pattern
Agents peer-to-peer collaboration, handoff động dựa trên context.

## Production Challenges

1. **Latency** — multi-agent = multi LLM calls. Cần async + streaming
2. **Cost** — mỗi agent call tốn tokens. Cache và model routing quan trọng
3. **Reliability** — agent failure handling, retry, fallback
4. **Observability** — trace toàn bộ agent interactions
5. **Evaluation** — evaluate system-level, không chỉ individual agents

## Stack chúng tôi dùng

- **LangGraph** / custom orchestrator cho agent workflows
- **OpenAI + local models** với intelligent routing
- **PostgreSQL** cho state persistence
- **Redis** cho short-term memory
- **OpenTelemetry** cho tracing
    `,
    category: "AI",
    tags: ["Multi-Agent", "LLM", "AI Agents", "Architecture"],
    author: {
      name: "Infratek AI Team",
      role: "AI Research",
    },
    publishedAt: "2024-11-15",
    readingTime: 9,
    featured: false,
  },
];

export function getPostBySlug(slug: string): BlogPost | undefined {
  return blogPosts.find((p) => p.slug === slug);
}

export function getFeaturedPosts(): BlogPost[] {
  return blogPosts.filter((p) => p.featured);
}

export function getLatestPosts(count = 3): BlogPost[] {
  return [...blogPosts]
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .slice(0, count);
}

export function getPostsByCategory(category: BlogCategory): BlogPost[] {
  return blogPosts.filter((p) => p.category === category);
}

export function getRelatedPosts(post: BlogPost, count = 3): BlogPost[] {
  return blogPosts
    .filter((p) => p.id !== post.id && (p.category === post.category || p.tags.some((t) => post.tags.includes(t))))
    .slice(0, count);
}
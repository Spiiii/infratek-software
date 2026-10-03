import { FINAL_SOURCE_LIMIT, RRF_K } from "./config.ts";
import type {
  CandidateIdentity,
  CandidateMetadata,
  FtsCandidate,
  FusedCandidate,
  SelectedSource,
  SourceLabel,
  VectorCandidate,
} from "./types.ts";

export type SourceConcentrationDiagnostics = {
  selectedCount: number;
  distinctDocumentCount: number;
  maxChunksFromSingleDocument: number;
  documentConcentration: number;
};

export type FusionSelectionResult = {
  fusedCandidates: FusedCandidate[];
  selectedSources: SelectedSource[];
  concentration: SourceConcentrationDiagnostics;
};

export function candidateIdentity(candidate: CandidateIdentity): string {
  return `${candidate.docType}\u0000${candidate.docId}\u0000${candidate.chunkKey}`;
}

function documentIdentity(candidate: CandidateIdentity): string {
  return `${candidate.docType}\u0000${candidate.docId}`;
}

function betterVector(left: VectorCandidate, right: VectorCandidate): VectorCandidate {
  const comparison =
    left.diagnostics.vectorRank - right.diagnostics.vectorRank ||
    left.diagnostics.vectorDistance - right.diagnostics.vectorDistance ||
    right.diagnostics.vectorSimilarity - left.diagnostics.vectorSimilarity ||
    left.id.localeCompare(right.id);
  return comparison <= 0 ? left : right;
}

function betterFts(left: FtsCandidate, right: FtsCandidate): FtsCandidate {
  const comparison =
    left.diagnostics.ftsRank - right.diagnostics.ftsRank ||
    right.diagnostics.ftsScore - left.diagnostics.ftsScore ||
    left.id.localeCompare(right.id);
  return comparison <= 0 ? left : right;
}

function dedupeBest<T extends VectorCandidate | FtsCandidate>(
  candidates: T[],
  choose: (left: T, right: T) => T,
): Map<string, T> {
  const result = new Map<string, T>();
  for (const candidate of candidates) {
    const identity = candidateIdentity(candidate);
    const existing = result.get(identity);
    result.set(identity, existing ? choose(existing, candidate) : candidate);
  }
  return result;
}

function bestRank(candidate: FusedCandidate): number {
  return Math.min(
    candidate.diagnostics.vectorRank ?? Number.POSITIVE_INFINITY,
    candidate.diagnostics.ftsRank ?? Number.POSITIVE_INFINITY,
  );
}

function compareOptionalNumberPresence(left: number | undefined, right: number | undefined) {
  if (left !== undefined && right === undefined) return -1;
  if (left === undefined && right !== undefined) return 1;
  return 0;
}

function compareFused(left: FusedCandidate, right: FusedCandidate): number {
  const score = right.diagnostics.rrfScore - left.diagnostics.rrfScore;
  if (score !== 0) return score;

  const rank = bestRank(left) - bestRank(right);
  if (rank !== 0) return rank;

  const distancePresence = compareOptionalNumberPresence(
    left.diagnostics.vectorDistance,
    right.diagnostics.vectorDistance,
  );
  if (distancePresence !== 0) return distancePresence;
  if (
    left.diagnostics.vectorDistance !== undefined &&
    right.diagnostics.vectorDistance !== undefined
  ) {
    const distance = left.diagnostics.vectorDistance - right.diagnostics.vectorDistance;
    if (distance !== 0) return distance;
  }

  const ftsPresence = compareOptionalNumberPresence(
    left.diagnostics.ftsScore,
    right.diagnostics.ftsScore,
  );
  if (ftsPresence !== 0) return ftsPresence;
  if (left.diagnostics.ftsScore !== undefined && right.diagnostics.ftsScore !== undefined) {
    const ftsScore = right.diagnostics.ftsScore - left.diagnostics.ftsScore;
    if (ftsScore !== 0) return ftsScore;
  }

  return (
    left.docType.localeCompare(right.docType) ||
    left.docId.localeCompare(right.docId) ||
    left.chunkKey.localeCompare(right.chunkKey)
  );
}

function metadata(candidate: VectorCandidate | FtsCandidate): CandidateMetadata {
  return {
    id: candidate.id,
    docType: candidate.docType,
    docId: candidate.docId,
    chunkKey: candidate.chunkKey,
    title: candidate.title,
    headingPath: candidate.headingPath,
    content: candidate.content,
    url: candidate.url,
  };
}

export function fuseCandidates(
  vectorCandidates: VectorCandidate[],
  ftsCandidates: FtsCandidate[],
): FusedCandidate[] {
  const vectors = dedupeBest(vectorCandidates, betterVector);
  const fts = dedupeBest(ftsCandidates, betterFts);
  const identities = new Set([...vectors.keys(), ...fts.keys()]);
  const fused: FusedCandidate[] = [];

  for (const identity of identities) {
    const vector = vectors.get(identity);
    const fullText = fts.get(identity);
    const source = vector ?? fullText;
    if (!source) continue;

    const vectorContribution = vector ? 1 / (RRF_K + vector.diagnostics.vectorRank) : 0;
    const ftsContribution = fullText ? 1 / (RRF_K + fullText.diagnostics.ftsRank) : 0;
    fused.push({
      ...metadata(source),
      diagnostics: {
        ...(vector?.diagnostics ?? {}),
        ...(fullText?.diagnostics ?? {}),
        rrfScore: vectorContribution + ftsContribution,
      },
    });
  }

  return fused.sort(compareFused);
}

function concentration(selected: FusedCandidate[]): SourceConcentrationDiagnostics {
  const documentCounts = new Map<string, number>();
  for (const candidate of selected) {
    const identity = documentIdentity(candidate);
    documentCounts.set(identity, (documentCounts.get(identity) ?? 0) + 1);
  }
  const maxChunksFromSingleDocument = Math.max(0, ...documentCounts.values());
  return {
    selectedCount: selected.length,
    distinctDocumentCount: documentCounts.size,
    maxChunksFromSingleDocument,
    documentConcentration:
      selected.length === 0 ? 0 : maxChunksFromSingleDocument / selected.length,
  };
}

export function fuseAndSelectSources(
  vectorCandidates: VectorCandidate[],
  ftsCandidates: FtsCandidate[],
): FusionSelectionResult {
  const fusedCandidates = fuseCandidates(vectorCandidates, ftsCandidates);
  const selected = fusedCandidates.slice(0, FINAL_SOURCE_LIMIT);
  const selectedSources = selected.map<SelectedSource>((candidate, index) => ({
    source: {
      label: `S${index + 1}` as SourceLabel,
      docType: candidate.docType,
      docId: candidate.docId,
      chunkKey: candidate.chunkKey,
      title: candidate.title,
      headingPath: candidate.headingPath,
      content: candidate.content,
      url: candidate.url,
    },
    diagnostics: candidate.diagnostics,
  }));

  return {
    fusedCandidates,
    selectedSources,
    concentration: concentration(selected),
  };
}

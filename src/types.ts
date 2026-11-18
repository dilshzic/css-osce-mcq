export type SpecialtyId = "med" | "surg" | "gynobs" | "paed";
export type Difficulty = "Core" | "Moderate" | "Advanced";
export type SourceType = "osce" | "guide";

export interface GuideCitation {
  guideId: string;
  guideTitle: string;
  keyPoint: string;
  guideUrl?: string;
}

export interface SourceStation {
  id: string;
  title: string;
  originalPrompt: string;
  verifiedAnswer: string;
  provenance: string;
}

export interface SbaQuestion {
  id: string;
  number: number;
  specialty: SpecialtyId;
  specialtyName: string;
  domain: string;
  domainClean: string;
  batch: string;
  batchGroup: string;
  yearLevel: string;
  sourceType: SourceType;
  imagePath: string | null;
  difficulty: Difficulty;
  topic: string;
  stem: string;
  options: [string, string, string, string, string];
  correctIndex: number;
  optionRationales: [string, string, string, string, string];
  clinicalPearl: string;
  guideCitation: GuideCitation;
  sourceStation: SourceStation | null;
}

export interface SpecialtyMeta {
  id: SpecialtyId;
  name: string;
  shortName: string;
  code: string;
  color: string;
  docUrl: string;
  pdfUrl: string;
  count: number;
  imageCount: number;
  domains: { name: string; count: number }[];
}

export interface BankMetadata {
  totalQuestions: number;
  osceStationQuestions: number;
  guideProtocolQuestions: number;
  visualImageQuestions: number;
  totalGuides: number;
  answerDistribution: Record<string, number>;
  specialties: SpecialtyMeta[];
  batchGroups: { name: string; count: number }[];
}

export interface GuideCatalogItem {
  id: string;
  specialty: SpecialtyId;
  title: string;
  driveId: string;
  url: string;
  extractedChars: number;
  questionCount: number;
}

export interface AnswerRecord {
  selectedIndex: number;
  isCorrect: boolean;
  timestamp: number;
}

export interface UserProgress {
  answers: Record<string, AnswerRecord>;
  bookmarks: string[];
  strikethroughs: Record<string, number[]>;
}

export interface FilterState {
  specialties: SpecialtyId[]; // empty = all 4 specialties
  sourceFilter: "all" | "visual" | "text";
  statusFilter: "all" | "unanswered" | "incorrect" | "bookmarked";
  guideId: string;
}

export type AppMode = "study" | "exam" | "guides";
export type ImageFilterMode = "normal" | "contrast" | "invert";

export interface ExamConfig {
  title: string;
  count: number;
  secondsPerQuestion: number; // 0 = untimed
  specialties: SpecialtyId[]; // selected specialties (1..4)
  useFiltered?: boolean;
  visualOnly: boolean;
}

export interface ActiveExam {
  config: ExamConfig;
  questionIds: string[];
  selections: Record<string, number>;
  flagged: string[];
  strikethroughs: Record<string, number[]>;
  currentIndex: number;
  startedAt: number;
  remainingSeconds: number;
  submitted: boolean;
  elapsedSeconds: number;
}

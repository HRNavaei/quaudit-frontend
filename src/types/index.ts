// Enums matching Prisma schema and OpenAPI spec
export type Role = 'ADMIN' | 'SUPERVISOR' | 'SUPPLIER';

export type QuestionnaireStatus = 'DRAFT' | 'ASSIGNED';

export type QuestionType = 'TEXT' | 'YES_NO' | 'SINGLE_CHOICE' | 'NUMBER';

export type AssignmentStatus = 'PENDING' | 'SUBMITTED';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  isActive: boolean;
  isApproved?: boolean;
  createdAt: string;
  updatedAt: string;
  supplier?: Supplier | null;
}

export interface Supplier {
  id: string;
  companyName: string;
  description?: string | null;
  address?: string | null;
  phone?: string | null;
  isApproved?: boolean;
  userId: string;
  createdAt: string;
  updatedAt: string;
  user?: User;
  products?: Product[];
}

export interface Product {
  id: string;
  name: string;
  description?: string | null;
  category?: string | null;
  supplierId: string;
  createdAt: string;
  updatedAt: string;
  supplier?: Supplier;
}

export interface QuestionOption {
  id: string;
  label: string;
  value: string;
  order: number;
  questionId: string;
  followUpQuestionId?: string | null;
  followUpQuestion?: Question | null;
  createdAt?: string;
}

export interface Question {
  id: string;
  text: string;
  type: QuestionType;
  isRequired: boolean;
  order: number;
  questionnaireId: string;
  createdAt?: string;
  updatedAt?: string;
  options?: QuestionOption[];
  followUpFromOptions?: QuestionOption[];
}

export interface Questionnaire {
  id: string;
  title: string;
  description?: string | null;
  status: QuestionnaireStatus;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  questions?: Question[];
  assignmentsCount?: number;
  responsesCount?: number;
}

export interface QuestionnaireAssignment {
  id: string;
  status: AssignmentStatus;
  assignedAt: string;
  submittedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  questionnaireId: string;
  supplierId: string;
  productId?: string | null;
  questionnaire?: Questionnaire;
  supplier?: Supplier;
  product?: Product | null;
  answers?: Answer[];
  _count?: { answers: number };
  aiAssessment?: AiAssessmentResponse | null;
}

export interface Answer {
  id: string;
  assignmentId: string;
  questionId: string;
  selectedOptionId?: string | null;
  textValue?: string | null;
  numberValue?: number | null;
  booleanValue?: boolean | null;
  createdAt?: string;
  updatedAt?: string;
  question?: Question;
  selectedOption?: QuestionOption | null;
}

export interface AnswerItemDto {
  questionId: string;
  textValue?: string;
  numberValue?: number;
  booleanValue?: boolean;
  selectedOptionId?: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  senderId: string;
  receiverId: string;
  createdAt: string;
  sender?: User;
  receiver?: User;
}

// Auth Types
export interface AuthResponse {
  access_token: string;
  user?: User;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  companyName: string;
  description?: string;
  phone?: string;
  address?: string;
}

// Responses payload from GET /api/assignments/questionnaire/:id/responses
export interface QuestionnaireResponsesResult {
  questionnaire: {
    id: string;
    title: string;
    status: QuestionnaireStatus;
  };
  totalSubmissions: number;
  submissions: QuestionnaireAssignment[];
}

// AI Supplier Assessment Response
export interface AiAssessmentResponse {
  score: number;
  label: string;
  summary: string;
  concerns: string[];
  recommendations: string[];
  disclaimer: string;
}

// Analytics and summary types
export interface QuestionnaireStats {
  questionnaireId: string;
  title: string;
  totalAssignments: number;
  completedAssignments: number;
  pendingAssignments: number;
  inProgressAssignments: number;
  completionRate: number;
  questionBreakdown: QuestionStatItem[];
}

export interface QuestionStatItem {
  questionId: string;
  questionText: string;
  type: QuestionType;
  totalAnswers: number;
  // Option distribution for SINGLE_CHOICE and YES_NO
  optionCounts?: Record<string, { label: string; count: number; percentage: number }>;
  // Numeric stats for NUMBER
  average?: number;
  min?: number;
  max?: number;
  // Sample answers for TEXT
  sampleTextAnswers?: string[];
}

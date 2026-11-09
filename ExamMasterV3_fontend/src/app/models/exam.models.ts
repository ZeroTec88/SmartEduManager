export type ExamStatus = 'draft' | 'scheduled' | 'active' | 'completed';

export type QuestionType =
  | 'multiple-choice'
  | 'checkbox'
  | 'dropdown'
  | 'short-answer'
  | 'essay'
  | 'linear-scale'
  | 'rating'
  | 'date'
  | 'time'
  | 'true-false'
  | 'text';

export interface ApiUserDto {
  id?: string;
  Id?: string;
  firstName?: string;
  FirstName?: string;
  lastName?: string;
  LastName?: string;
  email?: string;
  Email?: string;
  username?: string;
  Username?: string;
  roles?: string[];
  Roles?: string[];
}

export interface StudentUser {
  id?: string;
  studentId?: number;
  misNo?: string;
  nameWithInitials?: string;
  fullName?: string;
  nicNo?: string;
  gender?: string;
  address?: string;
  telephone?: string;
  email?: string;
  batchId?: number;
  batchCode?: string;
  gsDivision?: string;
  agDivision?: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  roles?: string[];
}

export interface ApiLoginResponse {
  accessToken?: string;
  AccessToken?: string;
  refreshToken?: string;
  RefreshToken?: string;
  expiresAt?: string;
  ExpiresAt?: string;
  user?: ApiUserDto;
  User?: ApiUserDto;
}

export interface ApiQuestionDto {
  id?: number;
  Id?: number;
  content?: string;
  Content?: string;
  type?: QuestionType | string;
  Type?: QuestionType | string;
  difficulty?: string;
  Difficulty?: string;
  categoryId?: number;
  CategoryId?: number;
  categoryName?: string;
  CategoryName?: string;
  marks?: number;
  Marks?: number;
  options?: string[];
  Options?: string[];
  correctAnswer?: string;
  CorrectAnswer?: string;
  explanation?: string;
  Explanation?: string;
  tags?: string[];
  Tags?: string[];
  createdAt?: string;
  CreatedAt?: string;
  updatedAt?: string;
  UpdatedAt?: string;
  imageUrl?: string;
  ImageUrl?: string;
}

export interface ApiExamQuestionDto {
  id?: number;
  Id?: number;
  examId?: number;
  ExamId?: number;
  questionId?: number;
  QuestionId?: number;
  order?: number;
  Order?: number;
  question?: ApiQuestionDto | null;
  Question?: ApiQuestionDto | null;
}

export interface ApiExamDto {
  id?: number;
  Id?: number;
  title?: string;
  Title?: string;
  description?: string | null;
  Description?: string | null;
  categoryId?: number | null;
  CategoryId?: number | null;
  categoryName?: string;
  CategoryName?: string;
  totalMarks?: number;
  TotalMarks?: number;
  questionCount?: number;
  QuestionCount?: number;
  duration?: number;
  Duration?: number;
  isActive?: boolean;
  IsActive?: boolean;
  createdAt?: string;
  CreatedAt?: string;
  status?: ExamStatus | string;
  Status?: ExamStatus | string;
  availableFrom?: string | null;
  AvailableFrom?: string | null;
  availableTo?: string | null;
  AvailableTo?: string | null;
  timeZone?: string | null;
  TimeZone?: string | null;
  maxAttempts?: number;
  MaxAttempts?: number;
  attemptsUsed?: number;
  AttemptsUsed?: number;
  questions?: ApiExamQuestionDto[] | null;
  Questions?: ApiExamQuestionDto[] | null;
}

export interface ApiExamAnswerDto {
  id?: number;
  Id?: number;
  examAttemptId?: number;
  ExamAttemptId?: number;
  questionId?: number;
  QuestionId?: number;
  selectedAnswer?: string | null;
  SelectedAnswer?: string | null;
  isCorrect?: boolean;
  IsCorrect?: boolean;
  marksObtained?: number;
  MarksObtained?: number;
}

export interface ApiExamAttemptDto {
  id?: number;
  Id?: number;
  examId?: number;
  ExamId?: number;
  studentId?: string;
  StudentId?: string;
  startedAt?: string;
  StartedAt?: string;
  submittedAt?: string | null;
  SubmittedAt?: string | null;
  score?: number;
  Score?: number;
  totalMarks?: number;
  TotalMarks?: number;
  isCompleted?: boolean;
  IsCompleted?: boolean;
  status?: string;
  Status?: string;
  exam?: ApiExamDto | null;
  Exam?: ApiExamDto | null;
  answers?: ApiExamAnswerDto[] | null;
  Answers?: ApiExamAnswerDto[] | null;
}

export interface ApiExamAnswerResultDto {
  questionId?: number;
  QuestionId?: number;
  questionContent?: string;
  QuestionContent?: string;
  selectedAnswer?: string | null;
  SelectedAnswer?: string | null;
  correctAnswer?: string | null;
  CorrectAnswer?: string | null;
  isCorrect?: boolean;
  IsCorrect?: boolean;
  marksObtained?: number;
  MarksObtained?: number;
  totalMarks?: number;
  TotalMarks?: number;
}

export interface ApiExamResultDto {
  id?: number;
  Id?: number;
  examId?: number;
  ExamId?: number;
  examTitle?: string;
  ExamTitle?: string;
  score?: number;
  Score?: number;
  totalMarks?: number;
  TotalMarks?: number;
  percentage?: number;
  Percentage?: number;
  status?: string;
  Status?: string;
  startedAt?: string;
  StartedAt?: string;
  submittedAt?: string | null;
  SubmittedAt?: string | null;
  answers?: ApiExamAnswerResultDto[] | null;
  Answers?: ApiExamAnswerResultDto[] | null;
}

export interface ExamQuestionItem {
  id: number;
  content: string;
  type: QuestionType;
  difficulty: string;
  categoryId: number;
  categoryName: string;
  marks: number;
  options: string[];
  correctAnswer?: string;
  explanation?: string;
  tags: string[];
  imageUrl?: string;
}

export interface ExamQuestion {
  id?: number;
  examId: number;
  questionId: number;
  order: number;
  question?: ExamQuestionItem | null;
}

export interface Exam {
  id: number;
  title: string;
  description?: string;
  categoryId: number | null;
  categoryName: string;
  totalMarks: number;
  questionCount: number;
  duration: number;
  isActive: boolean;
  status: ExamStatus;
  createdAt?: string;
  availableFrom?: string | null;
  availableTo?: string | null;
  timeZone?: string | null;
  maxAttempts: number;
  attemptsUsed: number;
  questions: ExamQuestion[];
}

export interface ExamAttempt {
  id: number;
  examId: number;
  studentId: string;
  startedAt: string;
  submittedAt?: string | null;
  score: number;
  totalMarks: number;
  isCompleted: boolean;
  status: string;
  exam: Exam;
  answers?: ExamAnswer[];
}

export interface ExamAnswer {
  id: number;
  examAttemptId: number;
  questionId: number;
  selectedAnswer?: string | null;
  isCorrect: boolean;
  marksObtained: number;
}

export interface ExamAnswerSubmission {
  questionId: number;
  selectedAnswer?: string | null;
}

export interface ExamAnswerResult {
  questionId: number;
  questionContent: string;
  selectedAnswer?: string | null;
  correctAnswer?: string | null;
  isCorrect: boolean;
  marksObtained: number;
  totalMarks: number;
}

export interface ExamResult {
  id: number;
  examId: number;
  examTitle: string;
  score: number;
  totalMarks: number;
  percentage: number;
  status: string;
  startedAt: string;
  submittedAt?: string | null;
  answers: ExamAnswerResult[];
}

export function normalizeQuestionType(value: string | null | undefined): QuestionType {
  const normalized = (value ?? 'text').toLowerCase().trim();
  const aliases: Record<string, QuestionType> = {
    multiplechoice: 'multiple-choice',
    'single-choice': 'multiple-choice',
    mcq: 'multiple-choice',
    truefalse: 'true-false',
    boolean: 'true-false'
  };
  const canonical = aliases[normalized] ?? normalized;

  const knownTypes: QuestionType[] = [
    'multiple-choice',
    'checkbox',
    'dropdown',
    'short-answer',
    'essay',
    'linear-scale',
    'rating',
    'date',
    'time',
    'true-false',
    'text'
  ];

  if (knownTypes.includes(canonical as QuestionType)) {
    return canonical as QuestionType;
  }

  return 'text';
}

export function normalizeExamStatus(value: string | null | undefined): ExamStatus {
  const normalized = (value ?? 'draft').toLowerCase().trim();

  if (normalized === 'scheduled' || normalized === 'active' || normalized === 'completed') {
    return normalized;
  }

  return 'draft';
}

import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, map, Observable, tap, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  ApiExamAnswerResultDto,
  ApiExamAttemptDto,
  ApiExamDto,
  ApiExamQuestionDto,
  ApiExamResultDto,
  ApiQuestionDto,
  Exam,
  ExamAnswerResult,
  ExamAnswerSubmission,
  ExamAttempt,
  ExamQuestion,
  ExamQuestionItem,
  ExamResult,
  normalizeExamStatus,
  normalizeQuestionType
} from '../models/exam.models';

@Injectable({
  providedIn: 'root'
})
export class ExamService {
  private readonly API_URL = environment.apiUrl;

  exams = signal<Exam[]>([]);
  isLoading = signal(false);
  error = signal<string | null>(null);

  constructor(private http: HttpClient) {}

  getAvailableExams(): Observable<Exam[]> {
    this.isLoading.set(true);
    this.error.set(null);

    return this.http.get<ApiExamDto[]>(`${this.API_URL}/exams/student`).pipe(
      map(data => data.map(item => this.toExam(item)).sort((a, b) => a.title.localeCompare(b.title))),
      tap(mapped => {
        this.exams.set(mapped);
        this.isLoading.set(false);
      }),
      catchError(() => {
        this.isLoading.set(false);
        this.error.set('Unable to load exams. Please check your connection and try again.');
        return throwError(() => new Error('Unable to load exams'));
      })
    );
  }

  getExamWithQuestions(id: number): Observable<Exam> {
    return this.http.get<ApiExamDto>(`${this.API_URL}/exams/${id}/questions`).pipe(
      map(data => this.toExam(data))
    );
  }

  startExam(examId: number): Observable<ExamAttempt> {
    return this.http.post<ApiExamAttemptDto>(`${this.API_URL}/exam-attempts/start`, { examId }).pipe(
      map(data => this.toExamAttempt(data))
    );
  }

  submitExam(attemptId: number, answers: ExamAnswerSubmission[]): Observable<ExamResult> {
    return this.http.post<ApiExamResultDto>(`${this.API_URL}/exam-attempts/submit`, {
      examAttemptId: attemptId,
      answers
    }).pipe(
      map(data => this.toExamResult(data))
    );
  }

  getMyResults(): Observable<ExamResult[]> {
    return this.http.get<ApiExamResultDto[]>(`${this.API_URL}/exam-attempts/my-results`).pipe(
      map(data => data.map(item => this.toExamResult(item)))
    );
  }

  getResult(resultId: number): Observable<ExamResult> {
    return this.http.get<ApiExamResultDto>(`${this.API_URL}/exam-attempts/results/${resultId}`).pipe(
      map(data => this.toExamResult(data))
    );
  }

  private toExam(exam: ApiExamDto): Exam {
    const questions = (exam.questions ?? exam.Questions ?? [])
      .map(item => this.toExamQuestion(item))
      .sort((a, b) => a.order - b.order);
    const totalMarks = this.getNumber(exam.totalMarks ?? exam.TotalMarks, questions.reduce((sum, item) => sum + (item.question?.marks ?? 0), 0));

    return {
      id: this.getNumber(exam.id ?? exam.Id, 0),
      title: this.getString(exam.title ?? exam.Title, 'Untitled Exam'),
      description: exam.description ?? exam.Description ?? undefined,
      categoryId: exam.categoryId ?? exam.CategoryId ?? null,
      categoryName: this.getString(exam.categoryName ?? exam.CategoryName, 'Uncategorized'),
      totalMarks,
      questionCount: this.getNumber(exam.questionCount ?? exam.QuestionCount, questions.length),
      duration: this.getNumber(exam.duration ?? exam.Duration, 60),
      isActive: exam.isActive ?? exam.IsActive ?? false,
      status: normalizeExamStatus(exam.status ?? exam.Status),
      createdAt: exam.createdAt ?? exam.CreatedAt,
      availableFrom: exam.availableFrom ?? exam.AvailableFrom ?? null,
      availableTo: exam.availableTo ?? exam.AvailableTo ?? null,
      timeZone: exam.timeZone ?? exam.TimeZone ?? null,
      maxAttempts: this.getNumber(exam.maxAttempts ?? exam.MaxAttempts, 0),
      attemptsUsed: this.getNumber(exam.attemptsUsed ?? exam.AttemptsUsed, 0),
      questions
    };
  }

  private toExamQuestion(examQuestion: ApiExamQuestionDto): ExamQuestion {
    const questionData = examQuestion.question ?? examQuestion.Question;

    return {
      id: this.getNumber(examQuestion.id ?? examQuestion.Id, 0),
      examId: this.getNumber(examQuestion.examId ?? examQuestion.ExamId, 0),
      questionId: this.getNumber(examQuestion.questionId ?? examQuestion.QuestionId, 0),
      order: this.getNumber(examQuestion.order ?? examQuestion.Order, 0),
      question: questionData ? this.toQuestion(questionData) : null
    };
  }

  private toQuestion(question: ApiQuestionDto): ExamQuestionItem {
    return {
      id: this.getNumber(question.id ?? question.Id, 0),
      content: this.getString(question.content ?? question.Content, ''),
      type: normalizeQuestionType(question.type ?? question.Type),
      difficulty: this.getString(question.difficulty ?? question.Difficulty, 'medium'),
      categoryId: this.getNumber(question.categoryId ?? question.CategoryId, 0),
      categoryName: this.getString(question.categoryName ?? question.CategoryName, 'Uncategorized'),
      marks: this.getNumber(question.marks ?? question.Marks, 1),
      options: question.options ?? question.Options ?? [],
      correctAnswer: question.correctAnswer ?? question.CorrectAnswer ?? undefined,
      explanation: question.explanation ?? question.Explanation ?? undefined,
      tags: question.tags ?? question.Tags ?? [],
      imageUrl: question.imageUrl ?? question.ImageUrl ?? undefined
    };
  }

  private toExamAttempt(attempt: ApiExamAttemptDto): ExamAttempt {
    const exam = attempt.exam ?? attempt.Exam;

    return {
      id: this.getNumber(attempt.id ?? attempt.Id, 0),
      examId: this.getNumber(attempt.examId ?? attempt.ExamId, 0),
      studentId: this.getString(attempt.studentId ?? attempt.StudentId, ''),
      startedAt: attempt.startedAt ?? attempt.StartedAt ?? new Date().toISOString(),
      submittedAt: attempt.submittedAt ?? attempt.SubmittedAt ?? null,
      score: this.getNumber(attempt.score ?? attempt.Score, 0),
      totalMarks: this.getNumber(attempt.totalMarks ?? attempt.TotalMarks, 0),
      isCompleted: attempt.isCompleted ?? attempt.IsCompleted ?? false,
      status: this.getString(attempt.status ?? attempt.Status, 'InProgress'),
      exam: exam ? this.toExam(exam) : {
        id: this.getNumber(attempt.examId ?? attempt.ExamId, 0),
        title: 'Exam',
        categoryId: null,
        categoryName: 'Uncategorized',
        totalMarks: this.getNumber(attempt.totalMarks ?? attempt.TotalMarks, 0),
        questionCount: 0,
        duration: 60,
        isActive: false,
        status: 'active',
        maxAttempts: 0,
        attemptsUsed: 0,
        questions: []
      },
      answers: (attempt.answers ?? attempt.Answers ?? []).map(answer => ({
        id: this.getNumber(answer.id ?? answer.Id, 0),
        examAttemptId: this.getNumber(answer.examAttemptId ?? answer.ExamAttemptId, 0),
        questionId: this.getNumber(answer.questionId ?? answer.QuestionId, 0),
        selectedAnswer: answer.selectedAnswer ?? answer.SelectedAnswer ?? null,
        isCorrect: answer.isCorrect ?? answer.IsCorrect ?? false,
        marksObtained: this.getNumber(answer.marksObtained ?? answer.MarksObtained, 0)
      }))
    };
  }

  private toExamResult(result: ApiExamResultDto): ExamResult {
    return {
      id: this.getNumber(result.id ?? result.Id, 0),
      examId: this.getNumber(result.examId ?? result.ExamId, 0),
      examTitle: this.getString(result.examTitle ?? result.ExamTitle, 'Exam'),
      score: this.getNumber(result.score ?? result.Score, 0),
      totalMarks: this.getNumber(result.totalMarks ?? result.TotalMarks, 0),
      percentage: this.getNumber(result.percentage ?? result.Percentage, 0),
      status: this.getString(result.status ?? result.Status, 'Completed'),
      startedAt: result.startedAt ?? result.StartedAt ?? new Date().toISOString(),
      submittedAt: result.submittedAt ?? result.SubmittedAt ?? null,
      answers: this.toAnswerResults(result.answers ?? result.Answers ?? [])
    };
  }

  private toAnswerResults(answers: ApiExamAnswerResultDto[]): ExamAnswerResult[] {
    return answers.map(answer => ({
      questionId: this.getNumber(answer.questionId ?? answer.QuestionId, 0),
      questionContent: this.getString(answer.questionContent ?? answer.QuestionContent, 'Unknown question'),
      selectedAnswer: answer.selectedAnswer ?? answer.SelectedAnswer ?? null,
      correctAnswer: answer.correctAnswer ?? answer.CorrectAnswer ?? null,
      isCorrect: answer.isCorrect ?? answer.IsCorrect ?? false,
      marksObtained: this.getNumber(answer.marksObtained ?? answer.MarksObtained, 0),
      totalMarks: this.getNumber(answer.totalMarks ?? answer.TotalMarks, 0)
    }));
  }

  private getString(value: string | null | undefined, fallback: string): string {
    return value === null || value === undefined ? fallback : value;
  }

  private getNumber(value: number | null | undefined, fallback: number): number {
    return typeof value === 'number' && !Number.isNaN(value) ? value : fallback;
  }
}

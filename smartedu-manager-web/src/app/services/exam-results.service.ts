import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../environments/environment';

export interface BatchExamResultDto {
  attemptId: number;
  examId: number;
  examTitle: string;
  studentId: string;
  studentName: string;
  nameWithInitials: string;
  misNo: string;
  score: number;
  totalMarks: number;
  percentage: number;
  status: string;
  startedAt: string;
  submittedAt?: string;
}

export interface BatchExamSummaryDto {
  batchId: number;
  batchCode: string;
  courseName: string;
  totalStudents: number;
  studentsAttempted: number;
  totalAttempts: number;
  averagePercentage: number;
  highestPercentage: number;
  lowestPercentage: number;
  results: BatchExamResultDto[];
}

export interface ExamBatchStatsDto {
  examId: number;
  examTitle: string;
  totalMarks: number;
  totalAttempts: number;
  totalStudents: number;
  studentsAttempted: number;
  averagePercentage: number;
  highestPercentage: number;
  lowestPercentage: number;
  batchSummaries: BatchExamSummaryDto[];
}

export interface StudentExamSummaryDto {
  studentId: string;
  studentName: string;
  nameWithInitials: string;
  misNo: string;
  nicNo: string;
  totalAttempts: number;
  bestScore: number;
  bestPercentage: number;
  averagePercentage: number;
  attempts: ExamResultDto[];
}

export interface ExamResultDto {
  id: number;
  examId: number;
  examTitle: string;
  score: number;
  totalMarks: number;
  percentage: number;
  status: string;
  startedAt: string;
  submittedAt?: string;
  answers?: ExamAnswerResultDto[];
}

export interface ExamAnswerResultDto {
  questionId: number;
  questionContent: string;
  selectedAnswer?: string;
  correctAnswer?: string;
  isCorrect: boolean;
  marksObtained: number;
  totalMarks: number;
}

@Injectable({ providedIn: 'root' })
export class ExamResultsService {
  private readonly http = inject(HttpClient);
  private readonly API_URL = environment.apiUrl;

  getBatchResults(batchId: number): Observable<BatchExamResultDto[]> {
    return this.http.get<BatchExamResultDto[]>(`${this.API_URL}/exam-attempts/batch/${batchId}`).pipe(
      catchError(error => {
        console.error('Error loading batch results:', error);
        return throwError(() => error);
      })
    );
  }

  getBatchResultsByExam(batchId: number, examId: number): Observable<BatchExamResultDto[]> {
    return this.http.get<BatchExamResultDto[]>(`${this.API_URL}/exam-attempts/batch/${batchId}/exam/${examId}`).pipe(
      catchError(error => {
        console.error('Error loading batch results by exam:', error);
        return throwError(() => error);
      })
    );
  }

  getExamResults(examId: number): Observable<BatchExamResultDto[]> {
    return this.http.get<BatchExamResultDto[]>(`${this.API_URL}/exam-attempts/exam/${examId}`).pipe(
      catchError(error => {
        console.error('Error loading exam results:', error);
        return throwError(() => error);
      })
    );
  }

  getStudentResults(studentId: string): Observable<ExamResultDto[]> {
    return this.http.get<ExamResultDto[]>(`${this.API_URL}/exam-attempts/student/${studentId}`).pipe(
      catchError(error => {
        console.error('Error loading student results:', error);
        return throwError(() => error);
      })
    );
  }

  getExamBatchStats(): Observable<ExamBatchStatsDto[]> {
    return this.http.get<ExamBatchStatsDto[]>(`${this.API_URL}/exam-attempts/stats`).pipe(
      catchError(error => {
        console.error('Error loading exam batch stats:', error);
        return throwError(() => error);
      })
    );
  }

  getBatchSummary(batchId: number, examId: number): Observable<BatchExamSummaryDto> {
    return this.http.get<BatchExamSummaryDto>(`${this.API_URL}/exam-attempts/batch/${batchId}/summary/${examId}`).pipe(
      catchError(error => {
        console.error('Error loading batch summary:', error);
        return throwError(() => error);
      })
    );
  }
}

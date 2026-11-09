import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ExamResultsService, BatchExamSummaryDto, BatchExamResultDto, ExamBatchStatsDto, ExamResultDto } from '../../services/exam-results.service';
import { BatchService, Batch } from '../../services/batch.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-exam-results',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './exam-results.component.html',
  styleUrl: './exam-results.component.scss'
})
export class ExamResultsComponent implements OnInit {
  private readonly examResultsService = inject(ExamResultsService);
  private readonly batchService = inject(BatchService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  batches = signal<Batch[]>([]);
  exams = signal<any[]>([]);
  batchSummaries = signal<BatchExamSummaryDto[]>([]);
  selectedBatchId = signal<number | null>(null);
  selectedExamId = signal<number | null>(null);
  selectedStudentResults = signal<ExamResultDto[]>([]);
  selectedStudentName = signal<string>('');
  studentAvgPercentage = signal<number>(0);
  studentMaxPercentage = signal<number>(0);
  isLoading = signal(false);
  showStudentDetail = signal(false);

  ngOnInit(): void {
    this.loadBatches();
  }

  loadBatches(): void {
    this.isLoading.set(true);
    this.batchService.getBatches().subscribe({
      next: batches => {
        this.batches.set(batches);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.toast.error('Failed to load batches');
      }
    });
  }

  onBatchChange(batchId: number | null): void {
    this.selectedBatchId.set(batchId);
    this.selectedExamId.set(null);
    this.batchSummaries.set([]);
    this.showStudentDetail.set(false);
    if (!batchId) return;
    this.loadExamsForBatch(batchId);
  }

  loadExamsForBatch(batchId: number): void {
    this.isLoading.set(true);
    this.examResultsService.getExamBatchStats().subscribe({
      next: stats => {
        // Show all exams (batch filtering not possible at backend level since
        // ExamAttempts.StudentId is the Identity user ID, not linked to Student.BatchId)
        this.exams.set(stats);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.toast.error('Failed to load exams');
      }
    });
  }

  onExamChange(examId: number | null): void {
    this.selectedExamId.set(examId);
    this.showStudentDetail.set(false);
    if (!examId || !this.selectedBatchId()) return;
    this.loadBatchSummary(this.selectedBatchId()!, examId);
  }

  loadBatchSummary(batchId: number, examId: number): void {
    this.isLoading.set(true);
    this.examResultsService.getBatchSummary(batchId, examId).subscribe({
      next: summary => {
        // Use the first (and only) summary returned; backend returns BatchId=0 (all batches)
        // since ExamAttempts.StudentId is not linked to Student.BatchId
        this.batchSummaries.set([summary]);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.toast.error('Failed to load batch summary');
      }
    });
  }

  viewStudentResults(studentId: string, studentName: string): void {
    this.selectedStudentName.set(studentName);
    this.isLoading.set(true);
    this.examResultsService.getStudentResults(studentId).subscribe({
      next: results => {
        this.selectedStudentResults.set(results);
        const percentages = results.map(r => r.percentage);
        this.studentAvgPercentage.set(percentages.length > 0 ? percentages.reduce((a, b) => a + b, 0) / percentages.length : 0);
        this.studentMaxPercentage.set(percentages.length > 0 ? Math.max(...percentages) : 0);
        this.showStudentDetail.set(true);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.toast.error('Failed to load student results');
      }
    });
  }

  backToBatchView(): void {
    this.showStudentDetail.set(false);
    this.selectedStudentResults.set([]);
  }

  getAveragePercentage(results: BatchExamResultDto[]): number {
    if (results.length === 0) return 0;
    return results.reduce((sum, r) => sum + r.percentage, 0) / results.length;
  }

  getPassRate(results: BatchExamResultDto[]): number {
    if (results.length === 0) return 0;
    const passed = results.filter(r => r.percentage >= 60).length;
    return (passed / results.length) * 100;
  }

  formatDate(value: string | null | undefined): string {
    if (!value) return 'Not submitted';
    const date = new Date(value);
    if (isNaN(date.getTime())) return 'Not submitted';
    return date.toLocaleString(undefined, {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }

  getStatusBadgeClass(status: string): string {
    return status.toLowerCase() === 'completed' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800';
  }

  exportResults(): void {
    this.toast.info('Export functionality coming soon');
  }

  gradeColor(percentage: number): string {
    if (percentage >= 60) return '#2563eb';
    if (percentage >= 40) return '#d97706';
    return '#dc2626';
  }

}

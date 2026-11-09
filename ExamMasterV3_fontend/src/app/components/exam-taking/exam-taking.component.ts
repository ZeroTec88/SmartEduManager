import { Component, HostListener, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ExamAnswerSubmission, ExamQuestion, ExamAttempt } from '../../models/exam.models';
import { ExamService } from '../../services/exam.service';
import { ToastService } from '../../services/toast.service';
import { environment } from '../../../environments/environment';

const AUTOSAVE_KEY = 'exam-master-autosave';

@Component({
  selector: 'app-exam-taking',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './exam-taking.component.html',
  styleUrl: './exam-taking.component.scss'
})
export class ExamTakingComponent implements OnInit, OnDestroy {
  private readonly examService = inject(ExamService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  attempt = signal<ExamAttempt | null>(null);
  currentQuestionIndex = signal(0);
  answers = signal<Map<number, string>>(new Map());
  timeRemaining = signal(0);
  isSubmitting = signal(false);
  showConfirmSubmit = signal(false);
  submitError = signal<string | null>(null);

  private timerInterval: ReturnType<typeof setInterval> | null = null;
  private autosaveInterval: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    const examId = Number(this.route.snapshot.paramMap.get('id'));

    if (!examId) {
      this.router.navigate(['/exam']);
      return;
    }

    const saved = sessionStorage.getItem(AUTOSAVE_KEY);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data.examId === examId && data.answers) {
          this.answers.set(new Map(data.answers));
        }
      } catch {
        // ignore
      }
    }

    this.startExam(examId);
  }

  ngOnDestroy(): void {
    this.clearTimer();
    this.clearAutosave();
  }

  @HostListener('window:beforeunload', ['$event'])
  handleBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.attempt() && !this.attempt()!.isCompleted) {
      event.preventDefault();
      event.returnValue = true;
    }
  }

  @HostListener('window:visibilitychange')
  handleVisibilityChange(): void {
    if (document.hidden && this.attempt() && !this.attempt()!.isCompleted) {
      this.toast.warning('Tab switch detected. Please stay on this exam page.');
    }
  }

  get questions(): ExamQuestion[] {
    return this.attempt()?.exam?.questions ?? [];
  }

  get currentQuestion(): ExamQuestion | null {
    return this.questions[this.currentQuestionIndex()] ?? null;
  }

  get totalQuestions(): number {
    return this.questions.length;
  }

  get answeredCount(): number {
    return Array.from(this.answers().entries()).filter(([, value]) => value.trim().length > 0).length;
  }

  get unansweredCount(): number {
    return Math.max(this.totalQuestions - this.answeredCount, 0);
  }

  get progress(): number {
    return this.totalQuestions > 0 ? Math.round(((this.currentQuestionIndex() + 1) / this.totalQuestions) * 100) : 0;
  }

  get selectedAnswer(): string | undefined {
    if (!this.currentQuestion) {
      return undefined;
    }
    return this.answers().get(this.currentQuestion.questionId);
  }

  get examTitle(): string {
    return this.attempt()?.exam?.title ?? 'Exam';
  }

  get examDescription(): string {
    return this.attempt()?.exam?.description ?? '';
  }

  get attemptLabel(): string {
    const exam = this.attempt()?.exam;
    if (!exam) {
      return '';
    }

    if (exam.maxAttempts === 0) {
      return `Attempt ${exam.attemptsUsed + 1}`;
    }

    return `Attempt ${Math.min(exam.attemptsUsed + 1, exam.maxAttempts)} of ${exam.maxAttempts}`;
  }

  startExam(examId: number): void {
    this.examService.startExam(examId).subscribe({
      next: data => {
        const hasExistingAnswers = (data.answers ?? []).length > 0;
        this.attempt.set(data);
        this.timeRemaining.set(this.calculateRemainingTime(data));
        this.initializeExistingAnswers(data);
        this.startTimer();
        this.startAutosave();
      },
      error: error => {
        console.error('Failed to start exam:', error);
        this.submitError.set('Unable to start this exam. It may be unavailable or already submitted.');
        this.router.navigate(['/exam']);
      }
    });
  }

  initializeExistingAnswers(data: ExamAttempt): void {
    const existingAnswers = new Map<number, string>();

    for (const answer of data.answers ?? []) {
      existingAnswers.set(answer.questionId, answer.selectedAnswer ?? '');
    }

    this.answers.set(existingAnswers);
  }

  calculateRemainingTime(data: ExamAttempt): number {
    const totalSeconds = data.exam.duration * 60;
    const startedAt = new Date(data.startedAt).getTime();

    if (Number.isNaN(startedAt)) {
      return totalSeconds;
    }

    const elapsedSeconds = Math.floor((Date.now() - startedAt) / 1000);
    return Math.max(totalSeconds - elapsedSeconds, 0);
  }

  startTimer(): void {
    this.clearTimer();

    this.timerInterval = setInterval(() => {
      const remaining = this.timeRemaining() - 1;

      if (remaining <= 0) {
        this.timeRemaining.set(0);
        this.clearTimer();
        this.submitExam(true);
        return;
      }

      this.timeRemaining.set(remaining);
    }, 1000);
  }

  clearTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  startAutosave(): void {
    this.clearAutosave();

    this.autosaveInterval = setInterval(() => {
      const attempt = this.attempt();
      if (!attempt || attempt.isCompleted) {
        return;
      }

      const payload = {
        examId: attempt.examId,
        attemptId: attempt.id,
        answers: Array.from(this.answers().entries()).map(([questionId, selectedAnswer]) => ({
          questionId,
          selectedAnswer
        }))
      };

      sessionStorage.setItem(AUTOSAVE_KEY, JSON.stringify(payload));
    }, 5000);
  }

  clearAutosave(): void {
    if (this.autosaveInterval) {
      clearInterval(this.autosaveInterval);
      this.autosaveInterval = null;
    }
  }

  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  setAnswer(questionId: number, value: string): void {
    this.answers.update(map => {
      const next = new Map(map);
      next.set(questionId, value);
      return next;
    });
  }

  selectAnswer(answer: string): void {
    if (!this.currentQuestion) {
      return;
    }
    this.setAnswer(this.currentQuestion.questionId, answer);
  }

  onCheckboxChange(option: string, event: Event): void {
    if (!this.currentQuestion) {
      return;
    }

    const checkbox = event.target as HTMLInputElement;
    const current = this.answers().get(this.currentQuestion.questionId) || '';
    const selected = current ? current.split(',').filter(Boolean) : [];

    if (checkbox.checked && !selected.includes(option)) {
      selected.push(option);
    }

    if (!checkbox.checked) {
      const index = selected.indexOf(option);
      if (index > -1) {
        selected.splice(index, 1);
      }
    }

    this.setAnswer(this.currentQuestion.questionId, selected.join(','));
  }

  onTextInput(questionId: number, value: string | number): void {
    this.setAnswer(questionId, String(value));
  }

  toggleCheckbox(questionId: number, option: string): void {
    const current = this.answers().get(questionId) || '';
    const selected = current ? current.split(',').filter(Boolean) : [];
    const index = selected.indexOf(option);

    if (index > -1) {
      selected.splice(index, 1);
    } else {
      selected.push(option);
    }

    this.setAnswer(questionId, selected.join(','));
  }

  nextQuestion(): void {
    if (this.currentQuestionIndex() < this.totalQuestions - 1) {
      this.currentQuestionIndex.update(index => index + 1);
      this.submitError.set(null);
    }
  }

  previousQuestion(): void {
    if (this.currentQuestionIndex() > 0) {
      this.currentQuestionIndex.update(index => index - 1);
      this.submitError.set(null);
    }
  }

  goToQuestion(index: number): void {
    this.currentQuestionIndex.set(index);
    this.submitError.set(null);
  }

  isAnswered(questionId: number): boolean {
    return (this.answers().get(questionId) ?? '').trim().length > 0;
  }

  confirmSubmit(): void {
    if (this.unansweredCount > 0) {
      const confirmed = window.confirm(`You have ${this.unansweredCount} unanswered question(s). Submit anyway?`);
      if (!confirmed) {
        return;
      }
    }

    this.showConfirmSubmit.set(true);
  }

  submitExam(autoSubmit = false): void {
    if (!this.attempt()) {
      return;
    }

    this.isSubmitting.set(true);
    this.showConfirmSubmit.set(false);
    this.submitError.set(null);
    this.clearTimer();
    this.clearAutosave();
    sessionStorage.removeItem(AUTOSAVE_KEY);

    const answers = this.buildSubmissions();

    this.examService.submitExam(this.attempt()!.id, answers).subscribe({
      next: result => {
        this.router.navigate(['/exam', 'result', result.id]);
      },
      error: error => {
        console.error('Failed to submit exam:', error);
        this.submitError.set(autoSubmit ? 'Time is up, but the server could not submit your answers.' : 'Unable to submit exam. Please try again.');
        this.isSubmitting.set(false);
        if (!autoSubmit) {
          this.showConfirmSubmit.set(true);
        }
      }
    });
  }

  buildSubmissions(): ExamAnswerSubmission[] {
    return this.questions.map(question => ({
      questionId: question.questionId,
      selectedAnswer: this.answers().get(question.questionId) ?? ''
    }));
  }

  questionTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      'multiple-choice': 'Single answer',
      checkbox: 'Multiple answers',
      dropdown: 'Dropdown',
      'short-answer': 'Short answer',
      essay: 'Essay',
      'linear-scale': 'Scale',
      rating: 'Rating',
      date: 'Date',
      time: 'Time',
      'true-false': 'True / False',
      text: 'Text answer'
    };

    return labels[type] || 'Text answer';
  }

  isTextQuestion(type: string): boolean {
    return ['short-answer', 'essay', 'text'].includes(type);
  }

  isDateQuestion(type: string): boolean {
    return type === 'date';
  }

  isTimeQuestion(type: string): boolean {
    return type === 'time';
  }

  isScaleQuestion(type: string): boolean {
    return ['linear-scale', 'rating'].includes(type);
  }

  isTrueFalseQuestion(type: string): boolean {
    return type === 'true-false';
  }

  isCheckboxQuestion(type: string): boolean {
    return type === 'checkbox';
  }

  isOptionQuestion(type: string): boolean {
    return ['multiple-choice', 'dropdown'].includes(type);
  }

  getQuestionImageUrl(imageUrl: string | undefined): string {
    if (!imageUrl) {
      return '';
    }

    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      return imageUrl;
    }

    const normalized = imageUrl.replace(/\\/g, '/').replace(/^\/+/g, '');
    if (normalized.startsWith('uploads/')) {
      return `${environment.apiUrl.replace(/\/api$/, '')}/${normalized}`;
    }

    return `${environment.apiUrl.replace(/\/api$/, '')}/uploads/${normalized}`;
  }

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
  }

  confirmExit(): void {
    if (window.confirm('Exit this exam? Your submitted answers cannot be recovered.')) {
      this.clearTimer();
      this.clearAutosave();
      this.router.navigate(['/exam']);
    }
  }
}

import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { ToastService } from '../../services/toast.service';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { firstValueFrom, EMPTY, catchError } from 'rxjs';
import { ExamEditorModalComponent } from '../exam-editor-modal/exam-editor-modal.component';
import {
  BuilderPanel,
  Category,
  Exam,
  ExamQuestion,
  ExamStatus,
  Question,
  QuestionOption,
  QuestionType,
  DifficultyLevel,
  ApiCategoryDto,
  ApiExamDto,
  ApiExamQuestionDto,
  ApiQuestionDto
} from './exam.models';

import * as XLSX from 'xlsx';

export interface CsvQuestionRow {
  questionText: string;
  option1: string;
  option2: string;
  option3: string;
  option4: string;
  correctAnswer: string;
  moduleNo: string;
}

@Component({
  selector: 'app-exam-question-builder',
  standalone: true,
  imports: [CommonModule, FormsModule, DragDropModule, ExamEditorModalComponent],
  templateUrl: './exam-question-builder.component.html',
  styleUrl: './exam-question-builder.component.scss'
})
export class ExamQuestionBuilderComponent implements OnInit {
  private readonly API_URL = environment.apiUrl;
  private readonly toast = inject(ToastService);

  activePanel = signal<BuilderPanel>('question-bank');
  isLoadingQuestionBank = signal(false);
  isLoadingExams = signal(false);
  isLoadingFullExam = signal(false);

  selectedQuestionId = signal<number | null>(null);
  selectedBankQuestionId = signal<number | null>(null);
  selectedExamId = signal<number | null>(null);
  showExamEditorModal = signal(false);

  showQuestionEditorModal = signal(false);
  editQuestion = signal<Question | null>(null);

  selectedCategoryFilter = signal<number | null>(null);
  searchTerm = signal('');
  examBuilderSearchTerm = signal('');
  examBuilderCategoryFilter = signal<number | null>(null);

  showCategoryModal = signal(false);
  selectedCategory = signal<Category>({ id: 0, name: '', color: '#6366f1' });

  showCsvImportModal = signal(false);
  csvPreviewData = signal<CsvQuestionRow[]>([]);
  csvImportStatus = signal<'idle' | 'parsing' | 'importing' | 'done' | 'error'>('idle');
  csvCreatedCategories = signal<Map<string, number>>(new Map());

  categories = signal<Category[]>([]);
  banks = signal<Question[]>([]);
  exams = signal<Exam[]>([]);

  exam = signal<Exam>(this.emptyExam());

  questionTypes: { type: QuestionType; icon: string; label: string; description: string }[] = [
    { type: 'multiple-choice', icon: 'fa-circle-dot', label: 'Multiple Choice', description: 'One correct answer' },
    { type: 'checkbox', icon: 'fa-square-check', label: 'Checkbox', description: 'Multiple correct answers' },
    { type: 'dropdown', icon: 'fa-chevron-down', label: 'Dropdown', description: 'Select from list' },
    { type: 'short-answer', icon: 'fa-pen', label: 'Short Answer', description: 'Brief text response' },
    { type: 'paragraph', icon: 'fa-align-left', label: 'Paragraph', description: 'Long text response' },
    { type: 'linear-scale', icon: 'fa-sliders', label: 'Linear Scale', description: '1 to 5 scale' },
    { type: 'rating', icon: 'fa-star', label: 'Rating', description: 'Star rating' },
    { type: 'date', icon: 'fa-calendar', label: 'Date', description: 'Date answer' },
    { type: 'time', icon: 'fa-clock', label: 'Time', description: 'Time answer' }
  ];

  filteredBankQuestions = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const selectedCategory = this.selectedCategoryFilter();

    return this.banks().filter(question => {
      const matchesCategory = !selectedCategory || question.categoryId === selectedCategory;
      const matchesSearch = !term ||
        question.content.toLowerCase().includes(term) ||
        question.tags.some(tag => tag.toLowerCase().includes(term));

      return matchesCategory && matchesSearch;
    });
  });

  filteredExamBuilderQuestions = computed(() => {
    const term = this.examBuilderSearchTerm().trim().toLowerCase();
    const selectedCategory = this.examBuilderCategoryFilter();

    return this.banks().filter(question => {
      const matchesCategory = !selectedCategory || question.categoryId === selectedCategory;
      const matchesSearch = !term ||
        question.content.toLowerCase().includes(term) ||
        question.tags.some(tag => tag.toLowerCase().includes(term));

      return matchesCategory && matchesSearch;
    });
  });

  selectedQuestion = computed(() => {
    const selectedId = this.selectedQuestionId();
    const examQuestion = this.exam().questions.find(item => item.questionId === selectedId);
    return examQuestion?.question || null;
  });

  examTotalMarks = computed(() =>
    this.exam().questions.reduce((sum, item) => sum + (item.question?.marks || 0), 0)
  );

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadCategories();
    this.loadQuestionBank();
    this.loadExams();
  }

  loadCategories(): void {
    this.http.get<ApiCategoryDto[]>(`${this.API_URL}/question-categories`).subscribe({
      next: data => this.categories.set(data.map(item => this.toCategory(item))),
      error: () => this.categories.set([])
    });
  }

  loadQuestionBank(): void {
    this.isLoadingQuestionBank.set(true);
    this.http.get<ApiQuestionDto[]>(`${this.API_URL}/questions`).subscribe({
      next: data => this.banks.set(data.map(item => this.toQuestion(item))),
      error: () => this.banks.set([]),
      complete: () => this.isLoadingQuestionBank.set(false)
    });
  }

  loadExams(): void {
    this.isLoadingExams.set(true);
    this.http.get<ApiExamDto[]>(`${this.API_URL}/exams`).subscribe({
      next: data => this.exams.set(data.map(item => this.toExam(item))),
      error: () => this.exams.set([]),
      complete: () => this.isLoadingExams.set(false)
    });
  }

  showQuestionBank(): void {
    this.activePanel.set('question-bank');
  }

  showExamBuilder(): void {
    this.activePanel.set('exam-builder');
  }

  editExamDetails(exam: Exam): void {
    this.selectedExamId.set(exam.id);
    this.showExamEditorModal.set(true);
    this.showExamBuilder();
  }

  openNewExamModal(): void {
    this.selectedExamId.set(null);
    this.showExamEditorModal.set(true);
    this.showExamBuilder();
  }

  closeExamEditorModal(): void {
    this.showExamEditorModal.set(false);
    this.selectedExamId.set(null);
  }

  handleExamSaved(): void {
    this.closeExamEditorModal();
    this.loadExams();
  }

  saveExam(): void {
    const exam = this.exam();
    if (!exam.title.trim()) {
      this.toast.error('Exam title is required');
      return;
    }

    const payload = {
      Title: exam.title,
      Description: exam.description,
      CategoryId: exam.categoryId ?? undefined,
      Duration: exam.duration,
      Questions: exam.questions.map((item, index) => ({ QuestionId: item.questionId, Order: index }))
    };

    const saveNext = (createdOrUpdated: ApiExamDto) => {
      const updated = this.toExam(createdOrUpdated);
      this.exam.set(updated);
      this.exams.update(items => {
        const existing = items.find(i => i.id === updated.id);
        if (existing) {
          return items.map(i => i.id === updated.id ? updated : i);
        }
        return [updated, ...items];
      });
      this.toast.success(exam.id ? 'Exam updated' : 'Exam created');
      this.loadExams();
    };

    if (exam.id) {
      this.http.put(`${this.API_URL}/exams/${exam.id}`, payload, { responseType: 'text' as any }).subscribe({
        next: () => saveNext({ id: exam.id, title: exam.title, description: exam.description, categoryId: exam.categoryId ?? undefined, duration: exam.duration, status: exam.status }),
        error: () => this.toast.error('Failed to save exam')
      });
      return;
    }

    this.http.post<ApiExamDto>(`${this.API_URL}/exams`, payload).subscribe({
      next: saveNext,
      error: () => this.toast.error('Failed to create exam')
    });
  }

  addQuestionToBank(type: QuestionType): void {
    const categoryId = this.categories()[0]?.id || 0;
    if (!categoryId) {
      this.toast.error('Please create a category first');
      return;
    }

    const payload = {
      Content: '(draft)',
      Type: this.mapQuestionTypeToApi(type),
      Difficulty: 'medium',
      CategoryId: categoryId,
      Marks: 1,
      Tags: [],
      Options: this.getDefaultOptions(type).map(option => option.content),
      CorrectAnswer: '',
      Explanation: '',
      Required: true
    };

    this.http.post<ApiQuestionDto>(`${this.API_URL}/questions`, payload).subscribe({
      next: result => {
        const question = this.toQuestion(result);
        this.banks.update(items => [...items, question]);
        this.openQuestionEditor(question.id);
        this.toast.success('Question created');
      },
      error: err => {
        console.error('Create question error:', err);
        const message = typeof err.error === 'string' ? err.error : (err.error?.message || err.message || 'Unknown error');
        this.toast.error(`Failed to create question: ${message}`);
      }
    });
  }

  openQuestionEditor(questionId: number): void {
    const question = this.banks().find(item => item.id === questionId);
    if (!question) {
      return;
    }

    this.editQuestion.set({
      ...question,
      imageUrl: question.imageUrl ?? '',
      options: [...(question.options || [])],
      correctAnswer: [...(question.correctAnswer || [])],
      tags: [...question.tags]
    });
    this.selectedBankQuestionId.set(questionId);
    this.showQuestionEditorModal.set(true);
  }

  closeQuestionEditor(): void {
    this.showQuestionEditorModal.set(false);
    this.editQuestion.set(null);
  }

  saveQuestion(): void {
    const question = this.editQuestion();
    if (!question) {
      return;
    }

    if (!question.content.trim()) {
      this.toast.error('Question text is required');
      return;
    }

    this.updateBankQuestion(question);
    this.toast.success('Question saved');
    this.closeQuestionEditor();
  }

  updateBankQuestion(question: Question): void {
    const options = question.options || [];
    const correctAnswerText = (question.correctAnswer || [])
      .map(id => options.find(option => option.id === id)?.content || '')
      .filter(Boolean)
      .join(',');

    this.http.put(`${this.API_URL}/questions/${question.id}`, {
      Content: question.content,
      ImageUrl: question.imageUrl || null,
      Type: this.mapQuestionTypeToApi(question.type),
      Difficulty: this.mapDifficultyToApi(question.difficulty),
      CategoryId: question.categoryId,
      Marks: question.marks,
      Tags: question.tags,
      Options: options.map(option => option.content),
      CorrectAnswer: correctAnswerText,
      Explanation: question.explanation,
      Required: question.required
    }, { responseType: 'text' as any }).subscribe({
      next: () => {
        this.banks.update(items => items.map(item => item.id === question.id ? question : item));
        this.exam.update(exam => ({
          ...exam,
          questions: exam.questions.map(item => item.questionId === question.id ? { ...item, question } : item)
        }));
      },
      error: err => {
        console.error('Update question error:', err);
        this.toast.error(`Failed to update question: ${err.status || 'Unknown error'}`);
      }
    });
  }

  deleteQuestionFromBank(questionId: number): void {
    this.http.delete(`${this.API_URL}/questions/${questionId}`, { responseType: 'text' as any }).subscribe({
      next: () => {
        this.banks.update(items => items.filter(item => item.id !== questionId));
        this.exam.update(exam => ({
          ...exam,
          questions: exam.questions.filter(item => item.questionId !== questionId)
        }));
        if (this.selectedBankQuestionId() === questionId) {
          this.selectedBankQuestionId.set(null);
        }
        if (this.selectedQuestionId() === questionId) {
          this.selectedQuestionId.set(null);
        }
        this.toast.success('Question deleted');
      },
      error: err => {
        console.error('Delete question error:', err);
        this.toast.error(`Failed to delete question: ${err.status || 'Unknown error'}`);
      }
    });
  }

  addBankQuestionToExam(question: Question): void {
    if (this.exam().id) {
      this.addPersistedQuestionToExam(question);
      return;
    }

    this.addLocalQuestionToExam(question);
    this.showExamBuilder();
    this.toast.success('Question added to draft exam');
  }

  addLocalQuestionToExam(question: Question): void {
    this.exam.update(exam => ({
      ...exam,
      questions: [
        ...exam.questions,
        { questionId: question.id, question, order: exam.questions.length }
      ]
    }));
  }

  addPersistedQuestionToExam(question: Question): void {
    this.http.post<ApiExamQuestionDto>(`${this.API_URL}/exams/${this.exam().id}/questions`, {
      QuestionId: question.id
    }).subscribe({
      next: result => {
        this.exam.update(exam => ({
          ...exam,
          questions: [...exam.questions, this.toExamQuestion(result)]
        }));
        this.toast.success('Question added to exam');
      },
      error: err => {
        console.error('Add question to exam error:', err);
        this.toast.error(`Failed to add question to exam: ${err.status || 'Unknown error'}`);
      }
    });
  }

  removeQuestion(questionId: number): void {
    if (!confirm('Remove this question from the exam?')) {
      return;
    }

    if (this.exam().id) {
      this.http.delete(`${this.API_URL}/exams/${this.exam().id}/questions/${questionId}`, { responseType: 'text' as any }).subscribe({
        next: () => this.removeLocalQuestion(questionId),
        error: err => {
          console.error('Remove question error:', err);
          this.toast.error(`Failed to remove question: ${err.status || 'Unknown error'}`);
        }
      });
      return;
    }

    this.removeLocalQuestion(questionId);
  }

  removeLocalQuestion(questionId: number): void {
    this.exam.update(exam => ({
      ...exam,
      questions: exam.questions.filter(item => item.questionId !== questionId)
    }));
    if (this.selectedQuestionId() === questionId) {
      this.selectedQuestionId.set(null);
    }
    this.toast.success('Question removed from exam');
  }

  duplicateQuestion(question: Question): void {
    this.http.post<ApiQuestionDto>(`${this.API_URL}/questions`, {
      Content: `${question.content} (Copy)`,
      Type: this.mapQuestionTypeToApi(question.type),
      Difficulty: this.mapDifficultyToApi(question.difficulty),
      CategoryId: question.categoryId,
      Marks: question.marks,
      Tags: question.tags,
      Options: (question.options || []).map(option => option.content),
      CorrectAnswer: this.correctAnswerToText(question),
      Explanation: question.explanation,
      Required: question.required
    }).subscribe({
      next: result => {
        const newQuestion = this.toQuestion(result);
        this.banks.update(items => [...items, newQuestion]);
        if (this.exam().id) {
          this.addPersistedQuestionToExam(newQuestion);
        } else {
          this.addLocalQuestionToExam(newQuestion);
          this.showExamBuilder();
        }
        this.toast.success('Question duplicated');
      },
      error: err => {
        console.error('Duplicate question error:', err);
        this.toast.error(`Failed to duplicate question: ${err.status || 'Unknown error'}`);
      }
    });
  }

  updateQuestion(question: Question): void {
    this.banks.update(items => items.map(item => item.id === question.id ? question : item));
    this.exam.update(exam => ({
      ...exam,
      questions: exam.questions.map(item => item.questionId === question.id ? { ...item, question } : item)
    }));
  }

  updateQuestionOption(questionId: number, optionId: string, content: string): void {
    const updated = this.withUpdatedOption(questionId, optionId, content);
    this.updateQuestion(updated);
  }

  addExamOption(questionId: number): void {
    const question = this.banks().find(item => item.id === questionId) || this.selectedQuestion();
    if (!question) {
      return;
    }

    const options = [...(question.options || [])];
    options.push({ id: `opt${Date.now()}`, content: `Option ${options.length + 1}` });
    this.updateQuestion({ ...question, options });
  }

  removeOption(questionId: number, optionId: string): void {
    const question = this.banks().find(item => item.id === questionId) || this.selectedQuestion();
    if (!question) {
      return;
    }

    const options = (question.options || []).filter(option => option.id !== optionId);
    const correctAnswer = (question.correctAnswer || []).filter(id => id !== optionId);
    this.updateQuestion({ ...question, options, correctAnswer });
  }

  uploadQuestionImage(questionId: number, file: File): void {
    const formData = new FormData();
    formData.append('file', file);

    this.http.post<ApiQuestionDto>(`${this.API_URL}/questions/upload-image/${questionId}`, formData).subscribe({
      next: result => {
        const updated = this.toQuestion(result);
        this.updateQuestion(updated);
        if (this.selectedBankQuestionId() === questionId) {
          this.editQuestion.update(q => q && q.id === questionId ? updated : q);
        }
        this.toast.success('Image uploaded');
      },
      error: err => {
        console.error('Upload image error:', err);
        const message = typeof err.error === 'string' ? err.error : (err.error?.message || err.message || 'Unknown error');
        this.toast.error(`Failed to upload image: ${message}`);
      }
    });
  }

  removeQuestionImage(questionId: number): void {
    const question = this.banks().find(item => item.id === questionId) || this.selectedQuestion();
    if (!question) {
      return;
    }

    this.http.delete(`${this.API_URL}/questions/${questionId}/image`, { responseType: 'text' as any }).subscribe({
      next: () => {
        const updated = { ...question, imageUrl: '' };
        this.updateQuestion(updated);
        if (this.selectedBankQuestionId() === questionId) {
          this.editQuestion.update(q => q && q.id === questionId ? updated : q);
        }
        this.toast.success('Image removed');
      },
      error: err => {
        console.error('Remove image error:', err);
        const message = typeof err.error === 'string' ? err.error : (err.error?.message || err.message || 'Unknown error');
        this.toast.error(`Failed to remove image: ${message}`);
      }
    });
  }

  getQuestionImageUrl(question: Question): string {
    if (!question.imageUrl) {
      return '';
    }
    if (question.imageUrl.startsWith('http')) {
      return question.imageUrl;
    }
    const baseUrl = this.API_URL.replace(/\/api$/, '').replace(/\/+$/, '');
    const cleanPath = question.imageUrl.replace(/^\/+/, '');
    return `${baseUrl}/${cleanPath}`;
  }

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
    const fallback = img.parentElement?.querySelector('.text-muted');
    if (fallback) {
      fallback.textContent = 'img missing';
    }
  }

  onQuestionImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    const question = this.editQuestion();
    if (!file || !question) {
      return;
    }

    this.uploadQuestionImage(question.id, file);
    input.value = '';
  }

  setCorrectAnswerExam(questionId: number, optionId: string): void {
    const question = this.banks().find(item => item.id === questionId) || this.selectedQuestion();
    if (!question) {
      return;
    }

    const currentCorrect = question.correctAnswer || [];
    const correctAnswer = question.type === 'checkbox'
      ? currentCorrect.includes(optionId)
        ? currentCorrect.filter(id => id !== optionId)
        : [...currentCorrect, optionId]
      : [optionId];

    this.updateQuestion({ ...question, correctAnswer });
  }

  updateQuestionTags(questionId: number, value: string): void {
    const question = this.banks().find(item => item.id === questionId) || this.selectedQuestion();
    if (!question) {
      return;
    }

    const tags = value.split(',').map(tag => tag.trim()).filter(Boolean);
    this.updateQuestion({ ...question, tags });
  }

  drop(event: CdkDragDrop<ExamQuestion[]>): void {
    this.exam.update(exam => {
      const questions = [...exam.questions];
      moveItemInArray(questions, event.previousIndex, event.currentIndex);
      return { ...exam, questions };
    });

    if (this.exam().id) {
      const orderedIds = this.exam().questions.map(q => q.questionId);
      this.http.post(`${this.API_URL}/exams/${this.exam().id}/questions/reorder`, { QuestionIds: orderedIds }, { responseType: 'text' as any }).subscribe({
        error: err => console.error('Reorder error:', err)
      });
    }
  }

  scheduleExam(): void {
    this.toast.info('Use the exam editor modal to set schedule and availability');
  }

  publishExam(): void {
    const exam = this.exam();
    if (!exam.id) {
      this.toast.error('Save the exam before publishing');
      return;
    }

    this.http.patch(`${this.API_URL}/exams/${exam.id}/publish`, {}, { responseType: 'text' as any }).subscribe({
      next: () => {
        this.exam.update(item => ({ ...item, status: 'active' }));
        this.toast.success('Exam published');
      },
      error: () => this.toast.error('Failed to publish exam')
    });
  }

  editExistingCategory(category: Category): void {
    this.selectedCategory.set({ ...category });
  }

  cancelEdit(): void {
    this.selectedCategory.set({ id: 0, name: '', color: '#6366f1' });
  }

  openCategoryManager(): void {
    this.cancelEdit();
    this.showCategoryModal.set(true);
  }

  closeCategoryModal(): void {
    this.showCategoryModal.set(false);
    this.cancelEdit();
  }

  saveCategory(): void {
    const category = this.selectedCategory();
    if (!category.name.trim()) {
      this.toast.error('Category name is required');
      return;
    }

    const payload = {
      Name: category.name,
      Color: category.color
    };

    const success = () => {
      this.categories.update(items => {
        if (category.id) {
          return items.map(item => item.id === category.id ? { ...item, ...payload } : item);
        }
        return [...items, { ...category, ...payload, id: Date.now() }];
      });
      this.cancelEdit();
      this.toast.success('Category saved');
    };

    if (category.id) {
      this.http.put(`${this.API_URL}/question-categories/${category.id}`, payload, { responseType: 'text' as any }).subscribe({
        next: success,
        error: err => this.toast.error(`Failed to update category: ${err.status || 'Unknown error'}`)
      });
      return;
    }

    this.http.post<ApiCategoryDto>(`${this.API_URL}/question-categories`, payload).subscribe({
      next: result => {
        this.categories.update(items => [...items, this.toCategory(result)]);
        this.cancelEdit();
        this.toast.success('Category created');
      },
      error: err => this.toast.error(`Failed to create category: ${err.status || 'Unknown error'}`)
    });
  }

  deleteCategory(categoryId: number): void {
    if (!confirm('Are you sure you want to delete this category?')) {
      return;
    }

    this.http.delete(`${this.API_URL}/question-categories/${categoryId}`, { responseType: 'text' as any }).subscribe({
      next: () => {
        this.categories.update(items => items.filter(item => item.id !== categoryId));
        if (this.selectedCategoryFilter() === categoryId) {
          this.selectedCategoryFilter.set(null);
        }
        this.toast.success('Category deleted');
      },
      error: err => this.toast.error(`Failed to delete category: ${err.status || 'Unknown error'}`)
    });
  }

  deleteExam(examId: number, force: boolean = false): void {
    const exam = this.exams().find(e => e.id === examId);
    const isPublished = exam && (exam.status === 'active' || exam.status === 'completed');

    const message = force && isPublished
      ? 'Force delete this published exam? The exam and all student answers will also be permanently deleted.'
      : 'Are you sure you want to delete this exam?';

    if (!confirm(message)) {
      return;
    }

    const url = `${this.API_URL}/exams/${examId}${force ? '?force=true' : ''}`;

    this.http.delete(url, { responseType: 'text' as any }).subscribe({
      next: () => {
        this.exams.update(items => items.filter(item => item.id !== examId));
        if (this.exam().id === examId) {
          this.exam.set(this.emptyExam());
          this.selectedQuestionId.set(null);
        }
        this.toast.success('Exam deleted successfully');
      },
      error: err => {
        const message = typeof err.error === 'string' ? err.error : (err.message || `Failed to delete exam: ${err.status || 'Unknown error'}`);
        this.toast.error(message);
      }
    });
  }

  duplicateExam(exam: Exam): void {
    this.http.post<ApiExamDto>(`${this.API_URL}/exams`, {
      Title: `${exam.title} (Copy)`,
      Description: exam.description,
      CategoryId: exam.categoryId,
      Duration: exam.duration,
      Questions: exam.questions.map((item, index) => ({ QuestionId: item.questionId, Order: index }))
    }).subscribe({
      next: result => {
        const created = this.toExam(result);
        this.exams.update(items => [created, ...items]);
        this.exam.set(created);
        this.selectedExamId.set(created.id);
        this.editExamDetails(created);
        this.toast.success('Exam duplicated');
      },
      error: err => this.toast.error(`Failed to duplicate exam: ${err.status || 'Unknown error'}`)
    });
  }

  updateEditQuestionField(field: keyof Question, value: any): void {
    const question = this.editQuestion();
    if (question) {
      this.editQuestion.set({ ...question, [field]: value });
    }
  }

  addEditOption(): void {
    const question = this.editQuestion();
    if (!question) {
      return;
    }

    const options = [...(question.options || [])];
    options.push({ id: `opt${Date.now()}`, content: 'New Option' });
    this.editQuestion.set({ ...question, options });
  }

  updateEditOption(optionId: string, content: string): void {
    const question = this.editQuestion();
    if (!question || !question.options) {
      return;
    }

    this.editQuestion.set({
      ...question,
      options: question.options.map(option => option.id === optionId ? { ...option, content } : option)
    });
  }

  removeEditOption(optionId: string): void {
    const question = this.editQuestion();
    if (!question || !question.options) {
      return;
    }

    this.editQuestion.set({
      ...question,
      options: question.options.filter(option => option.id !== optionId),
      correctAnswer: (question.correctAnswer || []).filter(id => id !== optionId)
    });
  }

  setEditCorrectAnswer(optionId: string): void {
    const question = this.editQuestion();
    if (!question) {
      return;
    }

    const currentCorrect = question.correctAnswer || [];
    const correctAnswer = question.type === 'checkbox'
      ? currentCorrect.includes(optionId)
        ? currentCorrect.filter(id => id !== optionId)
        : [...currentCorrect, optionId]
      : [optionId];

    this.editQuestion.set({ ...question, correctAnswer });
  }

  getQuestionTypeIcon(type: QuestionType): string {
    return this.questionTypes.find(item => item.type === type)?.icon || 'fa-question';
  }

  getQuestionTypeLabel(type: QuestionType): string {
    return this.questionTypes.find(item => item.type === type)?.label || type;
  }

  getQuestionTypeBadgeClass(type: QuestionType): string {
    const map: Record<QuestionType, string> = {
      'multiple-choice': 'badge-type-primary',
      'checkbox': 'badge-type-info',
      'dropdown': 'badge-type-purple',
      'short-answer': 'badge-type-success',
      'paragraph': 'badge-type-warning',
      'linear-scale': 'badge-type-orange',
      'rating': 'badge-type-yellow',
      'date': 'badge-type-blue',
      'time': 'badge-type-gray'
    };

    return map[type] || 'badge-type-gray';
  }

  getStatusClass(status: ExamStatus): string {
    return `status-badge ${status}`;
  }

  getCategoryById(categoryId: number): Category | undefined {
    return this.categories().find(category => category.id === categoryId);
  }

  getCategoryName(categoryId: number): string {
    return this.getCategoryById(categoryId)?.name || 'Uncategorized';
  }

  getCorrectAnswerText(question: Question): string {
    if (!question.correctAnswer?.length || !question.options?.length) {
      return '-';
    }

    const answers = question.correctAnswer
      .map(id => question.options?.find(option => option.id === id)?.content)
      .filter(Boolean);

    return answers.join(', ') || '-';
  }

  isOptionsQuestion(type: QuestionType): boolean {
    return type === 'multiple-choice' || type === 'checkbox' || type === 'dropdown';
  }

  getModuleNo(question: Question): string {
    const moduleTag = question.tags.find(tag => /^M\d+$/i.test(tag));
    return moduleTag || '';
  }

  async handleCsvUpload(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.csvImportStatus.set('parsing');
    try {
      const data = await this.parseCsvFile(file);
      const mapped = data.map((row: any) => ({
        questionText: (row['Question_Text'] ?? row['Question Text'] ?? '').toString().trim(),
        option1: (row['Option_1'] ?? row['Option1'] ?? '').toString().trim(),
        option2: (row['Option_2'] ?? row['Option2'] ?? '').toString().trim(),
        option3: (row['Option_3'] ?? row['Option3'] ?? '').toString().trim(),
        option4: (row['Option_4'] ?? row['Option4'] ?? '').toString().trim(),
        correctAnswer: (row['Correct_Answer'] ?? row['Correct Answer'] ?? '').toString().trim(),
        moduleNo: (row['ModuleNo'] ?? row['Module_No'] ?? row['Module'] ?? '').toString().trim()
      })).filter((q: CsvQuestionRow) => q.questionText && q.correctAnswer);

      this.csvPreviewData.set(mapped);
      this.csvImportStatus.set('idle');
    } catch (err) {
      console.error(err);
      this.toast.error('Failed to parse CSV');
      this.csvImportStatus.set('error');
    }
  }

  private parseCsvFile(file: File): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target!.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          const json = XLSX.utils.sheet_to_json(sheet);
          resolve(json);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(file);
    });
  }

  async confirmCsvImport(): Promise<void> {
    const rows = this.csvPreviewData();
    if (rows.length === 0) {
      this.toast.error('No questions to import');
      return;
    }

    this.csvImportStatus.set('importing');
    const createdCategories = new Map<string, number>();

    for (const row of rows) {
      if (!row.moduleNo) continue;

      if (!createdCategories.has(row.moduleNo)) {
        const categoryId = await this.getOrCreateCategory(row.moduleNo);
        if (categoryId) {
          createdCategories.set(row.moduleNo, categoryId);
        }
      }
    }

    this.csvCreatedCategories.set(createdCategories);

    const payloads = rows.map(row => this.mapCsvToApiPayload(row, createdCategories.get(row.moduleNo) || 0));

    let success = 0;
    for (const payload of payloads) {
      if (!payload.CategoryId) continue;
      try {
        const result = await firstValueFrom(
          this.http.post<ApiQuestionDto>(`${this.API_URL}/questions`, payload).pipe(
            catchError(() => EMPTY)
          )
        );
        if (result) {
          const question = this.toQuestion(result);
          this.banks.update(items => [...items, question]);
          success++;
        }
      } catch { /* ignore */ }
    }

    this.toast.success(`Imported ${success} of ${payloads.length} questions`);
    this.csvImportStatus.set('done');
    this.showCsvImportModal.set(false);
    this.csvPreviewData.set([]);
    this.csvCreatedCategories.set(new Map());
  }

  private async getOrCreateCategory(moduleNo: string): Promise<number | null> {
    const existing = this.categories().find(c => c.name.toLowerCase() === moduleNo.toLowerCase());
    if (existing) {
      return existing.id;
    }

    return new Promise((resolve) => {
      this.http.post<ApiCategoryDto>(`${this.API_URL}/question-categories`, {
        Name: moduleNo,
        Color: '#6366f1'
      }).pipe(
        catchError(() => EMPTY)
      ).subscribe({
        next: (result) => {
          const category: Category = {
            id: result.Id ?? result.id ?? Date.now(),
            name: result.Name ?? result.name ?? moduleNo,
            color: result.Color ?? result.color ?? '#6366f1'
          };
          this.categories.update(items => [...items, category]);
          resolve(category.id);
        },
        error: () => resolve(null)
      });
    });
  }

  private mapCsvToApiPayload(row: CsvQuestionRow, categoryId: number | null): any {
    const tags = row.moduleNo ? [row.moduleNo] : [];
    return {
      Content: row.questionText,
      Type: 'MultipleChoice',
      Difficulty: 'Medium',
      CategoryId: categoryId || undefined,
      Marks: 1,
      Options: [row.option1, row.option2, row.option3, row.option4],
      CorrectAnswer: row.correctAnswer,
      Explanation: '',
      Tags: tags,
      Required: true
    };
  }

  private emptyExam(): Exam {
    return {
      id: 0,
      title: '',
      description: '',
      categoryId: null,
      duration: 60,
      maxAttempts: 0,
      status: 'draft',
      availableFrom: null,
      availableTo: null,
      timeZone: null,
      questions: []
    };
  }

  private toCategory(category: ApiCategoryDto): Category {
    return {
      id: category.Id ?? category.id ?? 0,
      name: category.Name ?? category.name ?? '',
      color: category.Color ?? category.color ?? '#6366f1'
    };
  }

  private toQuestion(question: ApiQuestionDto): Question {
    const options = (question.Options ?? question.options ?? [])
      .map((option, index) => ({
        id: `opt${index + 1}`,
        content: option
      }));

    const correctAnswer = (question.CorrectAnswer ?? question.correctAnswer ?? '')
      .split(',')
      .map(value => value.trim())
      .filter(Boolean)
      .map(value => options.find(option => option.content === value)?.id)
      .filter((value): value is string => Boolean(value));

    return {
      id: question.Id ?? question.id ?? 0,
      content: question.Content ?? question.content ?? '',
      imageUrl: question.ImageUrl ?? question.imageUrl ?? undefined,
      type: this.mapQuestionTypeFromApi(question.Type ?? question.type ?? 'MultipleChoice'),
      difficulty: this.mapDifficultyFromApi(question.Difficulty ?? question.difficulty ?? 'Medium'),
      categoryId: question.CategoryId ?? question.categoryId ?? 0,
      marks: question.Marks ?? question.marks ?? 1,
      options,
      correctAnswer,
      explanation: question.Explanation ?? question.explanation ?? '',
      tags: question.Tags ?? question.tags ?? [],
      required: question.Required ?? question.required ?? true,
      moduleNo: question.ModuleNo ?? question.moduleNo ?? (question.Tags ?? question.tags ?? []).find(t => /^M\d+$/i.test(t)) ?? ''
    };
  }

  private toExam(exam: ApiExamDto, questions: ApiExamQuestionDto[] = []): Exam {
    const examQuestions = exam.Questions ?? exam.questions ?? questions;

    return {
      id: exam.Id ?? exam.id ?? 0,
      title: exam.Title ?? exam.title ?? '',
      description: exam.Description ?? exam.description ?? '',
      categoryId: exam.CategoryId ?? exam.categoryId ?? null,
      duration: exam.Duration ?? exam.duration ?? 60,
      maxAttempts: exam.MaxAttempts ?? exam.maxAttempts ?? 0,
      status: this.mapStatusFromApi(exam.Status ?? exam.status ?? 'Draft'),
      availableFrom: exam.AvailableFrom ?? exam.availableFrom ?? null,
      availableTo: exam.AvailableTo ?? exam.availableTo ?? null,
      timeZone: exam.TimeZone ?? exam.timeZone ?? null,
      questions: examQuestions.map(item => this.toExamQuestion(item))
    };
  }

  private toExamQuestion(examQuestion: ApiExamQuestionDto): ExamQuestion {
    const questionData = examQuestion.Question || examQuestion.question;
    return {
      id: examQuestion.Id ?? examQuestion.id,
      questionId: examQuestion.QuestionId ?? examQuestion.questionId ?? 0,
      order: examQuestion.Order ?? examQuestion.order ?? 0,
      question: questionData ? this.toQuestion(questionData) : undefined
    };
  }

  private withUpdatedOption(questionId: number, optionId: string, content: string): Question {
    const question = this.banks().find(item => item.id === questionId) || this.selectedQuestion();
    if (!question) {
      return this.emptyQuestion();
    }

    return {
      ...question,
      options: (question.options || []).map(option => option.id === optionId ? { ...option, content } : option)
    };
  }

  private correctAnswerToText(question: Question): string {
    const options = question.options || [];
    return (question.correctAnswer || [])
      .map(id => options.find(option => option.id === id)?.content || '')
      .filter(Boolean)
      .join(',');
  }

  private mapQuestionTypeToApi(type: QuestionType): string {
    const map: Record<QuestionType, string> = {
      'multiple-choice': 'MultipleChoice',
      'checkbox': 'Checkbox',
      'dropdown': 'Dropdown',
      'short-answer': 'ShortAnswer',
      'paragraph': 'Essay',
      'linear-scale': 'LinearScale',
      'rating': 'Rating',
      'date': 'Date',
      'time': 'Time'
    };

    return map[type];
  }

  private mapQuestionTypeFromApi(type: string): QuestionType {
    const normalized = type.replace(/\s+/g, '').toLowerCase();

    switch (normalized) {
      case 'multiplechoice':
      case 'multiple-choice':
        return 'multiple-choice';
      case 'checkbox':
        return 'checkbox';
      case 'dropdown':
        return 'dropdown';
      case 'shortanswer':
        return 'short-answer';
      case 'essay':
      case 'paragraph':
        return 'paragraph';
      case 'linearscale':
        return 'linear-scale';
      case 'rating':
        return 'rating';
      case 'date':
        return 'date';
      case 'time':
        return 'time';
      default:
        return 'multiple-choice';
    }
  }

  private mapDifficultyToApi(difficulty: DifficultyLevel): string {
    return difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
  }

  private mapDifficultyFromApi(difficulty: string): DifficultyLevel {
    const normalized = difficulty.toLowerCase();

    if (normalized === 'easy') {
      return 'easy';
    }

    if (normalized === 'hard') {
      return 'hard';
    }

    return 'medium';
  }

  private mapStatusFromApi(status: string): ExamStatus {
    const normalized = status.toLowerCase();

    if (normalized === 'scheduled' || normalized === 'active' || normalized === 'completed') {
      return normalized;
    }

    return 'draft';
  }

  private getDefaultOptions(type: QuestionType): QuestionOption[] {
    if (type === 'multiple-choice' || type === 'checkbox' || type === 'dropdown') {
      return [
        { id: 'opt1', content: 'Option 1' },
        { id: 'opt2', content: 'Option 2' }
      ];
    }

    if (type === 'linear-scale') {
      return Array.from({ length: 5 }, (_, index) => ({
        id: `scale${index + 1}`,
        content: `${index + 1}`
      }));
    }

    return [];
  }

  private emptyQuestion(): Question {
    return {
      id: 0,
      content: '',
      imageUrl: '',
      type: 'multiple-choice',
      difficulty: 'medium',
      categoryId: 0,
      marks: 1,
      options: [],
      correctAnswer: [],
      tags: [],
      required: true,
      moduleNo: ''
    };
  }
}

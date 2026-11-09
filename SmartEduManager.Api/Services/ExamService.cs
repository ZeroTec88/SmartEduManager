using AutoMapper;
using Microsoft.EntityFrameworkCore;
using SmartEduManager.Api.Data;
using SmartEduManager.Api.DTOs;
using SmartEduManager.Api.Models;

namespace SmartEduManager.Api.Services;

public interface IExamService
{
        Task<ExamDto?> GetExamWithQuestionsAsync(int id);
        Task<IEnumerable<ExamDto>> GetAllExamsAsync();
        Task<IEnumerable<ExamDto>> GetStudentExamsAsync(string studentId);
        Task<ExamDto> CreateExamAsync(CreateExamDto createDto);
        Task<bool> UpdateExamAsync(int id, UpdateExamDto updateDto);
        Task<bool> DeleteExamAsync(int id);
        Task<bool> AddQuestionToExamAsync(int examId, int questionId);
        Task<bool> RemoveQuestionFromExamAsync(int examId, int questionId);
        Task<bool> ReorderExamQuestionsAsync(int examId, List<int> questionIdsInOrder);
        Task<bool> RevertExamToDraftAsync(int examId);
        Task<bool> ScheduleExamAsync(int id, ScheduleExamDto dto);
        Task<bool> PublishExamAsync(int id);
        Task<ExamAttemptDto?> StartExamAsync(int examId, string studentId);
        Task<ExamResultDto?> SubmitExamAsync(int attemptId, string studentId, List<ExamAnswerSubmission> answers);
        Task<IEnumerable<ExamResultDto>> GetStudentResultsAsync(string studentId);
        Task<ExamResultDto?> GetResultAsync(int resultId, string studentId);
        Task<List<ExamResultDto>> GetAllResultsAsync();
        Task<List<BatchExamResultDto>> GetBatchResultsAsync(int batchId);
        Task<List<BatchExamResultDto>> GetBatchResultsByExamAsync(int batchId, int examId);
        Task<List<BatchExamSummaryDto>> GetBatchSummariesAsync(int examId);
        Task<List<ExamBatchStatsDto>> GetExamBatchStatsAsync();
        Task<List<ExamResultDto>> GetStudentResultsByStudentIdAsync(string studentId);
        Task<List<ExamResultDto>> GetStudentResultsByBatchIdAsync(int batchId);
    }

public class ExamService : IExamService
{
    private readonly AppDbContext _context;
    private readonly IMapper _mapper;

    public ExamService(AppDbContext context, IMapper mapper)
    {
        _context = context;
        _mapper = mapper;
    }

    public async Task<ExamDto?> GetExamWithQuestionsAsync(int id)
    {
        var exam = await _context.Exams
            .Include(e => e.Category)
            .Include(e => e.ExamQuestions)
                .ThenInclude(eq => eq.Question)
            .FirstOrDefaultAsync(e => e.Id == id);

        return exam == null ? null : _mapper.Map<ExamDto>(exam);
    }

    public async Task<IEnumerable<ExamDto>> GetAllExamsAsync()
    {
        var exams = await _context.Exams
            .Include(e => e.Category)
            .Include(e => e.ExamQuestions)
                .ThenInclude(eq => eq.Question)
            .ToListAsync();

        return exams.Select(_mapper.Map<ExamDto>);
    }

    public async Task<IEnumerable<ExamDto>> GetStudentExamsAsync(string studentId)
    {
        var exams = await _context.Exams
            .Include(e => e.Category)
            .Include(e => e.ExamQuestions)
                .ThenInclude(eq => eq.Question)
            .Where(e => e.Status == ExamStatus.Active || e.Status == ExamStatus.Scheduled)
            .ToListAsync();

        var examDtos = new List<ExamDto>();
        foreach (var exam in exams)
        {
            var dto = _mapper.Map<ExamDto>(exam);
            dto.AttemptsUsed = await _context.ExamAttempts
                .CountAsync(a => a.ExamId == exam.Id && a.StudentId == studentId);
            examDtos.Add(dto);
        }

        return examDtos;
    }

    public async Task<ExamDto> CreateExamAsync(CreateExamDto createDto)
    {
        var exam = _mapper.Map<Exam>(createDto);
        exam.CreatedAt = DateTime.UtcNow;
        
        await _context.Exams.AddAsync(exam);
        await _context.SaveChangesAsync();

        if (createDto.Questions != null && createDto.Questions.Any())
        {
            var maxOrder = 0;
            foreach (var q in createDto.Questions.OrderBy(q => q.Order))
            {
                var examQuestion = new ExamQuestion
                {
                    ExamId = exam.Id,
                    QuestionId = q.QuestionId,
                    Order = maxOrder++
                };
                await _context.ExamQuestions.AddAsync(examQuestion);
            }
            await _context.SaveChangesAsync();
        }

        return _mapper.Map<ExamDto>(exam);
    }

    public async Task<bool> UpdateExamAsync(int id, UpdateExamDto updateDto)
    {
        var exam = await _context.Exams.FindAsync(id);
        if (exam == null)
            return false;

        if (exam.Status == ExamStatus.Active || exam.Status == ExamStatus.Completed)
            return false;

        _mapper.Map(updateDto, exam);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> DeleteExamAsync(int id)
    {
        var exam = await _context.Exams.FindAsync(id);
        if (exam == null)
            return false;

        _context.Exams.Remove(exam);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> AddQuestionToExamAsync(int examId, int questionId)
    {
        var examExists = await _context.Exams.AnyAsync(e => e.Id == examId);
        var questionExists = await _context.Questions.AnyAsync(q => q.Id == questionId);

        if (!examExists || !questionExists)
            return false;

        var alreadyExists = await _context.ExamQuestions
            .AnyAsync(eq => eq.ExamId == examId && eq.QuestionId == questionId);

        if (alreadyExists)
            return true;

        var maxOrder = await _context.ExamQuestions
            .Where(eq => eq.ExamId == examId)
            .MaxAsync(eq => (int?)eq.Order) ?? 0;

        var examQuestion = new ExamQuestion
        {
            ExamId = examId,
            QuestionId = questionId,
            Order = maxOrder + 1
        };

        await _context.ExamQuestions.AddAsync(examQuestion);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> ReorderExamQuestionsAsync(int examId, List<int> questionIdsInOrder)
    {
        var examQuestions = await _context.ExamQuestions
            .Where(eq => eq.ExamId == examId)
            .ToListAsync();

        var questionIdSet = new HashSet<int>(questionIdsInOrder);
        if (examQuestions.Count != questionIdsInOrder.Count || !examQuestions.All(eq => questionIdSet.Contains(eq.QuestionId)))
            return false;

        foreach (var (examQuestion, index) in examQuestions.Select((eq, i) => (eq, i)))
        {
            examQuestion.Order = questionIdsInOrder.IndexOf(examQuestion.QuestionId);
        }

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> RevertExamToDraftAsync(int examId)
    {
        var exam = await _context.Exams.FindAsync(examId);
        if (exam == null)
            return false;

        exam.Status = ExamStatus.Draft;
        exam.PublishedAt = null;
        exam.ScheduledAt = null;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> RemoveQuestionFromExamAsync(int examId, int questionId)
    {
        var examQuestion = await _context.ExamQuestions
            .FirstOrDefaultAsync(eq => eq.ExamId == examId && eq.QuestionId == questionId);

        if (examQuestion == null)
            return false;

        _context.ExamQuestions.Remove(examQuestion);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> ScheduleExamAsync(int id, ScheduleExamDto dto)
    {
        var exam = await _context.Exams.FindAsync(id);
        if (exam == null)
            return false;

        if (exam.Status == ExamStatus.Active || exam.Status == ExamStatus.Completed)
            return false;

        exam.AvailableFrom = dto.AvailableFrom;
        exam.AvailableTo = dto.AvailableTo;
        exam.TimeZone = dto.TimeZone;
        exam.Status = ExamStatus.Scheduled;

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> PublishExamAsync(int id)
    {
        var exam = await _context.Exams.FindAsync(id);
        if (exam == null)
            return false;

        exam.Status = ExamStatus.Active;
        exam.PublishedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<ExamAttemptDto?> StartExamAsync(int examId, string studentId)
    {
        var exam = await _context.Exams
            .Include(e => e.Category)
            .Include(e => e.ExamQuestions)
                .ThenInclude(eq => eq.Question)
            .FirstOrDefaultAsync(e => e.Id == examId);

        if (exam == null)
            return null;

        if (exam.Status != ExamStatus.Active && exam.Status != ExamStatus.Scheduled)
            return null;

        if (exam.MaxAttempts > 0)
        {
            var completedAttempts = await _context.ExamAttempts
                .CountAsync(a => a.ExamId == examId && a.StudentId == studentId && a.IsCompleted);

            if (completedAttempts >= exam.MaxAttempts)
            {
                return null;
            }
        }

        var existingAttempt = await _context.ExamAttempts
            .Include(a => a.Exam)
                .ThenInclude(e => e!.Category)
            .Include(a => a.Exam)
                .ThenInclude(e => e!.ExamQuestions)
                    .ThenInclude(eq => eq.Question)
            .FirstOrDefaultAsync(a => a.ExamId == examId && a.StudentId == studentId && !a.IsCompleted);

        if (existingAttempt != null)
        {
            return _mapper.Map<ExamAttemptDto>(existingAttempt);
        }

        var attempt = new ExamAttempt
        {
            ExamId = examId,
            StudentId = studentId,
            StartedAt = DateTime.UtcNow,
            Status = "InProgress",
            TotalMarks = exam.ExamQuestions.Where(eq => eq.Question != null).Sum(eq => eq.Question!.Marks)
        };

        await _context.ExamAttempts.AddAsync(attempt);
        await _context.SaveChangesAsync();

        var examWithQuestions = await _context.ExamAttempts
            .Include(a => a.Exam)
                .ThenInclude(e => e!.Category)
            .Include(a => a.Exam)
                .ThenInclude(e => e!.ExamQuestions)
                    .ThenInclude(eq => eq.Question)
            .FirstOrDefaultAsync(a => a.Id == attempt.Id);

        return examWithQuestions != null ? _mapper.Map<ExamAttemptDto>(examWithQuestions) : null;
    }

    public async Task<ExamResultDto?> SubmitExamAsync(int attemptId, string studentId, List<ExamAnswerSubmission> answers)
    {
        var attempt = await _context.ExamAttempts
            .Include(a => a.Exam)
            .Include(a => a.Answers)
            .FirstOrDefaultAsync(a => a.Id == attemptId && a.StudentId == studentId);

        if (attempt == null || attempt.IsCompleted)
            return null;

        var examQuestions = await _context.ExamQuestions
            .Include(eq => eq.Question)
            .Where(eq => eq.ExamId == attempt.ExamId)
            .ToListAsync();

        var questionMap = examQuestions.Where(eq => eq.Question != null).ToDictionary(eq => eq.QuestionId, eq => eq.Question!);

        _context.ExamAnswers.RemoveRange(attempt.Answers);
        
        var newAnswers = answers.Select(answer =>
        {
            if (!questionMap.TryGetValue(answer.QuestionId, out var question))
                return null;

            var selectedAnswers = (answer.SelectedAnswer ?? string.Empty)
                .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

            bool isCorrect;
            if (question.Type is QuestionType.MultipleChoice or QuestionType.Checkbox or QuestionType.Dropdown)
            {
                var correctAnswers = (question.CorrectAnswer ?? string.Empty)
                    .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

                isCorrect = selectedAnswers.Length == correctAnswers.Length &&
                    selectedAnswers.All(ca => correctAnswers.Contains(ca));
            }
            else if (question.Type is QuestionType.ShortAnswer or QuestionType.Essay)
            {
                var correctText = (question.CorrectAnswer ?? string.Empty).Trim();
                var selectedText = (answer.SelectedAnswer ?? string.Empty).Trim();
                isCorrect = !string.IsNullOrEmpty(selectedText) && 
                            (string.IsNullOrEmpty(correctText) || 
                             selectedText.Contains(correctText, StringComparison.OrdinalIgnoreCase));
            }
            else
            {
                var correctText = (question.CorrectAnswer ?? string.Empty).Trim();
                var selectedText = (answer.SelectedAnswer ?? string.Empty).Trim();
                isCorrect = !string.IsNullOrEmpty(selectedText) && 
                            string.Equals(correctText, selectedText, StringComparison.OrdinalIgnoreCase);
            }

            return new ExamAnswer
            {
                ExamAttemptId = attempt.Id,
                QuestionId = answer.QuestionId,
                SelectedAnswer = answer.SelectedAnswer,
                IsCorrect = isCorrect,
                MarksObtained = isCorrect ? question.Marks : 0
            };
        }).Where(a => a != null).ToList();

        if (newAnswers.Count > 0)
        {
            await _context.ExamAnswers.AddRangeAsync(newAnswers.Cast<ExamAnswer>());
        }

        attempt.SubmittedAt = DateTime.UtcNow;
        attempt.IsCompleted = true;
        attempt.Score = newAnswers.Sum(a => a.MarksObtained);
        attempt.Status = "Completed";

        await _context.SaveChangesAsync();

        var savedAttempt = await _context.ExamAttempts
            .Include(a => a.Exam)
            .Include(a => a.Answers)
            .FirstOrDefaultAsync(a => a.Id == attemptId);

        return savedAttempt != null ? _mapper.Map<ExamResultDto>(savedAttempt) : null;
    }

    public async Task<IEnumerable<ExamResultDto>> GetStudentResultsAsync(string studentId)
    {
        var attempts = await _context.ExamAttempts
            .Include(a => a.Exam)
            .Where(a => a.StudentId == studentId && a.IsCompleted)
            .OrderByDescending(a => a.SubmittedAt)
            .ToListAsync();

        return attempts.Select(_mapper.Map<ExamResultDto>);
    }

    public async Task<ExamResultDto?> GetResultAsync(int resultId, string studentId)
    {
        var attempt = await _context.ExamAttempts
            .Include(a => a.Exam)
            .Include(a => a.Answers)
            .FirstOrDefaultAsync(a => a.Id == resultId && a.StudentId == studentId && a.IsCompleted);

        return attempt == null ? null : _mapper.Map<ExamResultDto>(attempt);
    }

        public async Task<List<ExamResultDto>> GetAllResultsAsync()
        {
            var attempts = await _context.ExamAttempts
                .Include(a => a.Exam)
                .Where(a => a.IsCompleted)
                .OrderByDescending(a => a.SubmittedAt)
                .ToListAsync();

            return attempts.Select(_mapper.Map<ExamResultDto>).ToList();
        }

        public async Task<List<BatchExamResultDto>> GetBatchResultsAsync(int batchId)
        {
            var results = await _context.ExamAttempts
                .Include(a => a.Exam)
                .Where(a => a.IsCompleted)
                .OrderByDescending(a => a.SubmittedAt)
                .ToListAsync();

            return results.Select(a => new BatchExamResultDto
            {
                AttemptId = a.Id,
                ExamId = a.ExamId,
                ExamTitle = a.Exam?.Title ?? string.Empty,
                StudentId = a.StudentId,
                StudentName = a.StudentId,
                NameWithInitials = string.Empty,
                MISNo = string.Empty,
                Score = a.Score,
                TotalMarks = a.TotalMarks,
                Percentage = a.TotalMarks > 0 ? (double)a.Score / a.TotalMarks * 100 : 0,
                Status = a.Status,
                StartedAt = a.StartedAt,
                SubmittedAt = a.SubmittedAt
            }).ToList();
        }

        public async Task<List<BatchExamResultDto>> GetBatchResultsByExamAsync(int batchId, int examId)
        {
            var results = await _context.ExamAttempts
                .Include(a => a.Exam)
                .Where(a => a.ExamId == examId && a.IsCompleted)
                .OrderByDescending(a => a.SubmittedAt)
                .ToListAsync();

            return results.Select(a => new BatchExamResultDto
            {
                AttemptId = a.Id,
                ExamId = a.ExamId,
                ExamTitle = a.Exam?.Title ?? string.Empty,
                StudentId = a.StudentId,
                StudentName = a.StudentId,
                NameWithInitials = string.Empty,
                MISNo = string.Empty,
                Score = a.Score,
                TotalMarks = a.TotalMarks,
                Percentage = a.TotalMarks > 0 ? (double)a.Score / a.TotalMarks * 100 : 0,
                Status = a.Status,
                StartedAt = a.StartedAt,
                SubmittedAt = a.SubmittedAt
            }).ToList();
        }

        public async Task<List<BatchExamSummaryDto>> GetBatchSummariesAsync(int examId)
        {
            var results = await _context.ExamAttempts
                .Include(a => a.Exam)
                .Where(a => a.ExamId == examId && a.IsCompleted)
                .OrderByDescending(a => a.SubmittedAt)
                .ToListAsync();

            var batchResults = results.Select(a => new BatchExamResultDto
            {
                AttemptId = a.Id,
                ExamId = a.ExamId,
                ExamTitle = a.Exam?.Title ?? string.Empty,
                StudentId = a.StudentId,
                StudentName = a.StudentId,
                NameWithInitials = string.Empty,
                MISNo = string.Empty,
                Score = a.Score,
                TotalMarks = a.TotalMarks,
                Percentage = a.TotalMarks > 0 ? (double)a.Score / a.TotalMarks * 100 : 0,
                Status = a.Status,
                StartedAt = a.StartedAt,
                SubmittedAt = a.SubmittedAt
            }).ToList();

            var attemptedStudents = batchResults.Select(r => r.StudentId).Distinct().Count();
            var percentages = batchResults.Select(r => r.Percentage).ToList();

            return new List<BatchExamSummaryDto>
            {
                new BatchExamSummaryDto
                {
                    BatchId = 0,
                    BatchCode = "All",
                    CourseName = "All Batches",
                    TotalStudents = attemptedStudents,
                    StudentsAttempted = attemptedStudents,
                    TotalAttempts = batchResults.Count,
                    AveragePercentage = percentages.Any() ? percentages.Average() : 0,
                    HighestPercentage = percentages.Any() ? percentages.Max() : 0,
                    LowestPercentage = percentages.Any() ? percentages.Min() : 0,
                    Results = batchResults
                }
            };
        }

        public async Task<List<ExamBatchStatsDto>> GetExamBatchStatsAsync()
        {
            var exams = await _context.Exams
                .Include(e => e.ExamQuestions)
                    .ThenInclude(eq => eq.Question)
                .ToListAsync();

            var stats = new List<ExamBatchStatsDto>();

            foreach (var exam in exams)
            {
                var results = await _context.ExamAttempts
                    .Include(a => a.Exam)
                    .Where(a => a.ExamId == exam.Id && a.IsCompleted)
                    .ToListAsync();

                var percentages = results.Select(r => r.TotalMarks > 0 ? (double)r.Score / r.TotalMarks * 100 : 0).ToList();
                var studentIds = results.Select(r => r.StudentId).Distinct().ToList();

                stats.Add(new ExamBatchStatsDto
                {
                    ExamId = exam.Id,
                    ExamTitle = exam.Title,
                    TotalMarks = exam.ExamQuestions.Sum(eq => eq.Question?.Marks ?? 0),
                    TotalAttempts = results.Count,
                    TotalStudents = studentIds.Count,
                    StudentsAttempted = studentIds.Count,
                    AveragePercentage = percentages.Any() ? percentages.Average() : 0,
                    HighestPercentage = percentages.Any() ? percentages.Max() : 0,
                    LowestPercentage = percentages.Any() ? percentages.Min() : 0,
                    BatchSummaries = new List<BatchExamSummaryDto>
                    {
                        new BatchExamSummaryDto
                        {
                            BatchId = 0,
                            BatchCode = "All",
                            CourseName = "All",
                            TotalStudents = studentIds.Count,
                            StudentsAttempted = studentIds.Count,
                            TotalAttempts = results.Count,
                            AveragePercentage = percentages.Any() ? percentages.Average() : 0,
                            HighestPercentage = percentages.Any() ? percentages.Max() : 0,
                            LowestPercentage = percentages.Any() ? percentages.Min() : 0,
                            Results = results.Select(r => new BatchExamResultDto
                            {
                                AttemptId = r.Id,
                                ExamId = r.ExamId,
                                ExamTitle = r.Exam?.Title ?? string.Empty,
                                StudentId = r.StudentId,
                                StudentName = r.StudentId,
                                NameWithInitials = string.Empty,
                                MISNo = string.Empty,
                                Score = r.Score,
                                TotalMarks = r.TotalMarks,
                                Percentage = r.TotalMarks > 0 ? (double)r.Score / r.TotalMarks * 100 : 0,
                                Status = r.Status,
                                StartedAt = r.StartedAt,
                                SubmittedAt = r.SubmittedAt
                            }).ToList()
                        }
                    }
                });
            }

            return stats;
        }

        public async Task<List<ExamResultDto>> GetStudentResultsByStudentIdAsync(string studentId)
        {
            var attempts = await _context.ExamAttempts
                .Include(a => a.Exam)
                .Where(a => a.StudentId == studentId && a.IsCompleted)
                .OrderByDescending(a => a.SubmittedAt)
                .ToListAsync();

            return attempts.Select(_mapper.Map<ExamResultDto>).ToList();
        }

        public async Task<List<ExamResultDto>> GetStudentResultsByBatchIdAsync(int batchId)
        {
            // StudentId in ExamAttempts is the Identity user ID (string), not Student.StudentId (int)
            // Return all results - frontend can filter by batch if needed
            var allResults = await _context.ExamAttempts
                .Include(a => a.Exam)
                .Where(a => a.IsCompleted)
                .OrderByDescending(a => a.SubmittedAt)
                .ToListAsync();

            return allResults.Select(_mapper.Map<ExamResultDto>).ToList();
        }
    }


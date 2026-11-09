using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace SmartEduManager.Api.DTOs;

public class ExamDto
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int? CategoryId { get; set; }
    public string CategoryName { get; set; } = string.Empty;
    public int TotalMarks { get; set; }
    public int QuestionCount { get; set; }
    public int Duration { get; set; }
    public bool IsActive { get; set; }
    public string CreatedAt { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime? AvailableFrom { get; set; }
    public DateTime? AvailableTo { get; set; }
    public string? TimeZone { get; set; }
    public int MaxAttempts { get; set; }
    public int AttemptsUsed { get; set; }
    public ICollection<ExamQuestionDto>? Questions { get; set; }
}

public class CreateExamDto
{
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int? CategoryId { get; set; }
    public int Duration { get; set; } = 60;
    public int MaxAttempts { get; set; } = 0;
    public List<AddQuestionToExamDto>? Questions { get; set; }
}

public class ExamQuestionDto
{
    public int Id { get; set; }
    public int ExamId { get; set; }
    public int QuestionId { get; set; }
    public int Order { get; set; }
    public QuestionDto? Question { get; set; }
}

public class AddQuestionToExamDto
{
    public int QuestionId { get; set; }
    public int Order { get; set; }
}

public class ScheduleExamDto
{
    public DateTime? AvailableFrom { get; set; }
    public DateTime? AvailableTo { get; set; }
    public string? TimeZone { get; set; }
}

public class UpdateExamDto
{
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int? CategoryId { get; set; }
    public int Duration { get; set; } = 60;
    public int MaxAttempts { get; set; }
}

public class ReorderExamQuestionsDto
{
    public List<int> QuestionIds { get; set; } = new();
}

public class StartExamDto
{
    public int ExamId { get; set; }
}

public class SubmitExamDto
{
    public int ExamAttemptId { get; set; }
    public List<ExamAnswerSubmission> Answers { get; set; } = new();
}

public class ExamAnswerSubmission
{
    public int QuestionId { get; set; }
    public string? SelectedAnswer { get; set; }
}

public class ExamAttemptDto
{
    public int Id { get; set; }
    public int ExamId { get; set; }
    public string StudentId { get; set; } = string.Empty;
    public DateTime StartedAt { get; set; }
    public DateTime? SubmittedAt { get; set; }
    public int Score { get; set; }
    public int TotalMarks { get; set; }
    public bool IsCompleted { get; set; }
    public string Status { get; set; } = string.Empty;
    public ExamDto? Exam { get; set; }
    public List<ExamAnswerDto>? Answers { get; set; }
}

public class ExamAnswerDto
{
    public int Id { get; set; }
    public int ExamAttemptId { get; set; }
    public int QuestionId { get; set; }
    public string? SelectedAnswer { get; set; }
    public bool IsCorrect { get; set; }
    public int MarksObtained { get; set; }
}

public class ExamResultDto
{
    public int Id { get; set; }
    public int ExamId { get; set; }
    public string ExamTitle { get; set; } = string.Empty;
    public int Score { get; set; }
    public int TotalMarks { get; set; }
    public double Percentage { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime StartedAt { get; set; }
    public DateTime? SubmittedAt { get; set; }
    public List<ExamAnswerResultDto>? Answers { get; set; }
}

public class ExamAnswerResultDto
{
    public int QuestionId { get; set; }
    public string QuestionContent { get; set; } = string.Empty;
    public string? SelectedAnswer { get; set; }
    public string? CorrectAnswer { get; set; }
    public bool IsCorrect { get; set; }
    public int MarksObtained { get; set; }
    public int TotalMarks { get; set; }
}

public class StudentExamSummaryDto
{
    public string StudentId { get; set; } = string.Empty;
    public string StudentName { get; set; } = string.Empty;
    public string NameWithInitials { get; set; } = string.Empty;
    public string MISNo { get; set; } = string.Empty;
    public string NICNo { get; set; } = string.Empty;
    public int TotalAttempts { get; set; }
    public int BestScore { get; set; }
    public double BestPercentage { get; set; }
    public double AveragePercentage { get; set; }
    public List<ExamResultDto> Attempts { get; set; } = new();
}

public class BatchExamResultDto
{
    public int AttemptId { get; set; }
    public int ExamId { get; set; }
    public string ExamTitle { get; set; } = string.Empty;
    public string StudentId { get; set; } = string.Empty;
    public string StudentName { get; set; } = string.Empty;
    public string NameWithInitials { get; set; } = string.Empty;
    public string MISNo { get; set; } = string.Empty;
    public int Score { get; set; }
    public int TotalMarks { get; set; }
    public double Percentage { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime StartedAt { get; set; }
    public DateTime? SubmittedAt { get; set; }
}

public class BatchExamSummaryDto
{
    public int BatchId { get; set; }
    public string BatchCode { get; set; } = string.Empty;
    public string CourseName { get; set; } = string.Empty;
    public int TotalStudents { get; set; }
    public int StudentsAttempted { get; set; }
    public int TotalAttempts { get; set; }
    public double AveragePercentage { get; set; }
    public double HighestPercentage { get; set; }
    public double LowestPercentage { get; set; }
    public List<BatchExamResultDto> Results { get; set; } = new();
}

public class ExamBatchStatsDto
{
    public int ExamId { get; set; }
    public string ExamTitle { get; set; } = string.Empty;
    public int TotalMarks { get; set; }
    public int TotalAttempts { get; set; }
    public int TotalStudents { get; set; }
    public int StudentsAttempted { get; set; }
    public double AveragePercentage { get; set; }
    public double HighestPercentage { get; set; }
    public double LowestPercentage { get; set; }
    public List<BatchExamSummaryDto> BatchSummaries { get; set; } = new();
}
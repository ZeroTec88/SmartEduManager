using AutoMapper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartEduManager.Api.Data;
using SmartEduManager.Api.DTOs;
using SmartEduManager.Api.Models;
using SmartEduManager.Api.Services;
using System.Security.Claims;

namespace SmartEduManager.Api.Controllers;

[Route("api/exam-attempts")]
[ApiController]
[Authorize]
public class ExamAttemptsController : ControllerBase
{
    private readonly IExamService _examService;
    private readonly AppDbContext _context;
    private readonly IMapper _mapper;
    private readonly ILogger<ExamAttemptsController> _logger;

    public ExamAttemptsController(
        IExamService examService,
        AppDbContext context,
        IMapper mapper,
        ILogger<ExamAttemptsController> logger)
    {
        _examService = examService;
        _context = context;
        _mapper = mapper;
        _logger = logger;
    }

    [HttpPost("start")]
    public async Task<IActionResult> StartExam([FromBody] StartExamDto dto)
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized("User not authenticated");
            }

            var existingAttempt = await _context.ExamAttempts
                .Include(a => a.Exam)
                    .ThenInclude(e => e!.ExamQuestions)
                        .ThenInclude(eq => eq.Question)
                .FirstOrDefaultAsync(a => a.ExamId == dto.ExamId && a.StudentId == userId && !a.IsCompleted);

            if (existingAttempt != null)
            {
                var examAttemptDto = _mapper.Map<ExamAttemptDto>(existingAttempt);
                return Ok(examAttemptDto);
            }

            var result = await _examService.StartExamAsync(dto.ExamId, userId);

            if (result == null)
            {
                var exam = await _context.Exams.FirstOrDefaultAsync(e => e.Id == dto.ExamId);
                if (exam != null && exam.MaxAttempts > 0)
                {
                    var completedAttempts = await _context.ExamAttempts
                        .CountAsync(a => a.ExamId == dto.ExamId && a.StudentId == userId && a.IsCompleted);

                    if (completedAttempts >= exam.MaxAttempts)
                    {
                        return BadRequest("You have reached the maximum number of attempts for this exam");
                    }
                }

                return BadRequest("Exam is not available or has not started yet");
            }

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error starting exam");
            return StatusCode(500, "Internal server error");
        }
    }

    [HttpPost("submit")]
    public async Task<IActionResult> SubmitExam([FromBody] SubmitExamDto dto)
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized("User not authenticated");
            }

            var result = await _examService.SubmitExamAsync(dto.ExamAttemptId, userId, dto.Answers);

            if (result == null)
            {
                return NotFound("Exam attempt not found or already submitted");
            }

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error submitting exam");
            return StatusCode(500, "Internal server error");
        }
    }

    [HttpGet("my-results")]
    public async Task<IActionResult> GetMyResults()
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized("User not authenticated");
            }

            var results = await _examService.GetStudentResultsAsync(userId);
            return Ok(results);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting results");
            return StatusCode(500, "Internal server error");
        }
    }

    [HttpGet("results/{id}")]
    public async Task<IActionResult> GetResult(int id)
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized("User not authenticated");
            }

            var result = await _examService.GetResultAsync(id, userId);

            if (result == null)
            {
                return NotFound("Result not found");
            }

            var questionMap = await _context.ExamQuestions
                .Include(eq => eq.Question)
                .Where(eq => eq.ExamId == result.ExamId)
                .ToDictionaryAsync(eq => eq.QuestionId);

            var answers = (result.Answers ?? Enumerable.Empty<ExamAnswerResultDto>()).Select(a =>
            {
                var q = questionMap.TryGetValue(a.QuestionId, out var eq) && eq != null ? eq.Question : null;
                return new ExamAnswerResultDto
                {
                    QuestionId = a.QuestionId,
                    QuestionContent = q?.Content ?? "Unknown question",
                    SelectedAnswer = a.SelectedAnswer,
                    CorrectAnswer = q?.CorrectAnswer ?? string.Empty,
                    IsCorrect = a.IsCorrect,
                    MarksObtained = a.MarksObtained,
                    TotalMarks = q?.Marks ?? 0
                };
            }).ToList();

            var finalResult = _mapper.Map<ExamResultDto>(result);
            finalResult.Answers = answers;

            return Ok(finalResult);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting result");
            return StatusCode(500, "Internal server error");
        }
    }

    [HttpGet("batch/{batchId}")]
    [Authorize(Roles = "Admin,Instructor")]
    public async Task<IActionResult> GetBatchResults(int batchId)
    {
        try
        {
            var results = await _examService.GetBatchResultsAsync(batchId);
            return Ok(results);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting batch results");
            return StatusCode(500, "Internal server error");
        }
    }


    [HttpGet("batch/{batchId}/exam/{examId}")]
    [Authorize(Roles = "Admin,Instructor")]
    public async Task<IActionResult> GetBatchResultsByExam(int batchId, int examId)
    {
        try
        {
            var results = await _examService.GetBatchResultsByExamAsync(batchId, examId);
            return Ok(results);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting batch results by exam");
            return StatusCode(500, "Internal server error");
        }
    }


    [HttpGet("exam/{examId}")]
    [Authorize(Roles = "Admin,Instructor")]
    public async Task<IActionResult> GetExamResults(int examId)
    {
        try
        {
            var results = await _examService.GetAllResultsAsync();
            var examResults = results.Where(r => r.ExamId == examId).ToList();
            return Ok(examResults);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting exam results");
            return StatusCode(500, "Internal server error");
        }
    }


    [HttpGet("student/{studentId}")]
    [Authorize(Roles = "Admin,Instructor")]
    public async Task<IActionResult> GetStudentResults(string studentId)
    {
        try
        {
            var results = await _examService.GetStudentResultsByStudentIdAsync(studentId);
            return Ok(results);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting student results");
            return StatusCode(500, "Internal server error");
        }
    }


    [HttpGet("stats")]
    [Authorize(Roles = "Admin,Instructor")]
    public async Task<IActionResult> GetExamBatchStats()
    {
        try
        {
            var stats = await _examService.GetExamBatchStatsAsync();
            return Ok(stats);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting exam batch stats");
            return StatusCode(500, "Internal server error");
        }
    }


    [HttpGet("batch/{batchId}/summary/{examId}")]
    [Authorize(Roles = "Admin,Instructor")]
    public async Task<IActionResult> GetBatchSummary(int batchId, int examId)
    {
        try
        {
            var summaries = await _examService.GetBatchSummariesAsync(examId);
            // Use the first summary; backend returns BatchId=0 (all batches) since
            // ExamAttempts.StudentId is not linked to Student.BatchId
            var summary = summaries.FirstOrDefault();
            if (summary == null)
                return NotFound("Batch summary not found");
            return Ok(summary);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting batch summary");
            return StatusCode(500, "Internal server error");
        }
    }

}

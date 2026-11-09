import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { AdminLayoutComponent } from './components/admin-layout/admin-layout.component';
import { AdminDashboardComponent } from './components/admin-dashboard/admin-dashboard.component';
import { InstructorDashboardComponent } from './components/instructor-dashboard/instructor-dashboard.component';
import { AttendanceDashboardComponent } from './components/attendance/attendance-dashboard.component';
import { DailyAttendanceComponent } from './components/attendance/daily-attendance.component';
import { MonthlyCalendarComponent } from './components/attendance/monthly-calendar.component';
import { StudentSummaryComponent } from './components/attendance/student-summary.component';
import { BatchSummaryComponent } from './components/attendance/batch-summary.component';
import { CourseCompletionComponent } from './components/attendance/course-completion.component';
import { ReportsComponent } from './components/attendance/reports.component';
import { SettingsComponent } from './components/attendance/settings.component';
import { inject } from '@angular/core';
import { AuthService } from './services/auth.service';
import { Router } from '@angular/router';

const authGuard = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.checkAuthStatus()) {
    return true;
  }
  router.navigate(['/login']);
  return false;
};

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  {
    path: 'login',
    component: LoginComponent,
    data: { breadcrumb: 'Login' }
  },
  {
    path: 'admin',
    component: AdminLayoutComponent,
    canActivate: [authGuard],
    data: { breadcrumb: 'Admin' },
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      {
        path: 'dashboard',
        component: AdminDashboardComponent,
        data: { breadcrumb: 'Dashboard' }
      },
      {
        path: 'instructors',
        loadComponent: () => import('./components/instructors/instructors').then(m => m.InstructorsComponent),
        data: { breadcrumb: 'Instructors' }
      },
      {
        path: 'courses',
        loadComponent: () => import('./components/courses/courses').then(m => m.CoursesComponent),
        data: { breadcrumb: 'Courses' }
      },
      {
        path: 'batches',
        redirectTo: 'dashboard',
        data: { breadcrumb: 'Batches' }
      },
      {
        path: 'centers',
        loadComponent: () => import('./components/centers/centers').then(m => m.CentersComponent),
        data: { breadcrumb: 'Centers' }
      },
      {
        path: 'districts',
        loadComponent: () => import('./components/districts/districts.component').then(m => m.DistrictsComponent),
        data: { breadcrumb: 'Districts' }
      },
      {
        path: 'assignments',
        redirectTo: 'dashboard',
        data: { breadcrumb: 'Assignments' }
      },
      {
        path: 'reports',
        redirectTo: 'dashboard',
        data: { breadcrumb: 'Reports' }
      },
      {
        path: 'users',
        loadComponent: () => import('./components/user-manager/user-manager').then(m => m.UserManagerComponent),
        data: { breadcrumb: 'User Manager' }
      },
      {
        path: 'exam-question-builder',
        loadComponent: () => import('./components/exam-question-builder/exam-question-builder.component').then(m => m.ExamQuestionBuilderComponent),
        data: { breadcrumb: 'Exam Question Builder' }
      },
      {
        path: 'exam-results',
        loadComponent: () => import('./components/exam-results/exam-results.component').then(m => m.ExamResultsComponent),
        data: { breadcrumb: 'Exam Results' }
      },
      {
        path: 'timetable',
        loadComponent: () => import('./components/timetable/timetable.component').then(m => m.TimetableComponent),
        data: { breadcrumb: 'Timetable' }
      }
    ]
  },
  {
    path: 'instructor',
    component: AdminLayoutComponent,
    canActivate: [authGuard],
    data: { breadcrumb: 'Instructor' },
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      {
        path: 'dashboard',
        component: InstructorDashboardComponent,
        data: { breadcrumb: 'Dashboard' }
      },
      {
        path: 'exam-question-builder',
        loadComponent: () => import('./components/exam-question-builder/exam-question-builder.component').then(m => m.ExamQuestionBuilderComponent),
        data: { breadcrumb: 'Exam Question Builder' }
      },
      {
        path: 'exam-results',
        loadComponent: () => import('./components/exam-results/exam-results.component').then(m => m.ExamResultsComponent),
        data: { breadcrumb: 'Exam Results' }
      },
      {
        path: 'batches',
        loadComponent: () => import('./components/instructor-batches/instructor-batches.component').then(m => m.InstructorBatchesComponent),
        data: { breadcrumb: 'Batches' }
      },
      {
        path: 'students',
        loadComponent: () => import('./components/instructor-students/instructor-students.component').then(m => m.InstructorStudentsComponent),
        data: { breadcrumb: 'Students' }
      },
      {
        path: 'student-credentials',
        loadComponent: () => import('./components/student-credentials/student-credentials.component').then(m => m.StudentCredentialsComponent),
        data: { breadcrumb: 'Generate Credentials' }
      },
      {
        path: 'assignments',
        loadComponent: () => import('./components/instructor-assignments/instructor-assignments.component').then(m => m.InstructorAssignmentsComponent),
        data: { breadcrumb: 'Assignments' }
      },
      {
        path: 'continuous-assessments',
        loadComponent: () => import('./components/instructor-continuous-assessments/instructor-continuous-assessments.component').then(m => m.InstructorContinuousAssessmentsComponent),
        data: { breadcrumb: 'Continuous Assessment' }
      },
      {
        path: 'continuous-assessments/reports',
        loadComponent: () => import('./components/continuous-assessments-reports/continuous-assessments-reports.component').then(m => m.ContinuousAssessmentsReportsComponent),
        data: { breadcrumb: 'CA Reports' }
      },
      {
        path: 'ncs',
        loadComponent: () => import('./components/instructor-ncs/instructor-ncs.component').then(m => m.InstructorNcsComponent),
        data: { breadcrumb: 'NCS & Modules' }
      },
      {
        path: 'modules',
        loadComponent: () => import('./components/instructors/instructors').then(m => m.InstructorsComponent),
        data: { breadcrumb: 'Modules' }
      },
      {
        path: 'schedule',
        loadComponent: () => import('./components/timetable/timetable.component').then(m => m.TimetableComponent),
        data: { breadcrumb: 'My Schedule' }
      },
      {
        path: 'attendance',
        component: AttendanceDashboardComponent,
        data: { breadcrumb: 'Attendance' }
      },
      {
        path: 'attendance/daily',
        component: DailyAttendanceComponent,
        data: { breadcrumb: 'Daily Attendance' }
      },
      {
        path: 'attendance/calendar',
        component: MonthlyCalendarComponent,
        data: { breadcrumb: 'Monthly Calendar' }
      },
      {
        path: 'attendance/summary',
        component: StudentSummaryComponent,
        data: { breadcrumb: 'Student Summary' }
      },
      {
        path: 'attendance/batch-summary',
        component: BatchSummaryComponent,
        data: { breadcrumb: 'Batch Summary' }
      },
      {
        path: 'attendance/reports',
        component: ReportsComponent,
        data: { breadcrumb: 'Reports' }
      },
      {
        path: 'attendance/course-completion',
        component: CourseCompletionComponent,
        data: { breadcrumb: 'Course Completion' }
      },
      {
        path: 'attendance/settings',
        component: SettingsComponent,
        data: { breadcrumb: 'Settings' }
      }
    ]
  },
  {
    path: '**',
    redirectTo: 'login'
  }
];


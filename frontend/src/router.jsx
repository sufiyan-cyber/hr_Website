/**
 * Application Router — Phase 1–4 (Auth + Role-Based Routing + AI Screening + Employee/Dept/Pipeline)
 *
 * Route architecture:
 *
 *  PUBLIC
 *    /login          → LoginPage
 *    /signup         → SignupPage
 *    /unauthorized   → UnauthorizedPage
 *    /               → smart redirect based on auth state
 *
 *  PROTECTED (auth required — wrapped in ProtectedRoute + DashboardLayout)
 *
 *    ALL ROLES:
 *      /profile      → ProfilePage
 *      /chatbot      → ChatbotPage
 *
 *    management_admin  → /admin/dashboard
 *      + /employees, /departments, /recruitment, /candidates, /analytics, /settings
 *
 *    hr_recruiter      → /hr/dashboard
 *      + /recruitment, /candidates, /pipeline
 *
 *    senior_manager    → /manager/dashboard
 *      + /employees (read), /performance, /approvals
 *
 *    employee          → /employee/dashboard
 *      + /attendance, /payroll
 */

import { createBrowserRouter, Navigate } from 'react-router-dom'

import DashboardLayout      from '@layouts/DashboardLayout'
import ProtectedRoute       from '@components/ProtectedRoute'
import RoleGuard            from '@components/RoleGuard'
import SmartRedirect        from '@components/SmartRedirect'

// ── Public ────────────────────────────────────────────────────────────────────
import LoginPage            from '@pages/LoginPage'
import SignupPage           from '@pages/SignupPage'
import UnauthorizedPage     from '@pages/UnauthorizedPage'

// ── Role Dashboards ───────────────────────────────────────────────────────────
import AdminDashboard       from '@pages/dashboards/AdminDashboard'
import HRDashboard          from '@pages/dashboards/HRDashboard'
import ManagerDashboard     from '@pages/dashboards/ManagerDashboard'
import EmployeeDashboard    from '@pages/dashboards/EmployeeDashboard'

// ── Feature pages (stubs — built in Phase 2+) ────────────────────────────────
import EmployeesPage        from '@pages/EmployeesPage'
import EmployeeDetailPage   from '@pages/EmployeeDetailPage'
import DepartmentsPage      from '@pages/DepartmentsPage'
import RecruitmentPage      from '@pages/RecruitmentPage'
import JobDetailPage        from '@pages/JobDetailPage'
import CandidatesPage       from '@pages/CandidatesPage'
import CandidateDetailPage  from '@pages/CandidateDetailPage'
import AttendancePage       from '@pages/AttendancePage'
import PayrollPage          from '@pages/PayrollPage'
import PerformancePage      from '@pages/PerformancePage'
import ChatbotPage          from '@pages/ChatbotPage'
import ProfilePage          from '@pages/ProfilePage'
import SettingsPage         from '@pages/SettingsPage'

// ── Placeholder pages (wired but not yet built) ───────────────────────────────
import AnalyticsPage        from '@pages/AnalyticsPage'
import PipelinePage         from '@pages/PipelinePage'
import ApprovalsPage        from '@pages/ApprovalsPage'

// ── Phase 2: AI Resume Screening ─────────────────────────────────────────────
import ResumeScreeningPage  from '@pages/ResumeScreeningPage'

// ── Phase 5: 404 page ─────────────────────────────────────────────────────────
import NotFoundPage         from '@pages/NotFoundPage'

// ── Role constants ────────────────────────────────────────────────────────────
const ADMIN    = 'management_admin'
const HR       = 'hr_recruiter'
const MANAGER  = 'senior_manager'
const EMPLOYEE = 'employee'

// ── Router ────────────────────────────────────────────────────────────────────

const router = createBrowserRouter([
  // ── Public routes ──────────────────────────────────────────────────────────
  { path: '/login',        element: <LoginPage /> },
  { path: '/signup',       element: <SignupPage /> },
  { path: '/unauthorized', element: <UnauthorizedPage /> },

  // ── Root: smart redirect based on auth + role ──────────────────────────────
  { path: '/', element: <SmartRedirect /> },

  // ── Protected ─────────────────────────────────────────────────────────────
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <DashboardLayout />,
        children: [

          // ── management_admin routes ────────────────────────────────────────
          {
            element: <RoleGuard roles={[ADMIN]} />,
            children: [
              { path: '/admin/dashboard', element: <AdminDashboard /> },
              { path: '/analytics',       element: <AnalyticsPage /> },
              { path: '/settings',        element: <SettingsPage /> },
            ],
          },

          // ── hr_recruiter routes ────────────────────────────────────────────
          {
            element: <RoleGuard roles={[HR, ADMIN]} />,
            children: [
              { path: '/hr/dashboard',   element: <HRDashboard /> },
              { path: '/hr/screening',   element: <ResumeScreeningPage /> },
              { path: '/pipeline',       element: <PipelinePage /> },
              { path: '/hr/pipeline',    element: <PipelinePage /> },
            ],
          },

          // ── senior_manager routes ──────────────────────────────────────────
          {
            element: <RoleGuard roles={[MANAGER]} />,
            children: [
              { path: '/manager/dashboard', element: <ManagerDashboard /> },
              { path: '/approvals',         element: <ApprovalsPage /> },
            ],
          },

          // ── employee routes ────────────────────────────────────────────────
          {
            element: <RoleGuard roles={[EMPLOYEE]} />,
            children: [
              { path: '/employee/dashboard', element: <EmployeeDashboard /> },
            ],
          },

          // ── Shared routes: admin + HR ──────────────────────────────────────
          {
            element: <RoleGuard roles={[ADMIN, HR]} />,
            children: [
              { path: '/recruitment',     element: <RecruitmentPage /> },
              { path: '/recruitment/:id', element: <JobDetailPage /> },
              { path: '/candidates',      element: <CandidatesPage /> },
              { path: '/candidates/:id',  element: <CandidateDetailPage /> },
            ],
          },

          // ── Shared routes: admin + HR + manager ───────────────────────────
          {
            element: <RoleGuard roles={[ADMIN, HR, MANAGER]} />,
            children: [
              { path: '/employees',              element: <EmployeesPage /> },
              { path: '/employees/:id',          element: <EmployeeDetailPage /> },
              { path: '/admin/employees',        element: <EmployeesPage /> },
              { path: '/admin/employees/:id',    element: <EmployeeDetailPage /> },
            ],
          },

          // ── Shared: admin + manager ────────────────────────────────────────
          {
            element: <RoleGuard roles={[ADMIN, MANAGER]} />,
            children: [
              { path: '/departments',        element: <DepartmentsPage /> },
              { path: '/admin/departments',  element: <DepartmentsPage /> },
            ],
          },

          // ── Shared: admin + manager + employee ────────────────────────────
          {
            element: <RoleGuard roles={[ADMIN, MANAGER, EMPLOYEE]} />,
            children: [
              { path: '/performance', element: <PerformancePage /> },
            ],
          },

          // ── Shared: admin + employee (payroll) ────────────────────────────
          {
            element: <RoleGuard roles={[ADMIN, EMPLOYEE]} />,
            children: [
              { path: '/payroll',    element: <PayrollPage /> },
              { path: '/attendance', element: <AttendancePage /> },
            ],
          },

          // ── All authenticated roles ────────────────────────────────────────
          { path: '/profile', element: <ProfilePage /> },
          { path: '/chatbot', element: <ChatbotPage /> },
        ],
      },
    ],
  },

  // ── 404 catch-all ─────────────────────────────────────────────────────────
  { path: '*', element: <NotFoundPage /> },
])

export default router

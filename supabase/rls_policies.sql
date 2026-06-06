-- =============================================================================
-- HRMS Platform — Row Level Security (RLS) Policies
-- Phase 1: Foundation Setup
--
-- Run this file AFTER schema.sql in your Supabase SQL Editor.
-- =============================================================================

-- =============================================================================
-- Enable RLS on all tables
-- =============================================================================

ALTER TABLE public.users               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_profiles   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resumes             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_descriptions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidates          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidate_status    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatbot_history     ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- Helper function: get current user's role from the users table
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT role FROM public.users
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
$$;

-- =============================================================================
-- Helper function: get current user's internal UUID (not auth UUID)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_my_user_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT id FROM public.users
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
$$;

-- =============================================================================
-- POLICIES: users table
-- =============================================================================

-- management_admin: full access
CREATE POLICY "management_admin_all_users"
  ON public.users FOR ALL
  USING (public.get_my_role() = 'management_admin');

-- hr_recruiter: can read all users (to assign uploaded_by, etc.)
CREATE POLICY "hr_recruiter_read_users"
  ON public.users FOR SELECT
  USING (public.get_my_role() = 'hr_recruiter');

-- senior_manager: can read all users
CREATE POLICY "senior_manager_read_users"
  ON public.users FOR SELECT
  USING (public.get_my_role() = 'senior_manager');

-- employee: can read and update only their own record
CREATE POLICY "employee_read_own_user"
  ON public.users FOR SELECT
  USING (auth_user_id = auth.uid());

CREATE POLICY "employee_update_own_user"
  ON public.users FOR UPDATE
  USING (auth_user_id = auth.uid());

-- =============================================================================
-- POLICIES: departments
-- =============================================================================

CREATE POLICY "management_admin_all_departments"
  ON public.departments FOR ALL
  USING (public.get_my_role() = 'management_admin');

CREATE POLICY "hr_recruiter_read_departments"
  ON public.departments FOR SELECT
  USING (public.get_my_role() = 'hr_recruiter');

CREATE POLICY "senior_manager_read_departments"
  ON public.departments FOR SELECT
  USING (public.get_my_role() = 'senior_manager');

CREATE POLICY "employee_read_departments"
  ON public.departments FOR SELECT
  USING (public.get_my_role() = 'employee');

-- =============================================================================
-- POLICIES: employee_profiles
-- =============================================================================

CREATE POLICY "management_admin_all_employee_profiles"
  ON public.employee_profiles FOR ALL
  USING (public.get_my_role() = 'management_admin');

CREATE POLICY "senior_manager_read_employee_profiles"
  ON public.employee_profiles FOR SELECT
  USING (public.get_my_role() = 'senior_manager');

CREATE POLICY "hr_recruiter_read_employee_profiles"
  ON public.employee_profiles FOR SELECT
  USING (public.get_my_role() = 'hr_recruiter');

CREATE POLICY "employee_read_own_profile"
  ON public.employee_profiles FOR SELECT
  USING (user_id = public.get_my_user_id());

-- =============================================================================
-- POLICIES: resumes (recruitment domain)
-- =============================================================================

CREATE POLICY "management_admin_all_resumes"
  ON public.resumes FOR ALL
  USING (public.get_my_role() = 'management_admin');

CREATE POLICY "hr_recruiter_all_resumes"
  ON public.resumes FOR ALL
  USING (public.get_my_role() = 'hr_recruiter');

-- =============================================================================
-- POLICIES: job_descriptions (recruitment domain)
-- =============================================================================

CREATE POLICY "management_admin_all_job_descriptions"
  ON public.job_descriptions FOR ALL
  USING (public.get_my_role() = 'management_admin');

CREATE POLICY "hr_recruiter_all_job_descriptions"
  ON public.job_descriptions FOR ALL
  USING (public.get_my_role() = 'hr_recruiter');

-- senior_manager can view open positions
CREATE POLICY "senior_manager_read_job_descriptions"
  ON public.job_descriptions FOR SELECT
  USING (public.get_my_role() = 'senior_manager');

-- =============================================================================
-- POLICIES: candidates (recruitment domain)
-- =============================================================================

CREATE POLICY "management_admin_all_candidates"
  ON public.candidates FOR ALL
  USING (public.get_my_role() = 'management_admin');

CREATE POLICY "hr_recruiter_all_candidates"
  ON public.candidates FOR ALL
  USING (public.get_my_role() = 'hr_recruiter');

-- =============================================================================
-- POLICIES: candidate_status (recruitment domain)
-- =============================================================================

CREATE POLICY "management_admin_all_candidate_status"
  ON public.candidate_status FOR ALL
  USING (public.get_my_role() = 'management_admin');

CREATE POLICY "hr_recruiter_all_candidate_status"
  ON public.candidate_status FOR ALL
  USING (public.get_my_role() = 'hr_recruiter');

-- =============================================================================
-- POLICIES: attendance
-- =============================================================================

CREATE POLICY "management_admin_all_attendance"
  ON public.attendance FOR ALL
  USING (public.get_my_role() = 'management_admin');

CREATE POLICY "hr_recruiter_read_attendance"
  ON public.attendance FOR SELECT
  USING (public.get_my_role() = 'hr_recruiter');

CREATE POLICY "senior_manager_read_attendance"
  ON public.attendance FOR SELECT
  USING (public.get_my_role() = 'senior_manager');

CREATE POLICY "employee_read_own_attendance"
  ON public.attendance FOR SELECT
  USING (user_id = public.get_my_user_id());

-- =============================================================================
-- POLICIES: payroll
-- =============================================================================

CREATE POLICY "management_admin_all_payroll"
  ON public.payroll FOR ALL
  USING (public.get_my_role() = 'management_admin');

-- Employees can only see their own payslips
CREATE POLICY "employee_read_own_payroll"
  ON public.payroll FOR SELECT
  USING (user_id = public.get_my_user_id());

-- =============================================================================
-- POLICIES: performance_reviews
-- =============================================================================

CREATE POLICY "management_admin_all_performance_reviews"
  ON public.performance_reviews FOR ALL
  USING (public.get_my_role() = 'management_admin');

CREATE POLICY "senior_manager_all_performance_reviews"
  ON public.performance_reviews FOR ALL
  USING (public.get_my_role() = 'senior_manager');

-- Employees can read reviews written about them
CREATE POLICY "employee_read_own_performance_reviews"
  ON public.performance_reviews FOR SELECT
  USING (user_id = public.get_my_user_id());

-- =============================================================================
-- POLICIES: chatbot_history
-- =============================================================================

CREATE POLICY "management_admin_all_chatbot_history"
  ON public.chatbot_history FOR ALL
  USING (public.get_my_role() = 'management_admin');

-- All authenticated users can manage their own chat history
CREATE POLICY "user_manage_own_chatbot_history"
  ON public.chatbot_history FOR ALL
  USING (user_id = public.get_my_user_id());

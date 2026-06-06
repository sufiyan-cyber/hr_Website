-- =============================================================================
-- HRMS Platform — Complete Supabase Database Schema
-- Phase 1: Foundation Setup
--
-- Run this file first in your Supabase SQL Editor.
-- Then run rls_policies.sql to enable Row Level Security.
-- =============================================================================

-- ── Extensions ────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- ENUM types
-- =============================================================================

CREATE TYPE user_role AS ENUM (
  'management_admin',
  'hr_recruiter',
  'senior_manager',
  'employee'
);

CREATE TYPE employee_status AS ENUM (
  'active',
  'inactive',
  'on_leave',
  'terminated'
);

CREATE TYPE attendance_status AS ENUM (
  'present',
  'absent',
  'half_day',
  'on_leave',
  'holiday'
);

CREATE TYPE payroll_status AS ENUM (
  'pending',
  'processed',
  'paid',
  'failed'
);

CREATE TYPE candidate_stage AS ENUM (
  'applied',
  'screening',
  'interview_scheduled',
  'interviewed',
  'offer_extended',
  'offer_accepted',
  'offer_rejected',
  'hired',
  'rejected'
);

-- =============================================================================
-- TABLE: users
-- Mirrors Supabase auth.users and stores role + display name.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.users (
  id            UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  email         TEXT          NOT NULL UNIQUE,
  role          user_role     NOT NULL DEFAULT 'employee',
  full_name     TEXT,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  -- Link to Supabase auth user
  auth_user_id  UUID          UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE
);

COMMENT ON TABLE public.users IS 'Application user records with role information.';

-- ── Trigger: auto-create user row on Supabase auth signup ────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (auth_user_id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE((NEW.raw_app_meta_data->>'role')::user_role, 'employee')
  )
  ON CONFLICT (auth_user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user();

-- =============================================================================
-- TABLE: departments
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.departments (
  id            UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT          NOT NULL UNIQUE,
  manager_id    UUID          REFERENCES public.users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.departments IS 'Company departments and their managers.';

-- =============================================================================
-- TABLE: employee_profiles
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.employee_profiles (
  id              UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID            NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  department_id   UUID            REFERENCES public.departments(id) ON DELETE SET NULL,
  position        TEXT,
  salary          NUMERIC(12, 2)  CHECK (salary >= 0),
  joining_date    DATE,
  status          employee_status NOT NULL DEFAULT 'active'
);

COMMENT ON TABLE public.employee_profiles IS 'Detailed employment records for each user.';

-- =============================================================================
-- TABLE: resumes
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.resumes (
  id               UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  candidate_name   TEXT          NOT NULL,
  email            TEXT,
  file_url         TEXT          NOT NULL,   -- S3 or Supabase Storage URL
  uploaded_by      UUID          REFERENCES public.users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.resumes IS 'Uploaded candidate resume metadata and storage references.';

-- =============================================================================
-- TABLE: job_descriptions
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.job_descriptions (
  id            UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  title         TEXT          NOT NULL,
  description   TEXT,
  requirements  TEXT,
  created_by    UUID          REFERENCES public.users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.job_descriptions IS 'Open job postings and their requirements.';

-- =============================================================================
-- TABLE: candidates
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.candidates (
  id            UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  resume_id     UUID          REFERENCES public.resumes(id) ON DELETE SET NULL,
  job_id        UUID          REFERENCES public.job_descriptions(id) ON DELETE SET NULL,
  status        candidate_stage NOT NULL DEFAULT 'applied',
  ai_score      NUMERIC(5, 2) CHECK (ai_score BETWEEN 0 AND 100),
  ai_summary    TEXT,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.candidates IS 'Candidate applications linked to resumes and job descriptions, with AI scoring.';

-- =============================================================================
-- TABLE: candidate_status
-- Tracks stage changes with notes (audit log style)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.candidate_status (
  id            UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  candidate_id  UUID          NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  stage         candidate_stage NOT NULL,
  notes         TEXT,
  updated_by    UUID          REFERENCES public.users(id) ON DELETE SET NULL,
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.candidate_status IS 'Audit log of candidate pipeline stage changes.';

-- =============================================================================
-- TABLE: attendance
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.attendance (
  id            UUID              PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID              NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  date          DATE              NOT NULL,
  status        attendance_status NOT NULL DEFAULT 'present',
  check_in      TIMETZ,
  check_out     TIMETZ,

  UNIQUE (user_id, date)  -- One record per user per day
);

COMMENT ON TABLE public.attendance IS 'Daily attendance records for each employee.';

-- =============================================================================
-- TABLE: payroll
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.payroll (
  id            UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID            NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  month         DATE            NOT NULL,   -- Store as first day of month (e.g., 2024-01-01)
  basic_salary  NUMERIC(12, 2)  NOT NULL CHECK (basic_salary >= 0),
  deductions    NUMERIC(12, 2)  NOT NULL DEFAULT 0 CHECK (deductions >= 0),
  net_salary    NUMERIC(12, 2)  GENERATED ALWAYS AS (basic_salary - deductions) STORED,
  status        payroll_status  NOT NULL DEFAULT 'pending',

  UNIQUE (user_id, month)  -- One payroll record per user per month
);

COMMENT ON TABLE public.payroll IS 'Monthly payroll records with computed net salary.';

-- =============================================================================
-- TABLE: performance_reviews
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.performance_reviews (
  id            UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID          NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  reviewer_id   UUID          REFERENCES public.users(id) ON DELETE SET NULL,
  score         NUMERIC(3, 1) CHECK (score BETWEEN 0 AND 10),
  feedback      TEXT,
  review_date   DATE          NOT NULL DEFAULT CURRENT_DATE
);

COMMENT ON TABLE public.performance_reviews IS 'Manager-submitted performance reviews for employees.';

-- =============================================================================
-- TABLE: chatbot_history
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.chatbot_history (
  id            UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID          NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  message       TEXT          NOT NULL,
  response      TEXT,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.chatbot_history IS 'AI chatbot conversation history per user.';

-- =============================================================================
-- Indexes for performance
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_employee_profiles_user_id     ON public.employee_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_employee_profiles_department   ON public.employee_profiles(department_id);
CREATE INDEX IF NOT EXISTS idx_candidates_job_id             ON public.candidates(job_id);
CREATE INDEX IF NOT EXISTS idx_candidates_resume_id          ON public.candidates(resume_id);
CREATE INDEX IF NOT EXISTS idx_candidate_status_candidate_id ON public.candidate_status(candidate_id);
CREATE INDEX IF NOT EXISTS idx_attendance_user_date          ON public.attendance(user_id, date);
CREATE INDEX IF NOT EXISTS idx_payroll_user_month            ON public.payroll(user_id, month);
CREATE INDEX IF NOT EXISTS idx_performance_reviews_user_id   ON public.performance_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_history_user_id       ON public.chatbot_history(user_id);

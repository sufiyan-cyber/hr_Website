-- =============================================================================
-- HRMS Platform — Migration (schema-aware, PostgreSQL 15 / Supabase)
--
-- The attendance, payroll, performance_reviews tables ALREADY EXIST in
-- schema.sql with these exact columns:
--
--   attendance:          id, user_id, date, status (ENUM), check_in, check_out
--   payroll:             id, user_id, month (DATE), basic_salary, deductions,
--                        net_salary (GENERATED), status (ENUM)
--   performance_reviews: id, user_id, reviewer_id, score (0-10), feedback,
--                        review_date
--
-- This migration is SAFE TO RUN on a fresh DB (nothing exists yet) or on a
-- DB that was set up with schema.sql (tables already exist — no changes needed).
-- It adds only the indexes and RLS policies the original schema.sql skips for
-- these three tables (it already defines them, but RLS policies are in
-- rls_policies.sql which you may not have run).
--
-- If you ran schema.sql + rls_policies.sql already, this is a no-op.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Ensure RLS is ON for the three core tables (idempotent)
-- ---------------------------------------------------------------------------
ALTER TABLE public.attendance          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_reviews ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- attendance RLS policies
-- DROP first so this is safe to re-run
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "management_admin_all_attendance"   ON public.attendance;
DROP POLICY IF EXISTS "hr_recruiter_read_attendance"      ON public.attendance;
DROP POLICY IF EXISTS "senior_manager_read_attendance"    ON public.attendance;
DROP POLICY IF EXISTS "employee_read_own_attendance"      ON public.attendance;

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

-- ---------------------------------------------------------------------------
-- payroll RLS policies
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "management_admin_all_payroll"  ON public.payroll;
DROP POLICY IF EXISTS "employee_read_own_payroll"     ON public.payroll;

CREATE POLICY "management_admin_all_payroll"
  ON public.payroll FOR ALL
  USING (public.get_my_role() = 'management_admin');

CREATE POLICY "employee_read_own_payroll"
  ON public.payroll FOR SELECT
  USING (user_id = public.get_my_user_id());

-- ---------------------------------------------------------------------------
-- performance_reviews RLS policies
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "management_admin_all_performance_reviews"  ON public.performance_reviews;
DROP POLICY IF EXISTS "senior_manager_all_performance_reviews"    ON public.performance_reviews;
DROP POLICY IF EXISTS "employee_read_own_performance_reviews"     ON public.performance_reviews;

CREATE POLICY "management_admin_all_performance_reviews"
  ON public.performance_reviews FOR ALL
  USING (public.get_my_role() = 'management_admin');

CREATE POLICY "senior_manager_all_performance_reviews"
  ON public.performance_reviews FOR ALL
  USING (public.get_my_role() = 'senior_manager');

CREATE POLICY "employee_read_own_performance_reviews"
  ON public.performance_reviews FOR SELECT
  USING (user_id = public.get_my_user_id());

-- ---------------------------------------------------------------------------
-- Indexes (idempotent — IF NOT EXISTS is fine for indexes in PG15)
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_attendance_user_date
  ON public.attendance (user_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_payroll_user_month
  ON public.payroll (user_id, month DESC);

CREATE INDEX IF NOT EXISTS idx_performance_reviews_user_id
  ON public.performance_reviews (user_id, review_date DESC);

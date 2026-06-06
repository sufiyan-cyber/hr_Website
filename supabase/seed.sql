-- =============================================================================
-- HRMS Platform — Seed Data
-- Run this AFTER schema.sql and rls_policies.sql in the Supabase SQL Editor.
-- Provides realistic demo data for all features.
-- =============================================================================

-- ── 1. USERS (4 roles) ────────────────────────────────────────────────────────
-- Note: auth_user_id values should be replaced with real Supabase Auth UUIDs
-- after creating accounts via the Auth dashboard.

INSERT INTO public.users (id, auth_user_id, full_name, email, role, created_at)
VALUES
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000001', 'Admin User',    'admin@hrms.demo',     'management_admin', NOW()),
  ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000002', 'HR Recruiter',  'recruiter@hrms.demo', 'hr_recruiter',     NOW()),
  ('33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000003', 'Senior Manager','manager@hrms.demo',   'senior_manager',   NOW()),
  ('44444444-4444-4444-4444-444444444444', '00000000-0000-0000-0000-000000000004', 'Alex Chen',     'alex@hrms.demo',      'employee',         NOW()),
  ('55555555-5555-5555-5555-555555555555', '00000000-0000-0000-0000-000000000005', 'Jake Torres',   'jake.torres@company.com', 'senior_manager', NOW()),
  ('66666666-6666-6666-6666-666666666666', '00000000-0000-0000-0000-000000000006', 'Lily Zhang',    'lily.zhang@company.com',  'senior_manager', NOW()),
  ('77777777-7777-7777-7777-777777777777', '00000000-0000-0000-0000-000000000007', 'Nadia Okonkwo', 'nadia.okonkwo@company.com', 'senior_manager', NOW()),
  ('88888888-8888-8888-8888-888888888888', '00000000-0000-0000-0000-000000000008', 'Priya Patel',   'priya.patel@company.com', 'employee', NOW()),
  ('99999999-9999-9999-9999-999999999999', '00000000-0000-0000-0000-000000000009', 'Omar Hassan',   'omar.hassan@company.com', 'employee', NOW()),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '00000000-0000-0000-0000-000000000010', 'Sara Kim',      'sara.kim@company.com', 'employee', NOW())
ON CONFLICT (id) DO NOTHING;

-- ── 2. DEPARTMENTS ────────────────────────────────────────────────────────────

INSERT INTO public.departments (id, name, manager_id, created_at)
VALUES
  ('b0000000-0000-0000-0000-000000000001', 'Engineering', '55555555-5555-5555-5555-555555555555', NOW()),
  ('b0000000-0000-0000-0000-000000000002', 'HR',           '66666666-6666-6666-6666-666666666666', NOW()),
  ('b0000000-0000-0000-0000-000000000003', 'Operations',   '77777777-7777-7777-7777-777777777777', NOW())
ON CONFLICT (id) DO NOTHING;

-- ── 3. EMPLOYEE PROFILES ──────────────────────────────────────────────────────

INSERT INTO public.employee_profiles (id, user_id, department_id, position, salary, joining_date, status)
VALUES
  (uuid_generate_v4(), '44444444-4444-4444-4444-444444444444', 'b0000000-0000-0000-0000-000000000001', 'Senior Engineer', 95000, CURRENT_DATE - INTERVAL '3 years', 'active'),
  (uuid_generate_v4(), '88888888-8888-8888-8888-888888888888', 'b0000000-0000-0000-0000-000000000001', 'Engineer II', 75000, CURRENT_DATE - INTERVAL '2 years', 'active'),
  (uuid_generate_v4(), '99999999-9999-9999-9999-999999999999', 'b0000000-0000-0000-0000-000000000003', 'Sales Executive', 65000, CURRENT_DATE - INTERVAL '4 years', 'active'),
  (uuid_generate_v4(), 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'b0000000-0000-0000-0000-000000000001', 'Junior Engineer', 55000, CURRENT_DATE - INTERVAL '1 year', 'active'),
  (uuid_generate_v4(), '55555555-5555-5555-5555-555555555555', 'b0000000-0000-0000-0000-000000000001', 'Tech Lead', 120000, CURRENT_DATE - INTERVAL '5 years', 'active'),
  (uuid_generate_v4(), '66666666-6666-6666-6666-666666666666', 'b0000000-0000-0000-0000-000000000002', 'HR Manager', 90000, CURRENT_DATE - INTERVAL '4 years', 'active'),
  (uuid_generate_v4(), '77777777-7777-7777-7777-777777777777', 'b0000000-0000-0000-0000-000000000003', 'Sales Manager', 105000, CURRENT_DATE - INTERVAL '4 years', 'active')
ON CONFLICT (user_id) DO NOTHING;

-- ── 4. JOB DESCRIPTIONS ───────────────────────────────────────────────────────

INSERT INTO public.job_descriptions (id, title, description, requirements, created_by, created_at)
VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Senior Backend Engineer', 'We are seeking a Senior Backend Engineer...', 'Python, FastAPI, PostgreSQL, AWS, Docker, 5+ years experience', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '30 days'),
  ('a0000000-0000-0000-0000-000000000002', 'Frontend Engineer', 'Join our product team to build beautiful, responsive UIs...', 'React, TypeScript, CSS, REST APIs, 3+ years experience', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '25 days'),
  ('a0000000-0000-0000-0000-000000000003', 'Product Manager', 'Drive product strategy and roadmap...', 'Product roadmap, stakeholder management, agile', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '20 days')
ON CONFLICT (id) DO NOTHING;

-- ── 5. RESUMES ────────────────────────────────────────────────────────────────

INSERT INTO public.resumes (id, candidate_name, email, file_url, uploaded_by, created_at)
VALUES
  ('c0000000-0000-0000-0000-000000000001', 'Alice Johnson', 'alice.johnson@example.com', 'https://example.com/resumes/alice.pdf', '22222222-2222-2222-2222-222222222222', NOW() - INTERVAL '20 days'),
  ('c0000000-0000-0000-0000-000000000002', 'Bob Martinez',  'bob.martinez@example.com',  'https://example.com/resumes/bob.pdf',   '22222222-2222-2222-2222-222222222222', NOW() - INTERVAL '19 days'),
  ('c0000000-0000-0000-0000-000000000003', 'Carla Singh',   'carla.singh@example.com',   'https://example.com/resumes/carla.pdf', '22222222-2222-2222-2222-222222222222', NOW() - INTERVAL '18 days'),
  ('c0000000-0000-0000-0000-000000000004', 'Frank Okafor',  'frank.okafor@example.com',  'https://example.com/resumes/frank.pdf', '22222222-2222-2222-2222-222222222222', NOW() - INTERVAL '15 days')
ON CONFLICT (id) DO NOTHING;

-- ── 6. CANDIDATES ─────────────────────────────────────────────────────────────

INSERT INTO public.candidates (id, resume_id, job_id, status, ai_score, ai_summary, created_at)
VALUES
  ('d0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'interview_scheduled', 92.0, '{"recommendation":"Strong","matched_skills":["Python","FastAPI","PostgreSQL"],"missing_skills":["Kubernetes"]}', NOW() - INTERVAL '19 days'),
  ('d0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'interview_scheduled', 84.0, '{"recommendation":"Strong","matched_skills":["Python","AWS","Docker"],"missing_skills":["FastAPI"]}', NOW() - INTERVAL '18 days'),
  ('d0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000002', 'screening', 78.0, '{"recommendation":"Maybe","matched_skills":["React","TypeScript"],"missing_skills":["CSS animations"]}', NOW() - INTERVAL '17 days'),
  ('d0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'hired', 96.0, '{"recommendation":"Strong","matched_skills":["Python","FastAPI","AWS","Docker","PostgreSQL"],"missing_skills":[]}', NOW() - INTERVAL '14 days')
ON CONFLICT (id) DO NOTHING;

-- ── 7. CANDIDATE STATUS HISTORY ──────────────────────────────────────────────

INSERT INTO public.candidate_status (id, candidate_id, stage, notes, updated_by, updated_at)
VALUES
  (uuid_generate_v4(), 'd0000000-0000-0000-0000-000000000001', 'applied', 'Application received via portal', '22222222-2222-2222-2222-222222222222', NOW() - INTERVAL '19 days'),
  (uuid_generate_v4(), 'd0000000-0000-0000-0000-000000000001', 'screening', 'AI score: 92%', '22222222-2222-2222-2222-222222222222', NOW() - INTERVAL '18 days'),
  (uuid_generate_v4(), 'd0000000-0000-0000-0000-000000000001', 'interview_scheduled', 'Meets all JD requirements', '22222222-2222-2222-2222-222222222222', NOW() - INTERVAL '17 days'),
  (uuid_generate_v4(), 'd0000000-0000-0000-0000-000000000004', 'applied', 'Referral from Jake Torres', '22222222-2222-2222-2222-222222222222', NOW() - INTERVAL '14 days'),
  (uuid_generate_v4(), 'd0000000-0000-0000-0000-000000000004', 'hired', 'Offer accepted', '22222222-2222-2222-2222-222222222222', NOW() - INTERVAL '7 days')
ON CONFLICT DO NOTHING;

-- ── 8. ATTENDANCE RECORDS ─────────────────────────────────────────────────────

INSERT INTO public.attendance (id, user_id, date, status, check_in, check_out)
VALUES
  (uuid_generate_v4(), '44444444-4444-4444-4444-444444444444', CURRENT_DATE - 1, 'present', '09:02:00', '18:15:00'),
  (uuid_generate_v4(), '44444444-4444-4444-4444-444444444444', CURRENT_DATE - 2, 'present', '08:55:00', '17:45:00'),
  (uuid_generate_v4(), '44444444-4444-4444-4444-444444444444', CURRENT_DATE - 4, 'on_leave', NULL, NULL),
  (uuid_generate_v4(), '88888888-8888-8888-8888-888888888888', CURRENT_DATE - 1, 'present', '09:15:00', '18:00:00'),
  (uuid_generate_v4(), '88888888-8888-8888-8888-888888888888', CURRENT_DATE - 2, 'absent',  NULL, NULL)
ON CONFLICT (user_id, date) DO NOTHING;

-- ── 9. PAYROLL RECORDS ────────────────────────────────────────────────────────

INSERT INTO public.payroll (id, user_id, month, basic_salary, deductions, status)
VALUES
  (uuid_generate_v4(), '44444444-4444-4444-4444-444444444444', date_trunc('month', CURRENT_DATE)::DATE, 95000, 11400, 'processed'),
  (uuid_generate_v4(), '44444444-4444-4444-4444-444444444444', date_trunc('month', CURRENT_DATE - INTERVAL '1 month')::DATE, 95000, 11400, 'processed'),
  (uuid_generate_v4(), '88888888-8888-8888-8888-888888888888', date_trunc('month', CURRENT_DATE)::DATE, 75000, 9000, 'processed'),
  (uuid_generate_v4(), '88888888-8888-8888-8888-888888888888', date_trunc('month', CURRENT_DATE - INTERVAL '1 month')::DATE, 75000, 9000, 'processed')
ON CONFLICT (user_id, month) DO NOTHING;

-- ── 10. PERFORMANCE REVIEWS ───────────────────────────────────────────────────

INSERT INTO public.performance_reviews (id, user_id, reviewer_id, score, feedback, review_date)
VALUES
  (uuid_generate_v4(), '44444444-4444-4444-4444-444444444444', '55555555-5555-5555-5555-555555555555', 4.5, 'Exceeds Expectations', CURRENT_DATE - INTERVAL '2 months'),
  (uuid_generate_v4(), '44444444-4444-4444-4444-444444444444', '55555555-5555-5555-5555-555555555555', 4.3, 'Exceeds Expectations', CURRENT_DATE - INTERVAL '5 months'),
  (uuid_generate_v4(), '88888888-8888-8888-8888-888888888888', '55555555-5555-5555-5555-555555555555', 4.2, 'Meets Expectations', CURRENT_DATE - INTERVAL '2 months')
ON CONFLICT (id) DO NOTHING;

-- ── 11. CHATBOT HISTORY ───────────────────────────────────────────────────────

INSERT INTO public.chatbot_history (id, user_id, message, response, created_at)
VALUES
  (uuid_generate_v4(), '11111111-1111-1111-1111-111111111111', 'How many employees do we have?', 'We currently have 10 employees across 3 departments.', NOW() - INTERVAL '2 hours'),
  (uuid_generate_v4(), '11111111-1111-1111-1111-111111111111', 'Who are our top candidates?', 'The top candidates by AI score are:\n• **Frank Okafor** — 96% — Hired\n• **Alice Johnson** — 92% — Interview Scheduled', NOW() - INTERVAL '1 hour')
ON CONFLICT (id) DO NOTHING;

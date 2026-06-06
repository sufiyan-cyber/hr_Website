-- =============================================================================
-- HRMS Demo Seed Data — attendance, payroll, performance_reviews
-- Based on EXACT columns from schema.sql
--
-- attendance:          user_id (UUID), date (DATE), status (attendance_status ENUM),
--                      check_in (TIMETZ), check_out (TIMETZ)
--                      attendance_status ENUM: 'present','absent','half_day','on_leave','holiday'
--
-- payroll:             user_id (UUID), month (DATE — first day of month),
--                      basic_salary (NUMERIC), deductions (NUMERIC), status (payroll_status ENUM)
--                      payroll_status ENUM: 'pending','processed','paid','failed'
--                      net_salary is GENERATED (basic_salary - deductions)
--
-- performance_reviews: user_id (UUID), reviewer_id (UUID), score (NUMERIC 0-10),
--                      feedback (TEXT), review_date (DATE)
--
-- These UUIDs match the seed.sql demo users:
--   44444444... = Alex Chen (employee)
--   88888888... = Priya Patel (employee)
--   99999999... = Omar Hassan (employee)
--   aaaaaaaa... = Sara Kim (employee)
--   55555555... = Jake Torres (senior_manager) — used as reviewer
--
-- IMPORTANT: If you're using REAL Supabase Auth accounts (not the seed.sql demo
-- users), replace the UUIDs below with your actual public.users.id values.
-- You can get them by running: SELECT id, email FROM public.users;
-- =============================================================================

-- ── ATTENDANCE (last 30 days for demo employees) ────────────────────────────

INSERT INTO public.attendance (id, user_id, date, status, check_in, check_out)
VALUES
  -- Alex Chen — good attendance
  (uuid_generate_v4(), '44444444-4444-4444-4444-444444444444', CURRENT_DATE - 1,  'present',  '09:02:00+05:30', '18:15:00+05:30'),
  (uuid_generate_v4(), '44444444-4444-4444-4444-444444444444', CURRENT_DATE - 2,  'present',  '08:55:00+05:30', '17:45:00+05:30'),
  (uuid_generate_v4(), '44444444-4444-4444-4444-444444444444', CURRENT_DATE - 3,  'present',  '09:10:00+05:30', '18:30:00+05:30'),
  (uuid_generate_v4(), '44444444-4444-4444-4444-444444444444', CURRENT_DATE - 4,  'on_leave', NULL, NULL),
  (uuid_generate_v4(), '44444444-4444-4444-4444-444444444444', CURRENT_DATE - 5,  'present',  '09:00:00+05:30', '18:00:00+05:30'),
  (uuid_generate_v4(), '44444444-4444-4444-4444-444444444444', CURRENT_DATE - 7,  'present',  '09:05:00+05:30', '17:50:00+05:30'),
  (uuid_generate_v4(), '44444444-4444-4444-4444-444444444444', CURRENT_DATE - 8,  'present',  '09:20:00+05:30', '18:10:00+05:30'),
  (uuid_generate_v4(), '44444444-4444-4444-4444-444444444444', CURRENT_DATE - 9,  'absent',   NULL, NULL),
  (uuid_generate_v4(), '44444444-4444-4444-4444-444444444444', CURRENT_DATE - 10, 'present',  '09:00:00+05:30', '18:00:00+05:30'),
  (uuid_generate_v4(), '44444444-4444-4444-4444-444444444444', CURRENT_DATE - 11, 'present',  '09:15:00+05:30', '18:00:00+05:30'),
  (uuid_generate_v4(), '44444444-4444-4444-4444-444444444444', CURRENT_DATE - 12, 'half_day', '09:05:00+05:30', '13:00:00+05:30'),
  (uuid_generate_v4(), '44444444-4444-4444-4444-444444444444', CURRENT_DATE - 14, 'present',  '09:00:00+05:30', '18:00:00+05:30'),
  (uuid_generate_v4(), '44444444-4444-4444-4444-444444444444', CURRENT_DATE - 15, 'present',  '08:58:00+05:30', '18:05:00+05:30'),
  (uuid_generate_v4(), '44444444-4444-4444-4444-444444444444', CURRENT_DATE - 16, 'present',  '09:03:00+05:30', '17:55:00+05:30'),
  (uuid_generate_v4(), '44444444-4444-4444-4444-444444444444', CURRENT_DATE - 17, 'present',  '09:10:00+05:30', '18:20:00+05:30'),
  (uuid_generate_v4(), '44444444-4444-4444-4444-444444444444', CURRENT_DATE - 18, 'on_leave', NULL, NULL),
  (uuid_generate_v4(), '44444444-4444-4444-4444-444444444444', CURRENT_DATE - 21, 'present',  '09:00:00+05:30', '18:00:00+05:30'),
  (uuid_generate_v4(), '44444444-4444-4444-4444-444444444444', CURRENT_DATE - 22, 'present',  '09:05:00+05:30', '17:45:00+05:30'),
  (uuid_generate_v4(), '44444444-4444-4444-4444-444444444444', CURRENT_DATE - 23, 'present',  '09:00:00+05:30', '18:00:00+05:30'),
  (uuid_generate_v4(), '44444444-4444-4444-4444-444444444444', CURRENT_DATE - 24, 'absent',   NULL, NULL),
  (uuid_generate_v4(), '44444444-4444-4444-4444-444444444444', CURRENT_DATE - 25, 'present',  '09:10:00+05:30', '18:10:00+05:30'),

  -- Priya Patel
  (uuid_generate_v4(), '88888888-8888-8888-8888-888888888888', CURRENT_DATE - 1,  'present',  '09:15:00+05:30', '18:00:00+05:30'),
  (uuid_generate_v4(), '88888888-8888-8888-8888-888888888888', CURRENT_DATE - 2,  'absent',   NULL, NULL),
  (uuid_generate_v4(), '88888888-8888-8888-8888-888888888888', CURRENT_DATE - 3,  'present',  '09:05:00+05:30', '18:00:00+05:30'),
  (uuid_generate_v4(), '88888888-8888-8888-8888-888888888888', CURRENT_DATE - 4,  'present',  '09:00:00+05:30', '17:30:00+05:30'),
  (uuid_generate_v4(), '88888888-8888-8888-8888-888888888888', CURRENT_DATE - 5,  'on_leave', NULL, NULL),

  -- Omar Hassan
  (uuid_generate_v4(), '99999999-9999-9999-9999-999999999999', CURRENT_DATE - 1,  'present',  '09:30:00+05:30', '18:30:00+05:30'),
  (uuid_generate_v4(), '99999999-9999-9999-9999-999999999999', CURRENT_DATE - 2,  'present',  '09:10:00+05:30', '18:00:00+05:30'),
  (uuid_generate_v4(), '99999999-9999-9999-9999-999999999999', CURRENT_DATE - 3,  'absent',   NULL, NULL)

ON CONFLICT (user_id, date) DO NOTHING;


-- ── PAYROLL (last 3 months for demo employees) ──────────────────────────────
-- month must be the FIRST day of the month (DATE type)

INSERT INTO public.payroll (id, user_id, month, basic_salary, deductions, status)
VALUES
  -- Alex Chen (salary 95000, 12% deductions = 11400)
  (uuid_generate_v4(), '44444444-4444-4444-4444-444444444444', date_trunc('month', CURRENT_DATE)::DATE,                          95000, 11400, 'processed'),
  (uuid_generate_v4(), '44444444-4444-4444-4444-444444444444', date_trunc('month', CURRENT_DATE - INTERVAL '1 month')::DATE,     95000, 11400, 'paid'),
  (uuid_generate_v4(), '44444444-4444-4444-4444-444444444444', date_trunc('month', CURRENT_DATE - INTERVAL '2 months')::DATE,    95000, 11400, 'paid'),

  -- Priya Patel (salary 75000)
  (uuid_generate_v4(), '88888888-8888-8888-8888-888888888888', date_trunc('month', CURRENT_DATE)::DATE,                          75000, 9000, 'processed'),
  (uuid_generate_v4(), '88888888-8888-8888-8888-888888888888', date_trunc('month', CURRENT_DATE - INTERVAL '1 month')::DATE,     75000, 9000, 'paid'),

  -- Omar Hassan (salary 65000)
  (uuid_generate_v4(), '99999999-9999-9999-9999-999999999999', date_trunc('month', CURRENT_DATE)::DATE,                          65000, 7800, 'pending'),
  (uuid_generate_v4(), '99999999-9999-9999-9999-999999999999', date_trunc('month', CURRENT_DATE - INTERVAL '1 month')::DATE,     65000, 7800, 'paid'),

  -- Sara Kim (salary 55000)
  (uuid_generate_v4(), 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', date_trunc('month', CURRENT_DATE)::DATE,                          55000, 6600, 'pending')

ON CONFLICT (user_id, month) DO NOTHING;


-- ── PERFORMANCE REVIEWS ──────────────────────────────────────────────────────
-- score is 0-10 (not 0-5). reviewer_id = Jake Torres (manager)

INSERT INTO public.performance_reviews (id, user_id, reviewer_id, score, feedback, review_date)
VALUES
  -- Alex Chen
  (uuid_generate_v4(), '44444444-4444-4444-4444-444444444444', '55555555-5555-5555-5555-555555555555', 8.5, 'Consistently delivers high-quality work. Strong technical skills and excellent team collaboration. Recommended for senior track.', CURRENT_DATE - INTERVAL '3 months'),
  (uuid_generate_v4(), '44444444-4444-4444-4444-444444444444', '55555555-5555-5555-5555-555555555555', 7.8, 'Good performance this quarter. Needs to improve on documentation standards.', CURRENT_DATE - INTERVAL '6 months'),

  -- Priya Patel
  (uuid_generate_v4(), '88888888-8888-8888-8888-888888888888', '55555555-5555-5555-5555-555555555555', 7.2, 'Meets expectations. Has shown growth in problem solving. Continue working on communication skills.', CURRENT_DATE - INTERVAL '3 months'),

  -- Omar Hassan
  (uuid_generate_v4(), '99999999-9999-9999-9999-999999999999', '55555555-5555-5555-5555-555555555555', 8.0, 'Strong sales performance. Exceeded targets for Q1. Great client relationship management.', CURRENT_DATE - INTERVAL '3 months'),

  -- Sara Kim
  (uuid_generate_v4(), 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '55555555-5555-5555-5555-555555555555', 6.5, 'Good first year performance. Still ramping up on the codebase. Shows good learning ability.', CURRENT_DATE - INTERVAL '2 months')

ON CONFLICT (id) DO NOTHING;

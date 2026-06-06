# 🤖 AI-Powered HRMS Platform

> A full-stack, production-ready Human Resource Management System powered by Google Gemini AI.
> Built with React + Vite (Frontend) and Python FastAPI (Backend), using Supabase for database and auth.

[![Frontend CI](https://github.com/your-org/hrms-platform/actions/workflows/frontend-ci.yml/badge.svg)](https://github.com/your-org/hrms-platform/actions)
[![Backend CI](https://github.com/your-org/hrms-platform/actions/workflows/backend-ci.yml/badge.svg)](https://github.com/your-org/hrms-platform/actions)

---

## 📐 Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Users (Browser)                      │
└───────────────────────┬─────────────────────────────────┘
                        │ HTTPS
          ┌─────────────▼─────────────┐
          │   Vercel (Frontend CDN)   │
          │   React + Vite SPA        │
          └─────────────┬─────────────┘
                        │ REST API (HTTPS)
          ┌─────────────▼─────────────┐
          │   AWS Elastic Beanstalk   │
          │   FastAPI + Uvicorn       │
          └──────┬──────────┬─────────┘
                 │          │
    ┌────────────▼──┐  ┌────▼──────────────┐
    │   Supabase    │  │    AWS S3         │
    │  PostgreSQL   │  │  Resume Storage   │
    │  + Auth JWT   │  │                   │
    └───────────────┘  └───────────────────┘
                 │
    ┌────────────▼──────────┐
    │   Google Gemini AI    │
    │  Resume Screening +   │
    │  HR Chatbot           │
    └───────────────────────┘
```

---

## 🛠️ Tech Stack

| Layer       | Technology                                                    |
|-------------|---------------------------------------------------------------|
| Frontend    | React 18 + Vite, React Router v6, Axios, Recharts            |
| Styling     | Vanilla CSS (custom design system, dark mode)                 |
| Backend     | Python 3.11, FastAPI, Uvicorn, Pydantic v2                    |
| Database    | Supabase (PostgreSQL) with Row Level Security                 |
| Auth        | Supabase Auth (JWT), RBAC middleware                          |
| AI / LLM    | Google Gemini 1.5 Flash (screening + chatbot)                 |
| File Storage| AWS S3 (resume PDFs, job description attachments)             |
| Deployment  | Vercel (Frontend), AWS Elastic Beanstalk (Backend)            |
| CI/CD       | GitHub Actions                                                |

---

## 🔑 User Roles

| Role               | Description                                                 |
|--------------------|-------------------------------------------------------------|
| `management_admin` | Full access — employees, payroll, settings, all features    |
| `hr_recruiter`     | Recruitment: upload resumes, screen candidates, pipeline    |
| `senior_manager`   | Read-only: employee profiles, performance, analytics        |
| `employee`         | Read own data: attendance, payroll, profile                 |

---

## 🚀 Local Setup

### Prerequisites

- **Node.js** >= 18
- **Python** >= 3.11
- **Git**
- A [Supabase](https://supabase.com) project
- An [AWS account](https://aws.amazon.com) (for S3 + Elastic Beanstalk)
- A [Google AI Studio](https://aistudio.google.com) API key (Gemini)

---

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/hrms-platform.git
cd hrms-platform
```

---

### 2. Supabase Setup

1. Go to [Supabase Dashboard](https://supabase.com/dashboard) → create a new project
2. Navigate to **SQL Editor**
3. Run `supabase/schema.sql` — creates all 11 tables with RLS enabled
4. Run `supabase/rls_policies.sql` — sets up role-based access policies
5. Run `supabase/seed.sql` — populates demo data (4 users, 10 employees, 15 candidates, etc.)
6. Grab your credentials:
   - **Project URL** → `SUPABASE_URL`
   - **anon public key** → `VITE_SUPABASE_ANON_KEY`
   - **service_role secret** → `SUPABASE_SERVICE_KEY`
   - **JWT Secret** (Project Settings → API) → `SUPABASE_JWT_SECRET`

---

### 3. AWS S3 Setup

1. Create an S3 bucket (e.g. `hrms-resumes-prod`)
2. Set bucket region (e.g. `us-east-1`)
3. Create an IAM user with `AmazonS3FullAccess` policy
4. Generate Access Key → save as `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`
5. Set CORS on your bucket:
```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedOrigins": ["https://your-app.vercel.app", "http://localhost:5173"],
    "ExposeHeaders": []
  }
]
```

---

### 4. Backend Setup

```bash
cd backend

# Create and activate virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
source venv/bin/activate     # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env and fill in all values

# Start development server
uvicorn main:app --reload --port 8000
```

- API: `http://localhost:8000`
- Swagger UI: `http://localhost:8000/docs`
- Health: `http://localhost:8000/health`

---

### 5. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
# Edit .env.local and fill in all values

# Start development server
npm run dev
```

- App: `http://localhost:5173`

---

## 🔐 Environment Variables

### Backend (`backend/.env`)

| Variable | Description |
|----------|-------------|
| `ENVIRONMENT` | `development` or `production` |
| `ALLOWED_ORIGINS` | Comma-separated list of frontend origins |
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Supabase service role key (server-side only) |
| `SUPABASE_JWT_SECRET` | Supabase JWT secret for token validation |
| `AWS_ACCESS_KEY_ID` | AWS IAM access key |
| `AWS_SECRET_ACCESS_KEY` | AWS IAM secret key |
| `AWS_S3_BUCKET` | S3 bucket name for file storage |
| `AWS_REGION` | S3 bucket region (e.g. `us-east-1`) |
| `GEMINI_API_KEY` | Google Gemini API key |
| `SECRET_KEY` | Random secret for additional signing |

### Frontend (`frontend/.env.local`)

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `VITE_API_BASE_URL` | Backend API URL (e.g. `http://localhost:8000`) |

---

## 🚢 Deployment

### Frontend → Vercel

1. Push the repo to GitHub
2. Go to [vercel.com](https://vercel.com) → Import Project
3. Set **Root Directory** to `frontend/`
4. Add environment variables from `frontend/.env.example`
5. Deploy — Vercel handles everything

The `frontend/vercel.json` already configures SPA routing rewrites.

---

### Backend → AWS Elastic Beanstalk

```bash
cd backend

# Install EB CLI
pip install awsebcli

# Initialize (first time only)
eb init hrms-backend --platform python-3.11 --region us-east-1

# Create environment (first time only)
eb create hrms-backend-env

# Set environment variables
eb setenv \
  SUPABASE_URL=https://xxx.supabase.co \
  SUPABASE_SERVICE_KEY=xxx \
  GEMINI_API_KEY=xxx \
  AWS_S3_BUCKET=hrms-resumes-prod

# Deploy (subsequent deployments)
eb deploy
```

The `backend/Procfile` specifies the start command:
```
web: uvicorn app.main:app --host 0.0.0.0 --port 8000
```

---

### CI/CD → GitHub Actions

Three workflows in `.github/workflows/`:

| File | Trigger | Purpose |
|------|---------|--------|
| `frontend-ci.yml` | PR to `main` | Lint + build check |
| `backend-ci.yml` | PR to `main` | Lint + test check |
| `deploy.yml` | Push to `main` | Deploy to Vercel + AWS EB |

Required GitHub Secrets:
```
VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_API_BASE_URL
SUPABASE_URL, SUPABASE_SERVICE_KEY, SUPABASE_JWT_SECRET
AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, AWS_S3_BUCKET
GEMINI_API_KEY, OPENAI_API_KEY
VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID
```

---

## 📡 API Documentation

Full interactive docs available at `http://localhost:8000/docs` (Swagger UI).

### Key Endpoints

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `POST` | `/api/v1/auth/login` | Login with email+password | Public |
| `POST` | `/api/v1/auth/signup` | Register new user | Public |
| `GET` | `/api/v1/employees` | List employees (paginated) | HR/Admin/Manager |
| `GET` | `/api/v1/employees/{id}` | Employee profile + attendance + payroll | HR/Admin/Manager |
| `POST` | `/api/v1/employees` | Create employee | Admin |
| `PATCH` | `/api/v1/employees/{id}` | Update employee | Admin |
| `DELETE` | `/api/v1/employees/{id}` | Deactivate employee | Admin |
| `GET` | `/api/v1/candidates` | List candidates (paginated) | HR/Admin/Manager |
| `GET` | `/api/v1/candidates/{id}` | Candidate detail + AI report | HR/Admin/Manager |
| `PATCH` | `/api/v1/candidates/{id}/stage` | Move pipeline stage | HR/Admin |
| `POST` | `/api/v1/recruitment/upload-resumes` | Upload PDF/DOCX resumes | HR/Admin |
| `POST` | `/api/v1/recruitment/upload-jd` | Create job description | HR/Admin |
| `POST` | `/api/v1/recruitment/screen` | AI screening (rate limited: 10/min) | HR/Admin |
| `GET` | `/api/v1/recruitment/results/{job_id}` | Get screening results | HR/Admin |
| `POST` | `/api/v1/chatbot/message` | Send AI chatbot message (rate: 20/min) | All roles |
| `GET` | `/api/v1/chatbot/history` | Get chat history | All roles |
| `GET` | `/api/v1/dashboard/stats` | Dashboard KPIs | HR/Admin/Manager |
| `GET` | `/api/v1/departments` | List departments | HR/Admin/Manager |
| `GET` | `/api/v1/health` | Health check | Public |

---

## 🎬 Demo Flow

Follow these steps to experience the full platform:

**Step 1 — Login**
- Visit the app URL
- Login with `admin@hrms.demo` / your password (or sign up as management_admin)

**Step 2 — Dashboard**
- View KPI cards: total employees, candidates, departments, hiring rate
- Check the activity feed and pipeline summary chart

**Step 3 — Employee Management**
- Go to `/employees` → browse the 10 seeded employees
- Click any employee → view full profile with attendance, payroll, performance tabs
- Try adding a new employee via the "+ Add Employee" button

**Step 4 — AI Resume Screening**
- Go to `/resume-screening`
- Upload a job description (paste text or upload PDF)
- Upload 1-3 PDF resumes
- Click "Screen Candidates" → watch AI analyze and score each resume
- View matched skills, missing skills, strengths/weaknesses per candidate

**Step 5 — Candidate Pipeline**
- Go to `/pipeline` → see Kanban board with 15 seeded candidates
- Click any candidate card → view AI report in side panel
- Use stage buttons to move candidates through the pipeline
- Add notes in the Notes tab

**Step 6 — HRBot AI Chatbot**
- Click the floating 🤖 button (bottom-right corner, visible on all pages)
- Try prompt chips: "Show top candidates", "Employee overview", "List departments"
- Try typing: "Who was hired this month?", "How many people are in Engineering?"
- Use the 🎙 microphone button for voice input

**Step 7 — Analytics**
- Go to `/admin/dashboard` → view analytics charts
- Filter by department, date range

---

## 🗄️ Database Schema

| Table | Purpose |
|-------|---------|
| `users` | Auth user records with role and department |
| `departments` | Company departments |
| `resumes` | Uploaded candidate resume metadata |
| `job_descriptions` | Open job postings |
| `candidates` | Candidate tracking with AI score/summary |
| `candidate_status` | Pipeline stage history with notes |
| `attendance` | Daily attendance records |
| `payroll` | Monthly payroll records |
| `performance_reviews` | Quarterly performance reviews |
| `chatbot_history` | AI chatbot conversation logs |

---

## 📁 Project Structure

```
hrms-platform/
├── frontend/
│   ├── src/
│   │   ├── components/        # Reusable UI (FloatingChatWidget, ConfirmDialog, EmptyState)
│   │   ├── pages/             # Page components (one per route)
│   │   ├── layouts/           # DashboardLayout, Sidebar, TopNavbar
│   │   ├── services/          # Axios API call functions
│   │   ├── context/           # AuthContext
│   │   ├── hooks/             # useAuth, custom hooks
│   │   └── utils/             # Helper utilities
│   ├── vercel.json            # Vercel SPA routing config
│   └── .env.example
│
├── backend/
│   ├── app/
│   │   ├── routers/           # FastAPI route handlers
│   │   ├── ai_utils/          # Gemini integration, resume parser, matcher
│   │   ├── middleware/        # JWT auth + RBAC middleware
│   │   ├── database/          # Supabase client
│   │   ├── schemas/           # Pydantic request/response schemas
│   │   └── services/          # Business logic
│   ├── Procfile               # AWS EB start command
│   └── .env.example
│
├── supabase/
│   ├── schema.sql             # All 10 tables with RLS
│   ├── rls_policies.sql       # Role-based access policies
│   └── seed.sql               # Demo data (10 employees, 15 candidates, etc.)
│
└── .github/
    └── workflows/
        ├── frontend-ci.yml    # PR: lint + build
        ├── backend-ci.yml     # PR: lint + test
        └── deploy.yml         # Push to main: deploy to Vercel + AWS EB
```

---

## 🤝 Contributing

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Commit changes: `git commit -m 'feat: description'`
3. Push: `git push origin feature/your-feature`
4. Open a Pull Request

---

*Built with ❤️ — AI-Powered HRMS Platform v1.0 — Production Ready*

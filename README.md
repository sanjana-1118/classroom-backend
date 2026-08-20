

# 🛠 Classroom — Backend API

The **Classroom Backend** is a RESTful API built with **Express 5** and **TypeScript**, serving as the core of the Classroom Management platform. It handles authentication, authorization, database operations, and role‑based access control. The service is deployed on **Railway** with a serverless PostgreSQL database hosted on **Neon**.



## ⚙️ Tech Stack

- **Express 5** — HTTP server and routing  
- **TypeScript 5.9** — static typing and safer development  
- **Drizzle ORM** — type‑safe schema definitions and queries  
- **Neon** — serverless PostgreSQL over HTTP  
- **Better Auth** — cookie‑based sessions, email/password auth, custom roles  
- **Arcjet** — rate limiting, bot detection, WAF shield (production only)  
- **tsx** — TypeScript execution for dev server and scripts  
- **drizzle‑kit** — migration generation and deployment  



## 📂 Project Structure

```
src/
├── config/        Arcjet client setup
├── db/            Database connection (Neon + Drizzle)
├── lib/           Better Auth instance and configuration
├── middleware/    Auth guards (requireAuth, requireRole) + Arcjet security
├── routes/        One file per resource
├── schema/        Database table definitions (app.ts, auth.ts)
└── index.ts       App entry point, middleware registration, route mounting
```



## 🗄 Database

The app defines **8 tables** across two schema files:

**Application tables** (`schema/app.ts`):  
- `departments` — academic departments, parent of subjects  
- `subjects` — belong to a department, parent of classes  
- `classes` — class instances with teacher, subject, capacity, status, JSONB schedules, banner  
- `enrollments` — links a student to a class, unique on `(studentId, classId)`  
- `announcements` — messages posted to a class by teachers/admins  

**Auth tables** (`schema/auth.ts`, managed by Better Auth):  
- `user` — id, name, email, role (student/teacher/admin), image fields  
- `session` — active sessions with token, expiry, IP, user agent  
- `account` — auth provider records and hashed passwords  
- `verification` — email verification tokens  



## 🌐 API Routes

All routes are prefixed with `/api`.  
Authentication is required for all routes except `/api/auth/*`.

**Auth (public)**  
- `POST /api/auth/sign-up/email` — register as student/teacher  
- `POST /api/auth/sign-in/email` — sign in, receive session cookie  
- `POST /api/auth/sign-out` — invalidate session  
- `GET  /api/auth/get-session` — get current user + session  

**Profile (any authenticated user)**  
- `GET /api/profile` — current user record  

**Stats (admin/teacher)**  
- `GET /api/stats` — aggregate counts for subjects, classes, enrollments, users  

**Departments (admin/teacher)**  
- `GET/POST /api/departments` — list (with filters) / create  
- `GET/PATCH/DELETE /api/departments/:id` — read / update / delete  

**Subjects (admin/teacher)**  
- `GET/POST /api/subjects` — list (with filters) / create  
- `GET/PATCH/DELETE /api/subjects/:id` — read / update / delete  

**Classes (role‑scoped)**  
- `GET/POST /api/classes` — list / create  
- `GET/PATCH/DELETE /api/classes/:id` — read / update / delete  
- `GET /api/classes/:id/users?role=student|teacher` — users in a class  

**Enrollments**  
- `GET /api/enrollments` — list (students see own only)  
- `POST /api/enrollments` — enroll student, capacity enforced  
- `DELETE /api/enrollments/:id` — remove enrollment (admin/teacher only)  

**Announcements**  
- `GET /api/announcements` — list for accessible classes  
- `POST /api/announcements` — post (admin/teacher only)  
- `PATCH/DELETE /api/announcements/:id` — edit/delete (admin/teacher only)  

**Timetable (any authenticated user)**  
- `GET /api/timetable` — schedules scoped by role  

**Users (admin only)**  
- `GET /api/users` — list with filters  

**Students (admin/teacher)**  
- `GET /api/students` — student list for enrollment dropdowns  



## 🔑 Authorization

Roles: `student`, `teacher`, `admin`  

- Admin accounts cannot be created via registration (blocked by DB hook).  
- Admins are created using `scripts/create_admin.ts`.  

Authorization layers:  
- **Route level** — `requireRole()` middleware blocks unauthorized roles  
- **Method level** — `requireRoleForMethods()` allows GET but restricts mutations  
- **Row level** — handlers filter results by user ID and role  



## 🛡 Security

Arcjet runs in **production only** (bypassed in dev).  

- Rate limiting (sliding window per minute):  
  - Guests: 5 requests  
  - Students/Teachers: 10 requests  
  - Admins: 20 requests  
- Bot detection → blocks automated clients (403)  
- WAF shield → blocks known attack signatures  



## ⚙️ Environment Variables

```
DATABASE_URL          Neon PostgreSQL connection string
BETTER_AUTH_SECRET    Random secret (min 32 chars)
BETTER_AUTH_URL       Public backend URL
FRONTEND_URL          Public frontend URL (CORS)
ARCJET_KEY            Arcjet API key (production only)
PORT                  Server port (default: 8080)
```



## 📜 Scripts

```bash
npm run dev          # Dev server with auto-reload
npm run build        # Compile TypeScript to dist/
npm run start        # Run compiled output
npm run db:generate  # Generate migration files
npm run db:migrate   # Apply migrations to Neon
npm run db:seed      # Seed the database
```

Utility scripts (run with `npx tsx scripts/<name>.ts`):  
- `create_admin.ts` — create admin account  
- `promote_admin.ts` — promote user to admin  
- `reset_admin.ts` — reset admin password  
- `seed_student.ts` — create test student accounts  
- `seed_enrollment.ts` — enroll test students  
- `clear_enrollments.ts` — wipe enrollments table  
- `get_users.ts` — print all users to stdout  



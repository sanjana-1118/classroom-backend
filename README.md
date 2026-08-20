# Classroom — Backend API

Express 5 REST API for the Classroom Management platform, written in TypeScript and deployed on Railway.

## Tech Stack

- **Express 5** — HTTP server and router
- **TypeScript 5.9** — static typing throughout
- **Drizzle ORM** — type-safe schema definitions and query builder
- **Neon** — serverless PostgreSQL accessed over HTTP
- **Better Auth** — cookie-based sessions, email/password auth, and custom role fields
- **Arcjet** — rate limiting, bot detection, and WAF shield (production only)
- **tsx** — TypeScript execution for the dev server and utility scripts
- **drizzle-kit** — migration generation and deployment

## Project Structure

```
src/
├── config/        Arcjet client setup
├── db/            Database connection (Neon + Drizzle)
├── lib/           Better Auth instance and configuration
├── middleware/    Auth guards (requireAuth, requireRole) and Arcjet security
├── routes/        One file per resource
├── schema/        Database table definitions (app.ts and auth.ts)
└── index.ts       App entry point, middleware registration, route mounting
```

## Database

The app has 8 tables split across two schema files.

**Application tables** (`schema/app.ts`):
- `departments` — academic departments, parent of subjects
- `subjects` — belong to a department, parent of classes
- `classes` — class instances with a teacher, subject, capacity, status, JSONB schedules, and banner
- `enrollments` — links a student to a class, unique on `(studentId, classId)`
- `announcements` — messages posted to a class by teachers or admins

**Auth tables** (`schema/auth.ts`, managed by Better Auth):
- `user` — id, name, email, role (student/teacher/admin), image fields
- `session` — active sessions with token, expiry, IP, and user agent
- `account` — auth provider records and hashed passwords
- `verification` — email verification tokens

## API Routes

All routes are under `/api`. Every route except `/api/auth/*` requires authentication.

**Auth** (public)
- `POST /api/auth/sign-up/email` — register as student or teacher
- `POST /api/auth/sign-in/email` — sign in, receive session cookie
- `POST /api/auth/sign-out` — invalidate session
- `GET  /api/auth/get-session` — get current user and session

**Profile** — any authenticated user
- `GET /api/profile` — returns the current user's record

**Stats** — admin and teacher
- `GET /api/stats` — aggregate counts for subjects, classes, enrollments, students, teachers

**Departments** — admin and teacher
- `GET/POST /api/departments` — list (with `?search=`, `?page=`, `?limit=`) / create
- `GET/PATCH/DELETE /api/departments/:id` — read / update / delete

**Subjects** — admin and teacher
- `GET/POST /api/subjects` — list (with `?search=`, `?department=`) / create
- `GET/PATCH/DELETE /api/subjects/:id` — read / update / delete

**Classes** — GET is open to all (scoped by role), mutations require admin or teacher
- `GET/POST /api/classes` — list / create
- `GET/PATCH/DELETE /api/classes/:id` — read / update / delete
- `GET /api/classes/:id/users?role=student|teacher` — users in a class

**Enrollments**
- `GET /api/enrollments` — list, scoped by role (students see own only)
- `POST /api/enrollments` — enroll a student, capacity enforced
- `DELETE /api/enrollments/:id` — remove enrollment (admin/teacher only)

**Announcements**
- `GET /api/announcements` — list for accessible classes
- `POST /api/announcements` — post (admin/teacher only)
- `PATCH/DELETE /api/announcements/:id` — edit/delete (admin/teacher only)

**Timetable** — any authenticated user
- `GET /api/timetable` — all class schedules scoped by role

**Users** — admin only
- `GET /api/users` — all users with `?search=` and `?role=` filters

**Students** — admin and teacher
- `GET /api/students` — student-only user list used by enrollment dropdowns

## Authorization

There are three roles: `student`, `teacher`, and `admin`.

Admin accounts cannot be created through the registration form — a database hook blocks it. Admins are created via the `scripts/create_admin.ts` script only.

Authorization is enforced at three levels:
- **Route level** — `requireRole()` middleware blocks the wrong roles entirely
- **Method level** — `requireRoleForMethods()` allows GET for all but restricts mutations
- **Row level** — handlers filter results by the current user's ID and role

## Security

Arcjet runs in production only. In development it is bypassed so local testing is never blocked.

- Rate limiting (sliding window per minute): guests get 5 requests, students and teachers get 10, admins get 20
- Bot detection blocks automated clients with 403
- WAF shield blocks requests matching known attack signatures

## Environment Variables

```
DATABASE_URL          Neon PostgreSQL connection string
BETTER_AUTH_SECRET    Random secret, minimum 32 characters
BETTER_AUTH_URL       Public URL of this backend
FRONTEND_URL          Public URL of the frontend (used for CORS)
ARCJET_KEY            Arcjet API key (production only)
PORT                  Server port, defaults to 8080
```

## Scripts

```bash
npm run dev          # Dev server with auto-reload
npm run build        # Compile TypeScript to dist/
npm run start        # Run compiled output
npm run db:generate  # Generate migration files from schema changes
npm run db:migrate   # Apply migrations to Neon
npm run db:seed      # Seed the database
```

Utility scripts in `scripts/` can be run with `npx tsx scripts/<name>.ts`:

- `create_admin.ts` — create an admin account
- `promote_admin.ts` — promote an existing user to admin
- `reset_admin.ts` — reset an admin password
- `seed_student.ts` — create test student accounts
- `seed_enrollment.ts` — enroll test students into classes
- `clear_enrollments.ts` — wipe the enrollments table
- `get_users.ts` — print all users to stdout

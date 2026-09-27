# Beyond the Resume — Project Showcase

A full-stack module that lets developers showcase real, verifiable technical work — imported from GitHub, uploaded from their computer, or built in an in-browser editor — instead of just listing projects on a resume.

```
beyond-the-resume/
│
├── frontend/
│   ├── project.html
│   ├── project.css
│   └── project.js
├── index.html         Sign in / create account entry page
├── style.css          Authentication page styles
├── script.js          Authentication page controller
│
├── backend/
│   ├── server.js
│   ├── seed.js
│   ├── package.json
│   ├── .env.example
│   ├── config/db.js
│   ├── models/        User.js, Project.js, Feedback.js, Comment.js
│   ├── routes/         authRoutes.js, projectRoutes.js, githubRoutes.js, feedbackRoutes.js, commentRoutes.js
│   ├── controllers/    authController.js, projectController.js, githubController.js, feedbackController.js, commentController.js
│   ├── services/       githubService.js, codeAnalysisService.js, aiService.js
│   └── uploads/        temporary storage for uploaded files (auto-cleared)
│
└── README.md
```

## Requirements

- Node.js (v18+)
- MongoDB (local install, or a free MongoDB Atlas cluster)
- Git (optional, only needed if you clone this as a repo)

## Installation

```bash
cd backend
npm install
```

## Environment variables

Copy `backend/.env.example` to `backend/.env` and fill in real values:

```
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/beyond-the-resume
JWT_SECRET=replace-with-a-long-random-secret
AI_API_KEY=
GITHUB_TOKEN=
```

- **MONGODB_URI** — required. A local MongoDB URI or an Atlas connection string.
- **JWT_SECRET** — required for signup/login and protected write actions. Set a private, random value of at least 32 bytes.
- **AI_API_KEY** — optional. If set, the AI analysis endpoint calls the Anthropic API for real AI-generated analysis. If left blank, the app automatically uses a deterministic fallback analysis built from detected languages/technologies, so the app still works fully without it.
- **GITHUB_TOKEN** — optional. Raises GitHub API rate limits and allows access to repos the token can see. Create one at https://github.com/settings/tokens.

`.env` is never read by the frontend and is excluded from anything sent to the browser — all three secrets stay server-side only.

## Demo sign up and sign in

Open the root `index.html` using a static server or directly in your browser. The demo sign-up and sign-in forms work without MongoDB or the backend; any valid email and non-empty password can enter the dashboard. Signup profiles store only a display name and email in browser local storage. Passwords are not sent or saved, and accounts are not verified. This is a UI demo, not real authentication.

The dashboard opens after either form succeeds. Backend-powered project saving, GitHub analysis, comments, and feedback are unavailable in this frontend-only demo; those features require the separately configured backend below. To switch back to real authentication, restore the API-based frontend flow and configure `JWT_SECRET` in `backend/.env`.

## Run the backend

```bash
cd backend
npm run dev      # starts with nodemon (auto-restart on changes)
# or
npm start        # plain node
```

You should see:

```
MongoDB connected
Server running on http://localhost:5000
```

### Optional: seed a demo project

If you want the app to show an example project right away instead of an empty state:

```bash
npm run seed
```

This inserts one demo project ("AI Resume Analyzer") if the database is currently empty.

## Run the frontend

The frontend is plain HTML/CSS/JS with no build step. Because it makes `fetch()` calls to `http://localhost:5000`, opening `frontend/project.html` directly as a `file://` URL works in most browsers, but if you run into CORS or fetch restrictions, serve it with a simple local server instead:

```bash
cd frontend
npx serve .
# or
python3 -m http.server 8080
```

Then open the printed local URL (e.g. `http://localhost:8080/project.html`) in your browser. The backend must be running separately on port 5000 (or whatever `PORT` you set).

If your backend runs on a different port/host, update `API_BASE_URL` at the top of `frontend/project.js`.

## How large projects are handled

MongoDB documents are capped at 16MB, and storing entire repositories as raw text doesn't scale well. This prototype keeps things bounded by:

- Limiting each project to at most **40–60 files**.
- Truncating each file's stored content to **8,000 characters**.
- Ignoring `node_modules`, `.git`, `.env`, `dist`, `build`, `__pycache__`, and similar directories entirely.
- Blocking known binary/executable extensions (`.exe`, `.dll`, `.sh`, `.bat`, etc.) from being stored or analyzed.
- Sending at most ~12,000 characters of code to the AI service per analysis call, regardless of project size.

In a production system, full file contents would be stored in object storage (S3/GCS) with only a reference saved in MongoDB, rather than embedding file content directly in the document.

## Security notes

- `helmet`, `cors`, and JSON body size limits (`1mb`) are applied globally.
- `multer` enforces a 2MB-per-file / 200-file upload limit; uploaded files are read once, then deleted from disk immediately.
- Upload and AI/GitHub-analysis endpoints have a stricter rate limit (20 requests / 15 minutes) than the rest of the API (300 requests / 15 minutes).
- Ratings and comment/feedback input are validated on the backend (not just the frontend).
- The AI's JSON response is parsed and validated field-by-field before being trusted or saved — malformed or unexpected output falls back to the deterministic analysis instead.
- Uploaded code is never executed, `eval()`'d, or run on the server. The only place any project code "runs" is inside a **sandboxed** (`sandbox="allow-scripts"`) iframe in the user's own browser, for the in-platform editor's live preview.
- `.env`, `AI_API_KEY`, `GITHUB_TOKEN`, and `MONGODB_URI` are never sent to or read by the frontend.

## "Verification" wording

Because this prototype has no independent verification mechanism (no OAuth-linked GitHub identity check, no code execution/test verification, etc.), the UI deliberately uses **"Source Available"** and **"Files Analyzed"** rather than claiming a project is independently verified. "Project Submitted" reflects only that a developer submitted it — not that a third party confirmed its accuracy.

## API documentation

All responses are JSON, shaped as `{ success: boolean, ...data }` on success or `{ success: false, message: string }` on failure.

### Projects

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/projects` | List recent projects (file contents omitted for brevity). |
| GET | `/api/projects/:id` | Get one project, including its files. |
| POST | `/api/projects` | Create a project from the in-platform editor. Body: `{ name, description, files: [{ name, content }] }`. |
| PUT | `/api/projects/:id` | Update a project's name/description. |
| DELETE | `/api/projects/:id` | Delete a project. |
| POST | `/api/projects/upload` | Upload a local folder. `multipart/form-data` with a `files` field (multiple) plus optional `name`. |
| POST | `/api/projects/:id/analyze` | Run (or re-run) AI analysis on a saved project. |
| POST | `/api/projects/:id/view` | Increment the view counter (frontend calls this at most once per session per project). |

### Authentication

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/signup` | Create account. Body: `{ name, email, password }`; returns `{ token, user }`. |
| POST | `/api/auth/login` | Sign in. Body: `{ email, password }`; returns `{ token, user }`. |

Send the returned token on protected requests as `Authorization: Bearer <token>`.

### GitHub

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/github/analyze` | Import + analyze a public (or token-accessible) GitHub repo. Body: `{ repositoryUrl }`. |

### Feedback

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/projects/:id/feedback` | Submit feedback. Body: `{ userName, userRole, rating (1-5), comment }`. |
| GET | `/api/projects/:id/feedback` | List feedback for a project, newest first. |

### Comments

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/projects/:id/comments` | Post a comment. Body: `{ userName, content }`. |
| GET | `/api/projects/:id/comments` | List comments for a project, newest first. |
| POST | `/api/projects/:id/comments/:commentId/like` | Increment a comment's like count. |

### Health check

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Returns `{ success: true, message: "Beyond the Resume API is running." }`. |

## Known limitations of this prototype

- "Reply" on comments is intentionally left minimal per the brief (not built as a full nested-thread feature).
- The GitHub importer fetches a bounded set of "important" files (manifests, entry points, README) rather than the entire repository, to keep requests fast and AI usage cost-bounded.
- Local uploads read file contents in the browser via `webkitdirectory`, which is supported in Chromium-based browsers and Firefox but not universally standardized.

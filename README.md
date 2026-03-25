# Study Planner Pro

Full-stack web application for planning study tasks and exams.

## Screenshot
![Study Planner App](./study-planner-screenshot.jpg)

## What's Included
This version extends the basic MVP into a stronger internship and portfolio project:

- User login / registration
- Backend API (Node.js + Express)
- Database (SQLite)
- Add and delete tasks/exams
- Mark tasks as completed
- Filter by subjects
- Monthly exam calendar
- Modern professional UI

## Tech Stack
- Frontend: HTML, CSS, JavaScript (Vanilla)
- Backend: Node.js, Express
- Database: SQLite (sqlite3)
- Auth security: bcryptjs, express-session

## API Routes

### Auth
- POST /api/auth/register - Register a new user
- POST /api/auth/login - Log in user and create session
- POST /api/auth/logout - Log out user and destroy session
- GET /api/auth/me - Get currently authenticated user

### Tasks and Data
- GET /api/tasks - Get all user tasks (optional `?subject=...` filter)
- POST /api/tasks - Create a new task/exam item
- PATCH /api/tasks/:id - Update task completion status
- DELETE /api/tasks/:id - Delete a task by ID
- GET /api/subjects - Get distinct subjects for the logged-in user
- GET /api/exams-calendar?month=YYYY-MM - Get monthly exam calendar entries

## Architecture
Frontend (HTML, CSS, JavaScript) communicates with an Express backend through a REST API.
The backend handles authentication, sessions, and database operations using SQLite.
Passwords are hashed with bcryptjs before being stored.

Request flow overview:
- Browser (public/index.html + public/script.js) sends JSON requests to API routes.
- Express server validates input, checks session/auth state, and executes SQL queries.
- SQLite returns user/task data through a small data access layer.
- API responds with consistent JSON success/error format.

Backend structure:
- server.js: app bootstrap, REST routes, DB initialization
- middleware/requireAuth.js: reusable session auth guard
- middleware/errorHandler.js: async wrapper + centralized 500 error responses

## Why SQLite
- Lightweight and file-based, ideal for internship/demo deployment and quick onboarding.
- Zero external DB setup required, so the project runs locally with minimal friction.
- SQL schema + indexes are explicit and easy to discuss in interviews.
- Easy migration path later to PostgreSQL/MySQL if scale requirements grow.

## Security and Validation Notes
- Passwords are hashed using bcryptjs before storing.
- Session cookies use httpOnly and sameSite protections.
- Input validation checks required fields, email format, and password length.
- API uses centralized internal error responses to avoid leaking stack details.

## What I Would Improve Next
- Split API into routes/controllers/services for larger-team maintainability.
- Add request validation middleware (Joi/Zod/express-validator) for reusable schemas.
- Add automated tests (auth flow + task CRUD + edge cases).
- Add rate limiting and account lockout strategy for brute-force protection.
- Add CI pipeline and environment-specific config for production deployment.

## Run the Project
1. Clone the repository:
	```bash
	git clone https://github.com/KristinaDoslov/StudyPlanner.git
	cd StudyPlanner
	```

2. Install dependencies:
	```bash
	npm install
	```

3. Start the server:
	```bash
	npm start
	```

4. Open the app:
	- http://localhost:3000

## Project Structure
- public/index.html - UI layout
- public/styles.css - complete styling
- public/script.js - frontend logic and API integration
- server.js - Express server + auth + task API
- database/database.db - SQLite database (created automatically on startup)

## Author
Kristina Došlov

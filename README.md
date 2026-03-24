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

# CodeDock

CodeDock is a real-time technical interview platform where interviewers and candidates collaborate in a shared coding environment. Users can create private rooms, edit code together, chat in real time, and execute Python code in a secure Docker sandbox.

## Tech Stack
- Next.js
- Tailwind CSS
- TypeScript
- Express
- Socket.io
- MongoDB
- Docker

## Monorepo Structure

- `apps/web` -> Next.js frontend
- `apps/server` -> API + Socket.io server
- `apps/runner` -> Docker execution service
- `packages/shared` -> shared TypeScript types

## Prerequisites

Before locally running the project, make sure you have:

- Docker Desktop installed and running
- Node.js installed locally if you want to run without Docker Compose
- npm installed

The runner service uses Docker to execute submitted Python code inside isolated containers, so Docker must be running.

## Environment Variables

The required `.env` files are included in the submission. Example environment files are also provided to show the required variables for each service.

## Deployed Demo

A live demo of CodeDock is currently deployed on DigitalOcean: http://143.198.161.125:3000

This deployment is intended for course grading/demo purposes only and will be taken down after the class ends on May 18, 2026.

## Quick Start with Docker Compose

From the project root, run:
```bash
docker compose up
```
This starts the frontend, backend server, runner service, and MongoDB.

## Seeding
Make sure the app is running (via docker compose) and then, from the project root in another terminal, run: 
```bash
docker compose exec server npm run seed -w apps/server
```

This adds the following user:

Username: seed_user

Email: seed@codedock.dev

Password: seedpass123

## Local Development without Docker Compose

Run: 
```bash
npm install
```

Start MongoDB. 

Start the following services in **three** separate terminals at the project root folder.

### Web Frontend (http://localhost:3000)
```bash
npm run dev:web
```

### Server (http://localhost:4000)
```bash
npm run dev:server
```

### Runner Service (http://localhost:5000)
```bash
npm run dev:runner
```

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

## Quick Start with Docker Compose

From the project root, run:

```bash
docker compose up
```

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

### Runner Service (http://localhost:5001)
```bash
npm run dev:runner
```

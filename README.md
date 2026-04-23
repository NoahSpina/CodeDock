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
- apps/web -> Next.js frontend
- apps/server -> API + Socket.io server
- apps/runner -> Docker execution service
- packages/shared -> shared TypeScript types

## Quick Start (Local)
1. Install dependencies:
   - `npm install`
2. Copy environment templates:
   - `cp apps/web/.env.example apps/web/.env.local`
   - `cp apps/server/.env.example apps/server/.env`
   - `cp apps/runner/.env.example apps/runner/.env`
3. Run services in separate terminals:
   - `npm run dev:web`
   - `npm run dev:server`
   - `npm run dev:runner`

## Quick Start (Docker Compose)
- Run all services (web, server, runner, mongo):
  - `docker compose up --build`
- Stop services:
  - `docker compose down`

## Environment Files
- `apps/web/.env.example`
- `apps/server/.env.example`
- `apps/runner/.env.example`

## Initial Scope
- Authentication
- Room creation / joining
- Real-time editor
- Real-time chat
- Python execution
- Session history
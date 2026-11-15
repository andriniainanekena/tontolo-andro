<div align="center">

# Tontolo andro

**Plan your day with routines, focus timers, and a simple progress dashboard.**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-149ECA?style=for-the-badge&logo=react&logoColor=white)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vite.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)

</div>

---


## Description

**Tontolo andro** is a daily activity tracker that brings planning, task management, and time tracking into one place. Build better habits, stay focused, and see at a glance how your day is structured.


## Features

- **Daily planning**: organize your activities and routines
- **Task categories**: sort tasks by category and activity type
- **Focus & break timers**: stay productive with built-in work sessions
- **Dashboard**: review your progress with a simple overview
- **Responsive design**: works on both desktop and mobile
- **Light & dark mode**: pick the theme that suits you


## Built With

| Layer    | Technologies                          |
| -------- | ------------------------------------- |
| Frontend | React, TypeScript, Vite, Tailwind CSS |
| Backend  | Node.js, [Express, TypeScript         |
| Database | PostgreSQL                            |
| Mobile   | Android project files                 |


## Project Structure

```text
tontolo-andro/
├── android/     # Android project files
├── client/      # React frontend
├── database/    # SQL schema
└── server/      # Express backend
```

## Prerequisites

Make sure you have the following installed:

- Node.js 20 or later
- npm
- PostgreSQL

## Installation

**1. Clone the repository**

```bash
git clone https://github.com/andriniainanekena/tontolo-andro.git
cd tontolo-andro
```

**2. Create the database**

```bash
createdb planner
psql -d planner -f database/schema.sql
```

**3. Configure and start the backend**

```bash
cd server
cp .env.example .env
npm install
npm run dev
```

Then update `server/.env` with your own values:

```env
DATABASE_URL=postgres://postgres:postgres@localhost:5432/planner
JWT_SECRET=a-long-random-secret
PORT=4000
CLIENT_URL=http://localhost:5173
NODE_ENV=development
```

**4. Start the frontend**

In a new terminal:

```bash
cd client
npm install
npm run dev
```

Open **http://localhost:5173** in your browser.

# Workspace

**Workspace** is a collaborative project management application designed to help individuals and teams organize projects, manage tasks, and track progress in one place.

The application provides a centralized workspace where users can create or join teams, collaborate on projects, assign tasks, monitor deadlines, and communicate through comments and activity logs.

Workspace is built with **React** and **Vite** on the front-end, **Supabase** for authentication, database management, and real-time functionality, and **Vercel** for deployment.

## Features

- **Team Management:** Create teams, join existing teams using unique team codes, and manage team memberships.
- **Project Management:** Create and organize projects within teams.
- **Task Management:** Create, edit, assign, and delete tasks, with support for statuses, priorities, and deadlines.
- **Collaboration:** Assign tasks to team members and communicate through task comments and activity logs.
- **Real-Time Updates:** Receive updates and notifications through Supabase Realtime.
- **Progress Tracking:** View task statistics, including completed, upcoming, and overdue tasks.
- **Guest Authentication:** Get started using anonymous authentication without creating a traditional account.

## Tech Stack

| Technology | Purpose |
|---|---|
| React | Front-end user interface |
| Vite | Development server and build tool |
| JavaScript | Application logic |
| Supabase | PostgreSQL database, authentication, and real-time updates |
| React Router | Client-side routing |
| Lucide React | Icons |
| Motion | UI animations |
| Vercel | Hosting and deployment |

## Getting Started

Follow these instructions to run Workspace locally.

### Prerequisites

Make sure you have the following installed:

- [Node.js](https://nodejs.org/) — a version compatible with Vite 8
- npm (included with Node.js)
- [Git](https://git-scm.com/)

You will also need access to a configured Supabase project.

### 1. Clone the Repository

Open a terminal and run:

```bash
git clone https://github.com/Shan-234/workspace-app.git
```

Navigate into the project directory:

```bash
cd workspace-app
```

### 2. Install Dependencies

Install the project's dependencies using npm:

```bash
npm install
```

### 3. Configure Environment Variables

Workspace uses Supabase for its back-end functionality.

Create a `.env` file in the root directory of the project:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
```

Replace the placeholder values with the URL and publishable key from your Supabase project.

You can find these values in your Supabase project's dashboard under its API settings.

**Note:** The environment variables alone do not create the database schema, authentication configuration, or security policies required by the application. Your Supabase project must already have the necessary tables, functions, Realtime configuration, and Row Level Security policies.

Never place a Supabase service-role or secret key in a `VITE_` environment variable.

### 4. Start the Development Server

Run:

```bash
npm run dev
```

Vite will start a local development server. Open the URL displayed in your terminal, typically:

```text
http://localhost:5173
```

You can now access Workspace in your browser.

## Available Commands

| Command | Description |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Create a production build |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run Oxlint |

## Deployment

Workspace is deployed using Vercel.

**Live Application:** [https://workspace-app-olive.vercel.app](https://workspace-app-olive.vercel.app)

To deploy your own instance, configure the Supabase environment variables in your hosting provider and build the application using:

```bash
npm run build
```

The production files will be generated in the `dist` directory.

For client-side routing on Vercel, the repository includes a `vercel.json` configuration.

## Repository

**GitHub:** [Shan-234/workspace-app](https://github.com/Shan-234/workspace-app)

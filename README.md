# GitMarkDownload - GitHub Markdown Editor

## Overview

GitMarkDownload is a web application that provides a GitHub-integrated markdown editor with real-time preview functionality. Users can authenticate with GitHub, browse their repositories, and edit markdown files with a side-by-side editor and preview interface.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

- **Framework**: React with TypeScript
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack Query for server state management
- **UI Components**: Radix UI with shadcn/ui component library
- **Styling**: Tailwind CSS with custom GitHub-inspired design tokens
- **Build Tool**: Vite for development and building

### Backend Architecture

- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **Authentication**: GitHub OAuth flow
- **Session Management**: Express sessions

### Key Design Decisions

**Monorepo Structure**: The application uses a shared codebase approach with:

- `client/` - React frontend
- `server/` - Express backend
- `shared/` - Common TypeScript types and database schema

**Authentication Flow**: Implements GitHub OAuth to access user repositories and maintain user sessions.

**State Management**: TanStack Query handles all server state, caching, and synchronization between client and server.

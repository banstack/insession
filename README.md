# InSession

## Background
InSession is a session based productivity tool to help you keep track and stay on top of your **productivity sessions**. 

## Key Features
1. **Session Creation:** users can create sessions containing **activites** which can later
2. **Track activites:** users can retroactively view their holistic productivity by mapping lables to certain activites
3. **Multitasking Support:** users can click around without interrupting their sessions, MiniPlayer allows you to visit all parts of our website without skipping  a beat in your current session.

## Getting Started

### Prerequisties
- Node.js 20+


### 1. Run backend service (Node + Prisma)
InSession is written in TypeScript utilizing Primsa's ORM (Object Relational Mapper) to easily perform actions on its PostgreSQL
```bash
# at project root
npm run dev
```

### 2. Run frontend (React + Vite)
```bash
cd /frontend
npm run dev
```

### 2. To run Primsa Studio
A feature built into the prisma library that allows you to explore and manipulate your projects data.
- Perform SQL Queries
- Add and delete records at the ease of a click
```bash
npm run db:studio
```


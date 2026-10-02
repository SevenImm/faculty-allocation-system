# Faculty Allocation System — Developer Setup

This guide explains how to set up the Faculty Allocation System after cloning the GitHub repository.

## 1. Required Software

Install the following before setting up the project:

- Git
- Node.js and npm
- PostgreSQL
- Visual Studio Code or another code editor

The project currently uses:

- Next.js
- React
- TypeScript
- PostgreSQL
- Prisma ORM

---

## 2. Clone the Repository

Clone the repository and enter the project folder:

```bash
git clone <REPOSITORY-URL>
cd faculty-allocation-system
```

If you already cloned the repository:

```bash
git pull
```

---

## 3. Install Node Dependencies

Run:

```bash
npm install
```

This installs all dependencies listed in `package.json`.

Do not manually copy `node_modules` from another team member.

---

## 4. Create the PostgreSQL Database

Make sure PostgreSQL is running.

Open PostgreSQL:

```bash
psql -U postgres
```

Create the development database:

```sql
CREATE DATABASE faculty_allocation;
```

Exit PostgreSQL:

```sql
\q
```

Each developer can use their own local PostgreSQL installation.

The database itself is NOT stored in GitHub.

---

## 5. Configure the Environment File

The `.env` file contains private database credentials and is intentionally excluded from GitHub.

Create a `.env` file in the project root.

Add:

```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/faculty_allocation"
```

Replace `YOUR_PASSWORD` with your own local PostgreSQL password.

IMPORTANT:

- Never commit `.env`.
- Never send your PostgreSQL password through GitHub.
- Each developer should create their own `.env`.
- Special characters in passwords may need URL encoding.

---

## 6. Apply the Prisma Database Structure

This project currently uses the Prisma 8 ORM workflow.

The Prisma schema is located at:

```text
prisma/schema.prisma
```

Generate the current Prisma contract:

```bash
npx prisma contract emit
```

Preview the database changes:

```bash
npx prisma db update --dry-run
```

If the preview looks correct, apply them:

```bash
npx prisma db update
```

Do not use commands from older Prisma tutorials without checking whether they apply to the version used by this project.

---

## 7. Seed Initial Departments

Run:

```bash
npx tsx seed.ts
```

This adds the initial academic departments required by the application.

The seed uses conflict skipping, so running it again should not create duplicate department names.

---

## 8. Start the Development Server

Run:

```bash
npm run dev
```

Then open:

```text
http://localhost:3000
```

The main admin dashboard is:

```text
http://localhost:3000/admin
```

---

## 9. Current Admin Features

The current implementation supports:

- Viewing faculty members
- Adding faculty members
- Viewing offices/cubicles
- Adding offices/cubicles
- Assigning an available office to a faculty member
- Preventing occupied offices from appearing in the normal assignment form
- Preventing already-assigned faculty from appearing in the normal assignment form
- Viewing current faculty office assignments
- Deallocating an office
- Preserving allocation history using `assignedAt` and `endedAt`

An allocation is considered active when:

```text
endedAt = null
```

Deallocating an office sets `endedAt` instead of deleting the Allocation record.

---

## 10. Important Database Design

The main database models are:

```text
Department
    |
    └── Faculty
            |
            └── Allocation
                    |
                    └── Office
```

`Allocation` connects a faculty member with an office.

A faculty member and office can have multiple Allocation records over time because previous assignments are preserved as history.

Office availability is NOT stored as a separate `isAvailable` Boolean.

Instead:

```text
Active Allocation exists → Office is occupied

No Active Allocation → Office is available
```

This prevents availability from being stored in two different places.

---

## 11. Future Recommendation System

The project is intended to recommend office spaces using factors such as:

- Faculty tenure status
- Faculty rank
- Department/building
- Office vs. cubicle
- Window availability

The official department-to-building mappings have not yet been confirmed, so do not invent these mappings.

The exact recommendation/scoring rules are also still under development.

---

## 12. Before Pushing Changes

Check your files:

```bash
git status
```

Make sure `.env` is NOT staged.

Stage changes:

```bash
git add .
```

Check again:

```bash
git status
```

Check that database credentials were not accidentally staged:

```bash
git grep --cached -n "postgresql://"
```

Then commit and push:

```bash
git commit -m "Describe your changes"
git push
```

---

## 13. Verify the Project Before Handoff

Run:

```bash
npm run build
```

A successful production build is the best quick check that the project compiles and passes its TypeScript checks.

---

## Notes for Team Members

If the website starts but database operations fail, first check:

1. PostgreSQL is running.
2. `faculty_allocation` exists.
3. `.env` exists.
4. `DATABASE_URL` contains your own PostgreSQL credentials.
5. The Prisma database structure has been applied.
6. The department seed has been run.

Do not commit passwords, `.env`, or other private credentials.
# Context

Repo: itamarhanan/lumen
Project: Custom Events Dashboard Redesign (Session 9)

Issue #21 (Event Type Catalog) is already implemented — verify nothing is missing before moving on.

Remaining open issues labelled "ready-for-agent":
- #24: Events: Chart + Filter + Drawer Enhancements
- #23: Events: Event Definitions (Declarative Property Schema)
- #22: Events: Person Detail Page (PostHog-style visitor drill-down)

# Task

Work through all open issues with the "ready-for-agent" label. For each issue:

1. Read the issue body and comments to understand requirements.
2. Create a branch named `sandcastle/<issue-number>-<kebab-case-title>`.
3. Implement the solution following the project's conventions:
   - TypeScript, tRPC, Next.js App Router, React Query, Tailwind CSS v4, shadcn/ui
   - Run `npx tsc --noEmit` to verify types
   - Run `pnpm lint` to verify linting
4. Commit with conventional commit messages (e.g., `feat(events): add person detail page`).
5. Push the branch.
6. Create a draft PR with the issue number in the description (e.g., `Closes #22`).
7. Move to the next issue.

Skip any issue that is already assigned or has an open PR. If an issue is blocked or can't be completed, leave a comment explaining why.

# Done

When all ready-for-agent issues are resolved or blocked, output `<promise>COMPLETE</promise>`.

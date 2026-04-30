<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:subagent-model-rules -->
# Subagent model policy

When spawning subagents, use only one of these configurations:

- `gpt-5.4` with reasoning effort `medium`
- `gpt-5.5` with reasoning effort `low`

Never spawn a `gpt-5.5` subagent with reasoning effort `medium`.
<!-- END:subagent-model-rules -->

<!-- convex-ai-start -->
This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read `convex/_generated/ai/guidelines.md` first** for important guidelines on how to correctly use Convex APIs and patterns. The file contains rules that override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running `pnpm dlx convex ai-files install`.

Use `pnpm` for all package management. Never use `npm install`, `npm run`, or `npx` — use `pnpm add`, `pnpm <script>`, and `pnpm dlx` respectively.
<!-- convex-ai-end -->

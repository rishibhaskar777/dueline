# 0005. Toolchain versions

## Status

Accepted.

## Context

Some tools in the stack support only certain versions of others. Upgrading one major version can
break linting or the build.

## Decision

- Node.js 24 LTS. Node 20 is end of life, and Vitest 5 needs Node 22.12 or newer.
- TypeScript 5.9. typescript-eslint supports TypeScript below 6.1 only, so we stay on 5.x.
- ESLint 9. `eslint-plugin-react` does not support ESLint 10 yet, so we stay on 9.x.
- Next.js 16 with Cache Components turned on. Route handlers are dynamic by default, so routes never
  set segment config such as `dynamic` or `revalidate`.

Dependabot ignores major updates for `typescript` and `eslint`.

## Consequences

The toolchain is stable and lints cleanly. We must revisit TypeScript and ESLint majors by hand when
typescript-eslint and eslint-plugin-react support them. Code follows Next.js 16 conventions, such as
async route params and `src/proxy.ts` instead of `middleware.ts`.

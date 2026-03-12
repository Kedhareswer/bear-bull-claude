# Flatten Repo Structure Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Move all Next.js app files from `app/` to the repo root, and reorganise non-app content into tidy top-level folders (`docs/`, `prototype/`, `scripts/`).

**Architecture:** Git mv everything from `app/` to root so history is preserved, remove the nested `app/.git`, update any internal path references if needed, and verify the dev server and tests still pass.

**Tech Stack:** Next.js 16, TypeScript, Vitest, bash/git

---

## Target Structure

```
claude-bull/
├── src/                    ← moved from app/src/
│   ├── app/
│   ├── components/
│   ├── lib/
│   └── store/
├── public/                 ← moved from app/public/
├── package.json            ← moved from app/package.json
├── package-lock.json
├── next.config.ts
├── tsconfig.json
├── tsconfig.tsbuildinfo
├── next-env.d.ts
├── eslint.config.mjs
├── postcss.config.mjs
├── components.json
├── vitest.config.ts
├── .env.example            ← moved from app/.env.example
├── .gitignore              ← merged from app/.gitignore
├── docs/
│   └── plans/
├── prototype/
│   ├── index.html
│   └── brand-kit.html
├── brand-kit.html
├── bearbull_guide_notes.md
├── IDEA_IMPLEMENTATION_PLAN.md
└── serve.py
```

---

### Task 1: Remove nested git repo

**Files:**
- Delete: `app/.git/` (entire directory)

**Step 1: Remove nested .git**

```bash
rm -rf app/.git
```

**Step 2: Verify it's gone**

```bash
ls app/.git 2>/dev/null && echo "STILL EXISTS" || echo "REMOVED"
```
Expected: `REMOVED`

**Step 3: Commit**

```bash
git add -A
git commit -m "chore: remove nested git repo from app/"
```

---

### Task 2: Move Next.js config and root files to repo root

**Files to move (from `app/` → root):**
- `app/package.json` → `package.json`
- `app/package-lock.json` → `package-lock.json`
- `app/next.config.ts` → `next.config.ts`
- `app/tsconfig.json` → `tsconfig.json`
- `app/tsconfig.tsbuildinfo` → `tsconfig.tsbuildinfo`
- `app/next-env.d.ts` → `next-env.d.ts`
- `app/eslint.config.mjs` → `eslint.config.mjs`
- `app/postcss.config.mjs` → `postcss.config.mjs`
- `app/components.json` → `components.json`
- `app/vitest.config.ts` → `vitest.config.ts`
- `app/.env.example` → `.env.example`
- `app/README.md` → `README.md`

**Step 1: Git-move each config file**

```bash
cd /c/Users/mbkhn/Downloads/Inspired/claude-bull

git mv app/package.json package.json
git mv app/package-lock.json package-lock.json
git mv app/next.config.ts next.config.ts
git mv app/tsconfig.json tsconfig.json
git mv app/next-env.d.ts next-env.d.ts
git mv app/eslint.config.mjs eslint.config.mjs
git mv app/postcss.config.mjs postcss.config.mjs
git mv app/components.json components.json
git mv app/vitest.config.ts vitest.config.ts
git mv app/.env.example .env.example
git mv app/README.md README.md
```

Note: `tsconfig.tsbuildinfo` is generated, just delete it — it will be regenerated:
```bash
rm app/tsconfig.tsbuildinfo
```

**Step 2: Commit**

```bash
git add -A
git commit -m "chore: move Next.js config files to repo root"
```

---

### Task 3: Move src/ and public/ to root

**Files:**
- `app/src/` → `src/`
- `app/public/` → `public/`

**Step 1: Git-move src and public**

```bash
git mv app/src src
git mv app/public public
```

**Step 2: Commit**

```bash
git add -A
git commit -m "chore: move src/ and public/ to repo root"
```

---

### Task 4: Merge .gitignore and remove app/ directory

The root `.gitignore` currently only has `.gitkeep`. We need to bring in `app/.gitignore`.

**Step 1: Inspect both gitignore files**

```bash
cat .gitignore
echo "---"
cat app/.gitignore
```

**Step 2: Replace root .gitignore with app's version**

Copy the content of `app/.gitignore` into the root `.gitignore`. Make sure `.next/` and `node_modules/` are present.

```bash
cp app/.gitignore .gitignore
```

**Step 3: Remove app/ (should be empty or near-empty now)**

```bash
ls app/
```

Remove any remaining generated/temp files not tracked by git:
```bash
rm -rf app/.next app/node_modules app/
```

**Step 4: Commit**

```bash
git add -A
git commit -m "chore: merge .gitignore and remove empty app/ directory"
```

---

### Task 5: Reinstall node_modules at root

Because `package.json` is now at root, we need a fresh install.

**Step 1: Install dependencies**

```bash
cd /c/Users/mbkhn/Downloads/Inspired/claude-bull
npm install
```

Expected: `node_modules/` created at root, `package-lock.json` updated.

**Step 2: Commit updated lock file if changed**

```bash
git add package-lock.json
git commit -m "chore: reinstall deps at repo root"
```

---

### Task 6: Verify everything works

**Step 1: Run tests**

```bash
npm test
```

Expected: All tests pass (same as before the move).

**Step 2: Verify dev server starts**

```bash
npm run dev &
sleep 5
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000
kill %1
```

Expected: `200`

**Step 3: Run build**

```bash
npm run build
```

Expected: Build completes without errors.

**Step 4: Commit if any auto-generated files changed**

```bash
git add -A
git status
# commit only if there are meaningful changes
```

---

### Task 7: Clean up loose root files

Move non-app files to tidy locations if not already there.

**Files:**
- `serve.py` — keep at root (handy script) or move to `scripts/serve.py`
- `.gitkeep` — delete (no longer needed)
- `.superpowers/`, `.playwright-mcp/` — already in `.gitignore` or add them

**Step 1: Remove .gitkeep**

```bash
rm .gitkeep
```

**Step 2: Add tool directories to .gitignore**

Open `.gitignore` and add:
```
.superpowers/
.playwright-mcp/
.claude/
```

**Step 3: Commit**

```bash
git add -A
git commit -m "chore: clean up root — remove .gitkeep, ignore tool dirs"
```

---

## Verification Checklist

After all tasks:

- [ ] `npm test` passes at root
- [ ] `npm run dev` starts successfully
- [ ] `npm run build` succeeds
- [ ] `app/` directory no longer exists
- [ ] `src/`, `public/`, `package.json` are at root
- [ ] `.env.example` is at root
- [ ] `docs/`, `prototype/` are organised at root
- [ ] No nested `.git` inside the repo

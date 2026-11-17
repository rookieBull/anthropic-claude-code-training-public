---
name: northwind-pr
description: Write a pull request description in the Northwind team's required format (title, What changed, How I verified it, Acceptance criteria, Deliberately not done) from the branch diff, git log and ticket. Use when the user invokes /northwind-pr or asks for a PR description in the team format. For the repo's Build Battle template, use /pr instead.
---

# /northwind-pr

Write the pull request description for the current branch in the Northwind team format. Every statement in it comes from something you read or ran in this session. Nothing comes from memory, intent, or what the work probably did.

## Usage

```
/northwind-pr
/northwind-pr NWP-101
```

If no ticket ID is given, take it from the branch name (`NWP-101-export-options` → `NWP-101`). If the branch name has no ticket ID and none was given, ask for it before going further.

## 1. Read before writing

Do all of these first. Write nothing until they are done.

1. **The ticket.** Read `docs/tickets/<TICKET-ID>.md` in full: description, acceptance criteria, notes, definition of done. If the file does not exist, stop and say so. Do not write criteria from memory.
2. **The commits.** Run `git log main..HEAD --format='%h %s'`. If `main` is behind the remote, run `git fetch origin main` and use `origin/main` instead.
3. **The diff.** Run `git diff main...HEAD --stat`, then read the diff itself. The description covers what is in the diff, nothing else.
4. **Uncommitted work.** Run `git status --short`. Uncommitted or untracked changes are not in the PR. List them for the user and leave them out of the description.
5. **The spec, if there is one.** Check `docs/specs/` for a file starting with the ticket ID. Use it to find what was planned and what was left out. Never use it as evidence that something was built.

## 2. Build the evidence list

The "How I verified it" section may only contain verification that actually happened. Before writing it, list every verification you can prove, and where its proof is:

- **A command you ran in this session**, with its output still in the conversation. Note which commit it ran against. A test run from before later commits does not verify the current `HEAD`. Say so, or run it again.
- **Output the user pasted** into the conversation, or something the user said they clicked and what they saw. Attribute it to them.
- **Nothing else.** Not what the spec planned to check. Not what "would pass". Not what a previous session did that isn't in this conversation.

If the diff changes application code and there is no test run against the current `HEAD`, run the project's tests now (for the merchant console: `npm test` in `build-battle/merchant-console`) and use that real output. If they fail, report the failure as it is.

Do not run anything with side effects to produce evidence: no deploys, no writes to remote services, no pushes. Browser checks count only if they were actually performed by you or the user.

## 3. Check each acceptance criterion

Go through the ticket's criteria one at a time. For each, find the code in the diff that meets it and the evidence that shows it works.

- **Met:** the code is in the diff and there is evidence it works. Tick it.
- **Partial:** some of it is there. Leave it unticked and say which part is done and which is not.
- **Not met:** nothing in the diff does it. Leave it unticked. Say "Not done" if that helps.
- **Built but not verified:** the code is there but nothing has proven it works. Leave it unticked and say "Implemented, not verified".

Never tick a box because it was planned or intended.

## 4. Write the description

Use exactly this format:

```markdown
<TICKET-ID>: <what it does>

## What changed

## How I verified it

## Acceptance criteria

## Deliberately not done
```

- **Title.** `<TICKET-ID>: <what it does>`, in the imperative and in plain language, for example `NWP-101: let ops choose export columns and scope`. Describe what the diff does, not what the ticket asked for. If the branch only holds a plan, the title says so.
- **What changed.** One paragraph in plain language: what someone using the app can do now that they could not before, and anything about how it works that a reviewer needs. No file lists; the diff already is one.
- **How I verified it.** Each item from the evidence list: the exact command in a code span, then the output that matters, quoted (for tests, the summary lines). For a manual check, what was clicked and what appeared, and who did it. If nothing was verified, write exactly `Nothing has been verified on this branch yet.` and nothing else.
- **Acceptance criteria.** The ticket's checkboxes, copied word for word, in the ticket's order, ticked per step 3. Put a short note after any box that is partial, built but not verified, or not met.
- **Deliberately not done.** Anything the ticket or spec marks out of scope, anything left for a follow-up (with its ticket ID if there is one), and known rough edges. Each item is one line with its reason. If there is nothing, write `Nothing.`

## 5. Hand it back

Write the description to a file in the scratchpad directory (or `/tmp` if there is none), print it, and give the user the file path.

Then list, briefly:
- any criteria left unticked, and why
- any uncommitted changes that were left out
- anything the user should verify before opening the PR, such as a browser check nobody has done

Do not open, push or edit a pull request. Offer to, and wait for the user to say yes.

## Rules

- **Never claim a verification step that was not run.** This is the rule the rest of the skill exists to protect. If in doubt, leave it out and tell the user.
- **The diff is the source of truth for what changed.** Commit messages, the spec and the conversation can be wrong about it.
- **Leave unknowns visible.** An unticked box with an honest note beats a ticked box that a reviewer disproves.
- **Plain language.** No emoji, no filler, no summary of the summary.

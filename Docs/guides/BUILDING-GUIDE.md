# Building Guide

> **How to work with Claude Code effectively.** From basic commands to advanced techniques that 10x your productivity.

---

## What is Claude Code?

Claude Code is an AI coding assistant that runs in your terminal. It can:
- Read and understand your entire codebase
- Write, edit, and delete files
- Run terminal commands
- Help you debug issues
- Execute your ZIPs step by step

Think of it as a senior developer sitting next to you, but one that never gets tired and has read every programming book ever written.

---

## Opening Your Project

### Method 1: VS Code Terminal

1. Open VS Code
2. Open your project folder (File → Open Folder)
3. Open terminal (`Ctrl+`` ` or View → Terminal)
4. Type `claude` and press Enter

### Method 2: System Terminal

1. Open Terminal (Mac) or Command Prompt/PowerShell (Windows)
2. Navigate to your project:
   ```bash
   cd /path/to/your/project
   ```
3. Type `claude` and press Enter

### Verifying You're in the Right Place

When Claude starts, it shows:
```
╭─────────────────────────────────────────╮
│ Claude Code                             │
│ Project: /Users/you/your-project        │  ← Should be your project path
╰─────────────────────────────────────────╯
```

If the project path is wrong, exit (`Ctrl+C`) and `cd` to the correct folder.

---

## The Two Modes

This is **critical**. Understanding when to use each mode is the difference between productive sessions and chaos.

### Plan Mode (Shift+Tab to toggle)

**What it is:** Claude thinks and discusses but makes NO changes to your code.

**Use Plan Mode when:**
- Starting a new ZIP (always!)
- Before any significant change
- When you're not sure about approach
- When something feels wrong
- When you need to understand what Claude is about to do
- After things break - to diagnose before fixing
- Reviewing what was built
- Discussing architecture or tradeoffs

**In Plan Mode, Claude:**
- Reads and analyzes code
- Explains what it would do
- Discusses tradeoffs
- Answers questions
- Does NOT create, edit, or delete files
- Does NOT run commands

**How to enter:** Press `Shift+Tab` or say "enter plan mode"

### Act Mode (Default)

**What it is:** Claude makes real changes - creates files, edits code, runs commands.

**Use Act Mode when:**
- You've already planned and understand the approach
- Claude has explained what it will do and you approve
- Executing well-defined tasks
- The path forward is clear

**In Act Mode, Claude:**
- Creates and edits files
- Runs terminal commands
- Makes real changes to your project
- Asks permission before destructive actions

### The Critical Rule

> **When things go sideways, IMMEDIATELY switch to Plan Mode.**

This is from Boris Cherny (creator of Claude Code). Don't keep pushing in Act Mode when something's broken. Stop, plan, then act.

**Signs you should switch to Plan Mode:**
- Claude made a mistake
- You're confused about what just happened
- The error message doesn't make sense
- Claude is about to do something you're not sure about
- You've been going in circles
- The approach isn't working

### The Plan-First Workflow

**Before every significant piece of work:**

```
1. Enter Plan Mode (Shift+Tab)
2. Say: "Let's build [feature]. What's your approach?"
3. Claude explains the plan
4. You ask questions, push back, refine
5. When satisfied: "That sounds good. Let's do it."
6. Exit Plan Mode (Shift+Tab)
7. Claude executes
```

**Example:**

```
You: [Plan Mode] I need to add a user settings page. What's your approach?

Claude: I'd create:
1. /app/settings/page.tsx - main settings page
2. /components/settings/ProfileForm.tsx - form component
3. /app/api/settings/route.ts - API endpoint
4. Database: add columns to users table for preferences

The form would have sections for:
- Profile info (name, avatar)
- Notification preferences
- Account settings (change password, delete account)

Should I proceed with this structure?

You: What about validation? And should the API be one route or multiple?

Claude: Good questions. For validation I'd use zod schemas...
[Discussion continues until plan is solid]

You: That makes sense. Let's do it.
[Exit Plan Mode, Claude executes]
```

### Verification in Plan Mode

Another powerful pattern: use Plan Mode for verification, not just planning.

```
You: [Plan Mode] Look at what you just built. Does it actually work? 
     Walk me through the data flow.

Claude: Let me trace through...
[Claude analyzes without changing anything]
[Might find issues before you even test]
```

### Common Mistakes

**❌ Wrong:** Staying in Act Mode when confused
```
Claude: *makes a change*
You: That's not right
Claude: *tries to fix it*
You: Still wrong
Claude: *tries again*
[Spiraling...]
```

**✅ Right:** Switching to Plan Mode to diagnose
```
Claude: *makes a change*
You: That's not right. [Shift+Tab - Plan Mode]
     Explain what you did and why.
Claude: I changed X because I thought Y...
You: Ah, the issue is actually Z. 
Claude: I see. The better approach would be...
You: Yes, do that. [Shift+Tab - Act Mode]
```

### Quick Reference

| Situation | Mode |
|-----------|------|
| Starting a ZIP | Plan first |
| About to make big change | Plan first |
| Something broke | Switch to Plan |
| Confused | Switch to Plan |
| Clear task, understood approach | Act |
| Executing agreed plan | Act |
| Quick fix you understand | Act |

---

## Basic Commands

### Starting the Onboarding

```
start
```
or
```
let's begin
```

Claude will read ONBOARDING.md and guide you through the planning process.

### Building a ZIP

```
Let's build ZIP-00
```
or
```
Start ZIP-00
```

Claude will:
1. Read the ZIP file
2. Confirm understanding
3. Start implementing
4. Update logs when complete

### Checking Progress

```
What's the status of the current ZIP?
```

```
What have we completed so far?
```

### Stopping Work

```
Let's stop here for now
```

Claude will summarize progress and note where to pick up.

---

## Giving Good Instructions

### Be Specific

```
❌ Bad:  "Make the button better"
✅ Good: "Change the submit button to be blue (#0066FF), 
         add rounded corners (8px), and add a hover effect 
         that slightly darkens the color"
```

### Provide Context

```
❌ Bad:  "Fix the bug"
✅ Good: "The login form submits but nothing happens. 
         No errors in console. The handleSubmit function 
         is in app/login/page.tsx"
```

### One Thing at a Time

```
❌ Bad:  "Add user profiles, settings page, notification 
         system, and also fix that bug from yesterday"
         
✅ Good: "Let's add user profiles first. After that's 
         working, we'll do settings."
```

### Reference Files When Needed

```
✅ Good: "In the UserCard component at /components/UserCard.tsx, 
         add a delete button that calls the deleteUser function 
         from /lib/users.ts"
```

---

## Powerful Prompts

These phrases get better results:

### After Implementation

```
Grill me on these changes and don't move on until I understand what you did
```
→ Claude explains the changes and quizzes you

```
Prove to me this works
```
→ Claude demonstrates the functionality, often by showing diffs or test outputs

### When It's Not Right

```
That's not quite right. The issue is [explain]. Try again.
```

```
Revert that change and let's try a different approach
```

```
Knowing everything you know now, scrap this and implement the elegant solution
```

### When You're Confused

```
Explain what you just did like I'm not a developer
```

```
Why did you do it this way instead of [alternative]?
```

```
Walk me through this file line by line
```

### For Quality

```
Red-team this implementation - what could go wrong?
```

```
Is there a simpler way to do this?
```

```
What would a senior developer criticize about this code?
```

### Self-Improvement

```
Update CLAUDE.md so you don't make that mistake again
```
→ Claude adds a rule to prevent the same error

---

## Using Screenshots

Claude can see images. This is incredibly useful for:
- Showing UI bugs ("This doesn't look right")
- Sharing error messages
- Showing what you want to replicate
- Design references

### How to Take Screenshots

**Windows:**
1. Press `Win + Shift + S`
2. Select the area
3. It's copied to clipboard
4. Paste directly into Claude Code (Ctrl+V)

**Mac:**
1. Press `Cmd + Shift + 4`
2. Select the area
3. Find screenshot on Desktop
4. Drag into Claude Code

### Good Screenshot Messages

```
[screenshot of error]
I'm getting this error when I click submit
```

```
[screenshot of UI]
The spacing is off here. The cards should have equal gaps.
```

```
[screenshot of design reference]
I want the header to look like this
```

---

## Handling Permissions

Claude will ask before:
- Creating new files
- Running terminal commands
- Making significant changes
- Deleting anything

### Auto-Accept (Use Carefully)

If you trust what Claude is doing:
```
Yes to all file changes
```

Or run with auto-accept flag:
```bash
claude --auto-accept
```

**Warning:** Only use auto-accept when you understand what's being built.

---

## Working with Multiple Files

### Telling Claude About Files

```
Look at /app/dashboard/page.tsx and /components/Card.tsx - 
they need to work together for the new feature
```

### Creating Related Files

```
Create a new component for user avatars. It should:
1. Go in /components/Avatar.tsx
2. Accept a user object as prop
3. Show initials if no image
4. Be used in the header and comments
```

### Refactoring Across Files

```
The formatDate function is duplicated in three files. 
Extract it to /lib/utils.ts and update all imports.
```

---

## The ZIP Workflow in Detail

### Before Starting a ZIP

1. **Check entry criteria:**
   ```
   Are all entry criteria for ZIP-03 met?
   ```

2. **Read the ZIP:**
   ```
   Read through ZIP-03 and confirm you understand what we're building
   ```

3. **Clarify if needed:**
   ```
   I have a question about requirement 2 - does that mean X or Y?
   ```

### During a ZIP

1. **Build in chunks:**
   - Don't try to do everything at once
   - Implement one requirement, test it, move to next

2. **Test as you go:**
   ```
   Let's test what we just built before moving on
   ```

3. **Update documentation:**
   - Claude should update IMPLEMENTATION-LOG.md
   - If it forgets, remind it:
     ```
     Update the implementation log with what we just built
     ```

### After Completing a ZIP

1. **Verify exit criteria:**
   ```
   Go through the exit criteria for ZIP-03 and verify each one
   ```

2. **Update technical fluency:**
   ```
   Update TECHNICAL-FLUENCY.md with what we learned in this ZIP
   ```

3. **Commit your work:**
   ```bash
   git add .
   git commit -m "Complete ZIP-03: [description]"
   ```

4. **Mark complete:**
   Update PROJECT-INFO.md status checkbox

---

## When Things Go Wrong

### Claude Made a Mistake

```
That's wrong because [reason]. Revert it and try again.
```

Or to prevent future mistakes:
```
That broke because [reason]. Update CLAUDE.md with a rule to prevent this.
```

### Claude is Confused

```
Stop. Let's reset.

Re-read:
1. CLAUDE.md
2. Current ZIP file
3. IMPLEMENTATION-LOG.md

Then confirm what we're building.
```

### Claude Keeps Making the Same Mistake

```
You've made this error three times. Stop and explain why 
you keep doing this. Then add a rule to CLAUDE.md.
```

### You're Stuck

```
I'm stuck. I want to [goal] but [problem]. 
What are my options?
```

### The Whole Thing is a Mess

```
Let's stop. Show me a summary of what's been done and 
what state the project is in. Then we'll decide how to proceed.
```

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Shift+Tab` | Toggle Plan/Act mode |
| `Ctrl+C` | Stop current operation |
| `Ctrl+L` | Clear screen |
| `↑` | Previous message |
| `Tab` | Autocomplete |
| `Ctrl+K` | Clear context (start fresh) |

---

## Context Management

Claude has a limited context window (how much it can "remember" in one session).

### Signs You're Running Low

- Claude forgets earlier decisions
- Responses get slower
- Claude asks about things you already discussed

### How to Manage Context

```
Let's checkpoint. Summarize what we've built and the current state.
```

Then you can:
1. Start a new session
2. Paste the summary
3. Continue from there

### Best Practices

- Complete one ZIP per session when possible
- Commit and push frequently
- Keep IMPLEMENTATION-LOG.md updated (it's your external memory)

---

## Subagents

For specialized tasks, Claude can spawn subagents that work in isolation.

### When to Use Subagents

- Complex UI work → frontend-developer agent
- Code quality review → code-reviewer agent
- Large refactors → multiple agents in parallel

### How to Invoke

```
Use the frontend-developer subagent to create the pricing card component
```

```
Use subagents to analyze this codebase for issues
```

### Installing Subagents

```bash
npx claude-code-templates@latest --agent development-team/frontend-developer --yes
npx claude-code-templates@latest --agent development-tools/code-reviewer --yes
```

---

## Advanced: Parallel Work with Git Worktrees

For advanced users who want to work on multiple ZIPs simultaneously:

### Setup

```bash
# Create worktrees
git worktree add .worktrees/feature-a -b feature-a
git worktree add .worktrees/feature-b -b feature-b

# Open Claude in each
cd .worktrees/feature-a && claude
# In another terminal:
cd .worktrees/feature-b && claude
```

### Why This Works

- Each worktree is a separate copy of your repo
- Each has its own branch
- Each can have its own Claude session
- Work on multiple things without conflicts

---

## Session Checklist

Start of session:
```markdown
- [ ] In correct project folder
- [ ] Claude started successfully
- [ ] Project path looks right
- [ ] Know which ZIP we're working on
```

During session:
```markdown
- [ ] Testing as we build
- [ ] Committing at checkpoints
- [ ] Updating logs when Claude forgets
```

End of session:
```markdown
- [ ] All changes committed
- [ ] IMPLEMENTATION-LOG.md updated
- [ ] Know where to pick up next time
- [ ] Pushed to remote (git push)
```

---

## Quick Reference

### Essential Commands

| What You Want | What to Say |
|---------------|-------------|
| Start building | "Let's build ZIP-XX" |
| See progress | "What's our status?" |
| Test something | "Test what we just built" |
| Fix a mistake | "Revert that and try differently" |
| Understand code | "Explain this file to me" |
| Stop safely | "Let's stop here and summarize" |

### The Golden Rules

1. **One ZIP at a time** - Don't jump around
2. **Test as you go** - Don't build everything then test
3. **Commit often** - Don't lose work
4. **Update docs** - Your future self will thank you
5. **Switch to Plan Mode when confused** - Don't push through blindly

---

## Getting Better

The more you use Claude Code, the better you'll get at:
- Giving clear instructions
- Knowing when to intervene
- Catching issues early
- Working efficiently

It's a skill. Give it a few projects.

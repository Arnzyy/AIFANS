# Subagents Guide

> Source: aitmpl.com (Claude Code Templates marketplace)
> Purpose: Delegate specialized tasks to isolated subagents

---

## What Are Subagents?

Subagents are pre-configured Claude Code agents that run in isolation. When you spawn a subagent:
- It works in its own context
- Executes the task independently
- Returns only the result
- Keeps your main project context clean and focused

---

## Installing Subagents

Run from your project root:

```bash
# Frontend specialist (RECOMMENDED for all UI work)
npx claude-code-templates@latest --agent development-team/frontend-developer --yes

# Code reviewer (RECOMMENDED for quality checks)
npx claude-code-templates@latest --agent development-tools/code-reviewer --yes

# Backend architect (for API/system design)
npx claude-code-templates@latest --agent development-team/backend-architect --yes

# Browse all available agents interactively
npx claude-code-templates@latest
```

---

## When To Use Subagents

### Use frontend-developer for:
- Creating new React components
- Building page layouts
- Implementing design system elements
- Animation and micro-interactions
- Responsive design work

### Use code-reviewer for:
- After completing a feature
- Before merging branches
- Quality and security audits
- Finding performance issues

### Use subagents generally when:
- You want to throw more compute at a problem
- The task is specialized and self-contained
- You want to keep main context clean
- You're working on multiple things in parallel

---

## How To Invoke Subagents

### Method 1: Explicit Request
```
"Use the frontend-developer subagent to create a responsive pricing card component"
```

### Method 2: General Parallelization
```
"Use subagents to explore the codebase"
→ Claude will launch multiple explore agents in parallel
```

### Method 3: For Complex Tasks
```
"Use 5 subagents to analyze this codebase for security issues"
```

---

## Subagent Workflow Pattern

For UI features, the recommended workflow:

1. **Plan** in main Claude session
2. **Delegate** component creation to frontend-developer subagent
3. **Review** results in main session
4. **Integrate** into your codebase
5. **Verify** with code-reviewer subagent

---

## Popular Subagents from aitmpl.com

| Agent | Downloads | Use For |
|-------|-----------|---------|
| frontend-developer | 16K+ | React, responsive design, UI components |
| code-reviewer | 12K+ | Quality, security, maintainability |
| backend-architect | 10K+ | API design, system architecture |
| test-automator | 8K+ | Test generation, coverage |
| security-auditor | 6K+ | Security scanning, vulnerability detection |

---

## Advanced: Git Worktrees for Parallel ZIPs

For experienced users, you can run multiple ZIPs in parallel:

```bash
# Create worktrees for parallel work
git worktree add .claude/worktrees/zip-03 origin/main
git worktree add .claude/worktrees/zip-04 origin/main

# Run Claude in each worktree
cd .claude/worktrees/zip-03 && claude
cd .claude/worktrees/zip-04 && claude
```

Each worktree gets its own Claude session. This is the "single biggest productivity unlock" according to the Claude Code team.

Shell aliases for quick switching:
```bash
alias za='cd .claude/worktrees/zip-a && claude'
alias zb='cd .claude/worktrees/zip-b && claude'
```

---

## Tips from Claude Code Team

1. **Offload to keep context clean** - Main agent stays focused, subagents do specialized work

2. **Route permission requests via hooks** - Let a subagent scan for attacks and auto-approve safe ones

3. **Use for exploration** - "Use 5 subagents to explore the codebase" gives you parallel investigation

4. **Dedicated analysis worktree** - Some engineers keep a worktree just for reading logs and running queries

# Claude Reset Prompt

Use when Claude seems confused or goes off-track.

---

STOP. Reset context.

Ignore all previous assumptions from this conversation.

Re-read these files in order:
1. /docs/DECISIONS.md
2. /docs/ASSUMPTIONS.md
3. /docs/zipbuild/CLAUDE-CODE-RULES.md
4. /docs/zipbuild/FRONTEND-DESIGN-SKILL.md
5. /docs/IMPLEMENTATION-LOG.md
6. /docs/TECHNICAL-FLUENCY.md
7. Current ZIP file
8. /docs/zipbuild/SOURCE-OF-TRUTH.md

Confirm your understanding:
- What ZIP are we on?
- What are the exit criteria?
- What are we NOT building?
- What are the HARD RULES?
- What ENV vars are already configured?
- What tables/RLS exist?
- What is our design direction?
- What fonts and colors are we using?
- What's in the Error Diary?

Do not write code until you've confirmed.

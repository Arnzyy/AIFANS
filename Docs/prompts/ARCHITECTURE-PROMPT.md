# Architecture Planning Session

## Instructions
1. Complete discovery first (have APP-SPECIFICATION.md)
2. Open a new Claude chat
3. Copy everything below the line
4. Paste your App Specification at the bottom
5. Save output as /docs/MASTER-PLAN.md
6. **🔴 RED-TEAM IT** (see RED-TEAM-PROMPT.md)
7. Fix any critical issues before generating ZIPs

---

I've attached my App Specification. Create a technical Master Implementation Plan.

**IMPORTANT**: Reference /docs/FRONTEND-DESIGN-SKILL.md for all UI/component decisions. No generic AI aesthetics.

## Required Sections

### 1. Database Schema
- All tables needed
- Relationships
- Key fields
- Indexes

### 2. Authentication
- User roles and permissions
- Sign up / login flows
- Session management

### 3. Row Level Security
- Who sees what
- Who edits what
- Tenant isolation (if applicable)

### 4. API Routes
- All endpoints
- What each does
- Request/response

### 5. Pages & Components
- All pages
- Key components
- Navigation
- **Design system foundation** (per FRONTEND-DESIGN-SKILL.md)

### 6. Third-Party Integrations
- What services
- How they connect

### 7. Implementation Stages
- Break into 10-15 ZIPs
- Each ZIP = 2-5 hours work
- Dependencies between stages
- Testing checkpoints
- **Include UI polish ZIP** near the end

### 8. Security Considerations
- Data protection
- Input validation
- Rate limiting

### 9. Scalability Notes
- Potential bottlenecks
- Future optimizations

### 10. Design System
- Chosen aesthetic direction
- Typography (display + body fonts)
- Color palette with CSS variables
- Component styling approach
- Motion/animation strategy

Format as detailed Markdown.

---

## My App Specification:

[PASTE YOUR APP-SPECIFICATION.md HERE]

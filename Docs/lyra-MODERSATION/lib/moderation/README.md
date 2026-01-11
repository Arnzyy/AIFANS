# LYRA Virtual Moderation Staff Member

A soft protection layer that scans creator model images and uploaded content for face consistency, celebrity/real-person impersonation risk, and safety concerns.

## Overview

This feature acts as an internal assistant to:
- Keep AI models visually consistent over time (prevent "face drift")
- Detect potential celebrity or real-person resemblance
- Flag deepfakes/face-swaps for review
- Identify age-related concerns (critical)
- Reduce admin workload by auto-approving low-risk content

**Important:** This is an assistant, not a guarantee. Admin has final authority on all decisions.

---

## Setup

### 1. Environment Variables

Add to `.env.local`:

```env
# Anthropic API for vision scanning
ANTHROPIC_API_KEY=sk-ant-...

# Cron job secret (generate a random string)
CRON_SECRET=your-random-secret-here

# Supabase (should already exist)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

### 2. Database Migration

Run the SQL migration in Supabase SQL Editor:

```bash
# Location: /lib/moderation/database-schema.sql
```

This creates:
- `model_anchors` - Baseline reference images
- `content_moderation_scans` - Scan results
- `moderation_jobs` - Async job queue
- `moderation_audit_log` - Immutable audit trail
- `moderation_settings` - Platform thresholds

### 3. Vercel Cron Job

Add to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/moderation",
      "schedule": "* * * * *"
    }
  ]
}
```

This runs every minute to process the job queue.

### 4. Admin Navigation

The moderation page is at `/admin/moderation`. Add to admin layout navigation:

```tsx
// In layout.tsx navigation items
{
  name: 'Moderation',
  icon: Shield,
  href: '/admin/moderation',
}
```

---

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Upload API     │────▶│  Create Scan    │────▶│  Job Queue      │
│  (existing)     │     │  Record         │     │  (moderation_   │
└─────────────────┘     └─────────────────┘     │   jobs)         │
                                                └────────┬────────┘
                                                         │
                                                         ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Admin Review   │◀────│  Update Status  │◀────│  Vision Scan    │
│  Queue          │     │  & Scores       │     │  (Claude)       │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

---

## Integration

### Adding to Existing Upload Endpoints

```typescript
import { onGalleryUpload } from '@/lib/moderation/integration';

// After successful R2 upload:
const scanId = await onGalleryUpload(
  contentId,
  modelId,
  creatorId,
  r2Key,
  r2Url
);

// Return pending status to creator
return { status: 'pending_scan', scanId };
```

### Available Integration Helpers

```typescript
import {
  onModelProfileUpload,   // Profile image
  onGalleryUpload,        // Gallery content
  onPPVUpload,            // PPV content
  onModelOnboarding,      // New model creation
  queueUploadForModeration, // Generic
} from '@/lib/moderation/integration';
```

---

## Thresholds

Default thresholds (adjustable in `moderation_settings` table):

### Auto-Approve
- Celebrity risk ≤ 30
- Face consistency ≥ 70 (if anchors exist)
- Deepfake risk ≤ 30
- Real person risk ≤ 40
- Minor risk < 30

### Auto-Reject
- Minor risk ≥ 70 (CRITICAL)

### Pending Review
- Celebrity risk ≥ 50
- Face consistency ≤ 50 (if anchors exist)
- Deepfake risk ≥ 50
- Any critical flags

---

## Flags

| Flag | Meaning |
|------|---------|
| `face_drift` | Significant difference from anchors |
| `celeb_risk` | Resembles a celebrity (50-79) |
| `celeb_high_confidence` | Strongly resembles celebrity (80+) |
| `real_person_suspected` | Appears to be a real photo |
| `faceswap_suspected` | Signs of face manipulation |
| `deepfake_detected` | Clear deepfake indicators |
| `minor_appearance_risk` | Concern about age appearance |
| `youth_coded_appearance` | Styling suggests youth |
| `no_face_detected` | No face in image |
| `multiple_faces` | More than one person |
| `no_anchors` | No baseline to compare |
| `insufficient_anchors` | Less than min anchors |

---

## Admin Workflow

### 1. Review Pending Items

Navigate to `/admin/moderation` to see:
- Flagged content with scores
- Side-by-side comparison with anchors
- AI summary explaining concerns

### 2. Actions

- **Approve**: Content goes live
- **Reject**: Content blocked, creator notified
- **Add as Anchor**: Save approved image as new baseline

### 3. Managing Anchors

When approving a model, add 3-10 anchor images:
1. Go to model's first approved images
2. Click "Add as Anchor" on each
3. Future uploads compare against these

---

## Files

### New Files
```
lib/moderation/
├── database-schema.sql    # SQL migration
├── types.ts               # TypeScript types
├── moderation-service.ts  # Core service
├── job-worker.ts          # Queue processing
├── integration.ts         # Upload helpers
├── index.ts               # Exports

app/api/admin/moderation/
├── queue/route.ts         # Get queue
├── [scanId]/review/route.ts # Review action
├── anchors/route.ts       # Manage anchors

app/api/cron/
├── moderation/route.ts    # Cron processor

app/admin/moderation/
├── page.tsx               # Admin UI
```

### Modified Files (Minimal)
- Upload API routes: Add moderation queue call
- Admin layout: Add navigation item

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/admin/moderation/queue` | GET | Get pending items |
| `/api/admin/moderation/[id]/review` | POST | Approve/reject |
| `/api/admin/moderation/anchors` | GET/POST/DELETE | Manage anchors |
| `/api/cron/moderation` | GET/POST | Process queue |

---

## Testing Checklist

- [ ] Create model, upload profile → scan runs, status set
- [ ] Approve model → add anchors (3-10 images)
- [ ] Upload clearly different face → flagged `pending_review`
- [ ] Upload consistent image → auto-approved
- [ ] Admin approves pending → visible to subscribers
- [ ] Verify no changes broke existing features

---

## Security Notes

- Moderation scores NOT exposed to creators
- Creators only see: `pending`, `approved`, `rejected`
- All actions logged in audit trail
- RLS policies enforce access control
- Service role key only used in server-side code

---

## Cost Estimates

Per scan (Claude 3.5 Sonnet vision):
- ~$0.003 per image with anchors
- ~$0.001 per image without anchors

Monthly estimate (10,000 uploads):
- ~$30-50/month in API costs

---

## Support

This is an internal tool. For issues:
1. Check audit log for errors
2. Review job queue for stuck items
3. Check Vercel function logs
4. Manually trigger `/api/cron/moderation`

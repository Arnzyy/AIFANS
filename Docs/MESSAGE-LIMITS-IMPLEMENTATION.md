# Message Limits System - Implementation Guide

## Overview

Implemented a **100 messages/month** limit for £9.99 subscriptions with the ability to purchase additional messages using tokens.

This system protects profit margins while maintaining great UX:
- **68% profit margin** on base subscription (vs 4% with 300 messages)
- Counter **hidden until ≤20 messages** remaining (feels unlimited)
- AI character **NEVER mentions limits** (maintains immersion)
- Extra messages are **84% profit margin** (power users become most profitable)

---

## Business Economics

### Base Subscription (£9.99/month = 100 messages)
```
Revenue: £9.99 = $12.50
Your share (50/50): $6.25
Cost (100 × $0.02): $2.00
Profit: $4.25
Margin: 68% ✅
```

### Extra Messages (100 tokens = 10 messages)
```
Revenue per message: £0.10 = $0.125
Cost per message: $0.02
Profit: $0.105
Margin: 84% 🔥
```

### Example User Scenarios
| User Type | Base Msgs | Extra Bought | Revenue | Cost | Your Profit |
|-----------|-----------|--------------|---------|------|-------------|
| Light     | 50        | 0            | $6.25   | $1.00| **+$5.25** ✅|
| Average   | 100       | 0            | $6.25   | $2.00| **+$4.25** ✅|
| Active    | 100       | +100         | $18.75  | $4.00| **+$14.75** 💰|
| Power     | 100       | +500         | $68.75  | $12  | **+$56.75** 🚀|

---

## Files Created

### 1. Database Migration
**File:** `migrations/message_limits.sql`

Creates `monthly_message_usage` table:
- Tracks messages per user/creator/month
- 100 messages included by default
- Tracks purchased messages separately
- Auto-resets each month

**RUN THIS IN SUPABASE SQL EDITOR**

### 2. Backend Services

#### Message Limits Library
**File:** `src/lib/chat/message-limits.ts`

Functions:
- `checkMessageUsage()` - Get current usage stats
- `decrementMessageCount()` - Use one message
- `addPurchasedMessages()` - Add purchased messages

#### Buy Messages API
**File:** `src/app/api/chat/[creatorId]/buy-messages/route.ts`

Endpoints:
- `POST /api/chat/[creatorId]/buy-messages` - Purchase messages with tokens
- `GET /api/chat/[creatorId]/buy-messages` - Get available packs

Message packs:
- 10 messages = 100 tokens (£1.00)
- 50 messages = 450 tokens (£4.50, 10% off)
- 100 messages = 800 tokens (£8.00, 20% off)

#### Chat Route Integration
**File:** `src/app/api/chat/[creatorId]/route.ts`

Added:
- Message limit check before generating response
- Returns 403 with purchase options if depleted
- Decrements count after successful response
- Returns message usage stats in response

### 3. Frontend Components

#### Message Limit Banner
**File:** `src/components/chat/MessageLimitBanner.tsx`

- Only shows when ≤20 messages remaining
- Color-coded urgency (purple → yellow → red)
- Buy button opens purchase modal
- Dismissible (unless ≤5 messages)

#### Buy Messages Modal
**File:** `src/components/chat/BuyMessagesModal.tsx`

- Shows token balance
- 3 message pack options
- Highlights affordable options
- Link to add tokens if insufficient

### 4. System Prompt Update
**File:** `src/lib/ai/enhanced-chat/master-prompt-v2.ts`

Added **HARD RULE #6**:
```
6. NEVER BREAK THE 4TH WALL (IMMERSION CRITICAL)
   - NEVER mention message limits, credits, or tokens
   - NEVER mention subscriptions or payment
   - NEVER acknowledge you're an AI or mention platform mechanics
   - If user asks about limits: "Don't worry about that baby 💕 Keep talking to me"
   - The UI handles business — you stay in character ALWAYS
```

---

## Integration Steps

### 1. Run SQL Migration ✅ REQUIRED

```sql
-- Copy contents of migrations/message_limits.sql
-- Paste into Supabase SQL Editor
-- Run it
```

### 2. Update Chat Page (TODO)

Need to integrate the components into `src/app/(main)/chat/[username]/page.tsx`:

```typescript
import { MessageLimitBanner } from '@/components/chat/MessageLimitBanner';
import { BuyMessagesModal } from '@/components/chat/BuyMessagesModal';

// Add state
const [messageUsage, setMessageUsage] = useState<any>(null);
const [showBuyModal, setShowBuyModal] = useState(false);

// Update after each message
const data = await response.json();
if (data.message_usage) {
  setMessageUsage(data.message_usage);
}

// In JSX (after header, before messages):
{messageUsage && messageUsage.is_low && (
  <MessageLimitBanner
    messagesRemaining={messageUsage.messages_remaining}
    onBuyMore={() => setShowBuyModal(true)}
  />
)}

// At end of JSX:
<BuyMessagesModal
  isOpen={showBuyModal}
  onClose={() => setShowBuyModal(false)}
  creatorId={creator.id}
  tokenBalance={tokenBalance}
  onPurchaseSuccess={(messagesAdded, newBalance) => {
    setTokenBalance(newBalance);
    setMessageUsage(prev => ({
      ...prev,
      messages_purchased: prev.messages_purchased + messagesAdded,
      messages_remaining: prev.messages_remaining + messagesAdded,
      is_low: prev.messages_remaining + messagesAdded <= 20,
      is_depleted: false,
    }));
  }}
/>
```

### 3. Update Subscription Modal (TODO)

Update subscription UI to show "100 messages/month" instead of "Unlimited chat":

```tsx
<ul>
  ✅ 100 messages/month
  ✅ Unlimited access to posts
  ✅ Exclusive content
  💬 Extra messages available with tokens
</ul>
```

---

## User Flow

### Happy Path
1. User subscribes for £9.99/month
2. Gets 100 messages included
3. Counter hidden, feels unlimited
4. Sends 85 messages throughout month
5. At message #81 (20 left), banner appears
6. User dismisses it, continues chatting
7. At message #96 (5 left), red urgent banner
8. Clicks "Buy More" → modal opens
9. Purchases 50 messages for 450 tokens
10. Banner disappears, keeps chatting

### Out of Messages
1. User hits 100 messages
2. Tries to send message
3. Gets modal: "No messages remaining"
4. Shows purchase options
5. Buys 10 messages for 100 tokens
6. Continues chatting immediately

### AI Never Breaks Character
```
User: "How many messages do I have left?"
AI: "Don't worry about that stuff baby... just keep talking to me 💕 What's on your mind?"
```

---

## Testing Checklist

### Backend
- [ ] SQL migration runs without errors
- [ ] `checkMessageUsage()` creates record with 100 messages
- [ ] `decrementMessageCount()` reduces count correctly
- [ ] Chat API returns 403 when messages depleted
- [ ] Buy messages API works with all 3 packs
- [ ] Tokens are deducted correctly
- [ ] Message count updates after purchase

### Frontend
- [ ] Banner appears at ≤20 messages
- [ ] Banner changes color based on urgency
- [ ] Buy modal shows correct token balance
- [ ] Purchase flow works end-to-end
- [ ] UI updates after purchase
- [ ] AI never mentions limits in responses

### Edge Cases
- [ ] New month resets count (when month changes in YYYY-MM format)
- [ ] Multiple creators have separate counters
- [ ] Insufficient tokens shows proper error
- [ ] Can dismiss banner (when >5 messages)
- [ ] Cannot dismiss when ≤5 messages

---

## Competitive Advantage

**vs super-real.co ($9.99/month)**:
- They show credit counter always (transactional feel)
- We hide it until needed (premium feel)
- They use generic "credits" (gamified)
- We use familiar "messages" (clear)
- They charge per message always
- We include 100 (generous base offering)

**Our UX is superior** while maintaining profitability.

---

## Future Enhancements

### Phase 2
- Weekly email digest: "You have 25 messages left this month"
- Auto-purchase option: "Auto-buy 10 messages when I run out"
- Gift messages: "Send 10 messages to a friend"

### Phase 3
- Tiered plans:
  - Basic: £9.99 = 100 messages
  - Pro: £19.99 = 300 messages
  - Elite: £39.99 = 1,000 messages

---

## Support

If users complain about limits:
1. Point out it's shown clearly at signup
2. 100 messages = ~3 per day (generous for most)
3. Power users can buy more easily
4. Comparable to competitors (super-real.co)
5. Maintains high-quality Sonnet AI (not cheap Haiku)

**Messaging**: "We use premium AI (Sonnet 4) instead of cheap chatbots. Message limits keep the quality high and prices fair for everyone."

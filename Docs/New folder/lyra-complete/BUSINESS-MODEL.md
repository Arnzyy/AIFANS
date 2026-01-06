# LYRA — FOUNDERS' BUSINESS MODEL
## Platform Strategy & Pricing Decisions

---

## 1. CORE BUSINESS MODEL

### Mental Model (Critical)

```
Subscriptions = Acquisition (get users in, build habit)
AI Chat = Margin (high profit, fully platform-owned)
Memory = Retention (keeps users coming back)
```

| Component | Role | Owner |
|-----------|------|-------|
| Creators | Bring attention, create content | Creators |
| Subscriptions | Low-friction entry point | Shared |
| AI Chat | Profit engine, scales infinitely | Platform |
| Memory | Personalisation, retention | Platform |

**You are NOT building:**
- An OnlyFans clone
- An AI girlfriend app
- A porn site

**You ARE building:**
> A chat-first monetisation platform where creators bring attention and AI turns it into recurring revenue.

---

## 2. PRICING (USER-FACING)

### Content Subscription (per model)
| Price | What's Included |
|-------|-----------------|
| **£9.99/month** | Feed content, images, basic access |

- Industry-standard pricing
- Low friction entry
- Feeds chat monetisation

### AI Chat Add-On (per model)
| Price | What's Included |
|-------|-----------------|
| **£9.99/month** | Private chat, long-term memory, ~20 messages/day (daily reset) |

- Separate from content sub
- Daily message allowance resets
- Memory persists across sessions

### Extra Messages
| Price | What's Included |
|-------|-----------------|
| **£1.99/message** | Additional messages beyond daily limit |

- High margin
- Impulse purchase
- Available anytime

### One-Off Content
| Type | Pricing |
|------|---------|
| Images | Creator sets price |
| Videos | Creator sets price |
| PPV | Creator sets price |
| Customs | Creator sets price |

- Fully allowed
- High ARPU potential
- Safer than chat from compliance POV

---

## 3. REVENUE SPLIT (CRITICAL)

### Content Revenue (subs, images, videos, PPV)
| Recipient | Split |
|-----------|-------|
| Creator | **80%** |
| Platform | **20%** |

### AI Chat Revenue (monthly + messages)
| Recipient | Split |
|-----------|-------|
| Platform | **70%** |
| Creator | **30%** |

### Why Chat Split Favours Platform:
- Platform owns AI infrastructure
- Platform owns memory system
- Platform bears API costs
- Platform bears compliance risk
- Chat scales infinitely without creator labour
- Creators still earn more overall despite lower %

---

## 4. REVENUE PROJECTIONS

### Conservative Example
| Metric | Value |
|--------|-------|
| Creators | 200 |
| Avg subs per creator | 500 |
| Chat conversion | 40% |
| Extra messages/user/month | 10 |

### Monthly Platform Revenue
| Stream | Calculation | Revenue |
|--------|-------------|---------|
| Content subs | 100k × £9.99 × 20% | £199,800 |
| Chat subs | 40k × £9.99 × 70% | £279,720 |
| Extra messages | 40k × 10 × £1.99 × 70% | £557,200 |
| **Total** | | **£1,036,720/month** |

### Per Creator Average
| Stream | Amount |
|--------|--------|
| Content (80%) | £3,996 |
| Chat (30%) | £1,198 |
| **Total** | **~£5,194/month** |

No nudity. No manual chat labour. Fully automated.

---

## 5. TAX & COMPLIANCE (UK)

### HMRC Requirements
- Must report creator earnings (DAC7)
- Similar to Airbnb / Etsy
- Annual reporting requirement
- Platform does NOT pay creator tax
- Creators remain responsible for their own tax

### Content Compliance
- Lingerie/swimwear only
- No nudity (nipples/genitals)
- No explicit sexual content
- All personas fictional
- Age verification required

### Payment Processing
- Stripe-compatible content only
- No pornographic material
- Clear AI disclosure

---

## 6. STRATEGIC POSITIONING

### Why £9.99 Chat Is NOT Too Cheap
- Lowers friction per model
- Users may sub to multiple models
- Real monetisation through:
  - Extra messages (£1.99 each)
  - PPV content
  - Retention over time
  - Multiple model subscriptions

### Start Accessible → Upsell Later
- Entry pricing builds habit
- Memory creates stickiness
- Extra messages capture impulse spend
- PPV captures high-intent spend

---

## 7. PRODUCT REQUIREMENTS

### Chat Must Support:
- ✅ Text messaging
- ✅ Image viewing (within chat)
- ✅ PPV unlocking (within chat)
- ✅ Video viewing (within chat)
- ✅ Content browsing (without leaving chat)

**Why:** Increases session length, message count, spend per session

### Looped Video ("Video Chat Feel")
**Allowed:**
- Looped idle videos
- Ambient visual presence
- Pre-recorded animations

**NOT Allowed:**
- Presenting as "live"
- Reactive video
- Lip-syncing to messages
- Calling it a "video call"

**Language matters.**

---

## 8. DATABASE TABLES (BUSINESS)

```sql
-- Subscriptions
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY,
  subscriber_id UUID REFERENCES auth.users(id),
  creator_id UUID REFERENCES auth.users(id),
  type VARCHAR(20), -- 'content' | 'chat' | 'bundle'
  status VARCHAR(20), -- 'active' | 'cancelled' | 'expired'
  price_paid DECIMAL(10,2),
  currency VARCHAR(3) DEFAULT 'GBP',
  started_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  stripe_subscription_id VARCHAR(255),
  UNIQUE(subscriber_id, creator_id, type)
);

-- Message Credits
CREATE TABLE message_credits (
  id UUID PRIMARY KEY,
  subscriber_id UUID REFERENCES auth.users(id),
  creator_id UUID REFERENCES auth.users(id),
  daily_allowance INTEGER DEFAULT 20,
  daily_used INTEGER DEFAULT 0,
  purchased_credits INTEGER DEFAULT 0,
  last_reset_at TIMESTAMPTZ DEFAULT NOW()
);

-- Purchases (PPV, extras)
CREATE TABLE purchases (
  id UUID PRIMARY KEY,
  subscriber_id UUID REFERENCES auth.users(id),
  creator_id UUID REFERENCES auth.users(id),
  type VARCHAR(30), -- 'message_pack' | 'ppv_image' | 'ppv_video' | 'custom'
  content_id UUID, -- Reference to content if applicable
  amount DECIMAL(10,2),
  platform_fee DECIMAL(10,2),
  creator_payout DECIMAL(10,2),
  stripe_payment_id VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Creator Earnings
CREATE TABLE creator_earnings (
  id UUID PRIMARY KEY,
  creator_id UUID REFERENCES auth.users(id),
  period_start DATE,
  period_end DATE,
  content_revenue DECIMAL(10,2) DEFAULT 0,
  chat_revenue DECIMAL(10,2) DEFAULT 0,
  ppv_revenue DECIMAL(10,2) DEFAULT 0,
  total_revenue DECIMAL(10,2) DEFAULT 0,
  platform_fees DECIMAL(10,2) DEFAULT 0,
  payout_amount DECIMAL(10,2) DEFAULT 0,
  payout_status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 9. CONSTANTS

```typescript
// pricing-constants.ts

export const PRICING = {
  CONTENT_SUB_MONTHLY: 9.99,
  CHAT_SUB_MONTHLY: 9.99,
  EXTRA_MESSAGE_PRICE: 1.99,
  CURRENCY: 'GBP',
};

export const REVENUE_SPLIT = {
  CONTENT: {
    CREATOR: 0.80,
    PLATFORM: 0.20,
  },
  CHAT: {
    CREATOR: 0.30,
    PLATFORM: 0.70,
  },
};

export const CHAT_LIMITS = {
  DAILY_MESSAGE_ALLOWANCE: 20,
  RESET_HOUR_UTC: 0, // Midnight UTC
};

export const MESSAGE_PACKS = [
  { messages: 10, price: 14.99, savings: '25%' },
  { messages: 25, price: 34.99, savings: '30%' },
  { messages: 50, price: 59.99, savings: '40%' },
];
```

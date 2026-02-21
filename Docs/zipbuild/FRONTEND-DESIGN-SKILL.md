# Frontend Design Skill

> Source: Anthropic Agent Skills (github.com/anthropics/skills)
> Purpose: Create distinctive, production-grade interfaces that avoid generic "AI slop"

---

## When To Use

Reference this file for ANY UI work:
- Component creation
- Page layouts
- Styling decisions
- Animation implementation
- Design system setup

---

## Design Thinking Process

Before writing ANY UI code, answer these:

### 1. Purpose
What problem does this interface solve? Who uses it?

### 2. Tone
Pick a BOLD aesthetic direction. Options include:
- Brutally minimal
- Maximalist chaos
- Retro-futuristic
- Organic/natural
- Luxury/refined
- Playful/toy-like
- Editorial/magazine
- Brutalist/raw
- Art deco/geometric
- Soft/pastel
- Industrial/utilitarian

**Choose ONE and commit fully.**

### 3. Constraints
Technical requirements (framework, performance, accessibility)

### 4. Differentiation
What makes this UNFORGETTABLE? What's the ONE thing someone will remember?

---

## ⛔ NEVER USE (Generic AI Aesthetics)

These make your app look like every other AI-generated UI:

### Fonts
- ❌ Inter
- ❌ Roboto
- ❌ Arial
- ❌ System fonts
- ❌ Space Grotesk (overused)

### Colors
- ❌ Purple gradients on white backgrounds
- ❌ Timid, evenly-distributed palettes
- ❌ Generic blue (#0066FF type colors)

### Layouts
- ❌ Predictable grid patterns
- ❌ Cookie-cutter component arrangements
- ❌ Default shadcn styling without customisation

### Overall
- ❌ Designs that lack context-specific character
- ❌ Safe, forgettable aesthetics

---

## ✅ DO USE (Distinctive Design)

### Typography
- Choose fonts that are beautiful, unique, interesting
- Pair a distinctive DISPLAY font with a refined BODY font
- Unexpected, characterful choices
- Examples: Playfair Display, Cabinet Grotesk, Instrument Serif, Satoshi, General Sans, Clash Display

### Color & Theme
- Commit to a cohesive aesthetic
- Use CSS variables for consistency
- Dominant colors with SHARP accents
- Bold palettes outperform timid ones

### Motion & Animation
- Add animations for effects and micro-interactions
- CSS-only solutions preferred for HTML
- Framer Motion for React when needed
- Focus on HIGH-IMPACT moments:
  - Page load with staggered reveals (animation-delay)
  - Scroll-triggered animations
  - Hover states that surprise
- One well-orchestrated page load > scattered micro-interactions

### Spatial Composition
- Unexpected layouts
- Asymmetry
- Overlap
- Diagonal flow
- Grid-breaking elements
- Generous negative space OR controlled density

### Backgrounds & Visual Details
- Create atmosphere and depth (not solid colors)
- Add contextual effects matching the aesthetic:
  - Gradient meshes
  - Noise textures
  - Geometric patterns
  - Layered transparencies
  - Dramatic shadows
  - Decorative borders
  - Custom cursors
  - Grain overlays

---

## Implementation Complexity

Match code complexity to aesthetic vision:

### Maximalist Design
- Elaborate code
- Extensive animations
- Multiple effects
- Rich interactions

### Minimalist/Refined Design
- Restraint and precision
- Perfect spacing
- Subtle details
- Careful typography
- Elegance from execution

---

## CSS Variables Template

Add to your `globals.css`:

```css
:root {
  /* Typography */
  --font-display: 'Your Display Font', serif;
  --font-body: 'Your Body Font', sans-serif;
  
  /* Colors - commit to your palette */
  --color-primary: ;
  --color-accent: ;
  --color-background: ;
  --color-surface: ;
  --color-text: ;
  --color-text-muted: ;
  
  /* Spacing scale */
  --space-xs: 0.25rem;
  --space-sm: 0.5rem;
  --space-md: 1rem;
  --space-lg: 2rem;
  --space-xl: 4rem;
  
  /* Animation */
  --ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
  --duration-fast: 150ms;
  --duration-normal: 300ms;
  --duration-slow: 500ms;
}
```

---

## Animation Patterns

### Staggered Reveal (Page Load)

```css
.animate-in {
  animation: fadeSlideIn var(--duration-slow) var(--ease-out-expo) forwards;
  opacity: 0;
}

@keyframes fadeSlideIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Apply delays to children */
.stagger-1 { animation-delay: 100ms; }
.stagger-2 { animation-delay: 200ms; }
.stagger-3 { animation-delay: 300ms; }
```

### Hover Effects

```css
.hover-lift {
  transition: transform var(--duration-normal) var(--ease-out-expo),
              box-shadow var(--duration-normal) var(--ease-out-expo);
}

.hover-lift:hover {
  transform: translateY(-4px);
  box-shadow: 0 20px 40px rgba(0,0,0,0.1);
}
```

---

## The Golden Rule

> **Claude is capable of extraordinary creative work. Don't hold back. Show what can truly be created when thinking outside the box and committing fully to a distinctive vision.**

Every interface should be MEMORABLE. If someone can't tell your app from a generic template, you haven't followed this guide.

---

## Checklist Before Shipping UI

- [ ] Distinctive typography (not Inter/Roboto/Arial)
- [ ] Bold, cohesive color palette
- [ ] Animations on page load
- [ ] Hover states that delight
- [ ] Visual depth (not flat solid colors)
- [ ] Consistent with chosen aesthetic
- [ ] Something MEMORABLE about it

# Working with Files

> **How to handle images, assets, paths, and file management** when building with Claude Code.

---

## Understanding Your Project Structure

```
your-project/
├── app/                    ← Your pages and API routes
├── components/             ← React components
├── lib/                    ← Utilities and helpers
├── public/                 ← Static files (images, fonts, etc.)
│   ├── images/            ← Put your images here
│   ├── fonts/             ← Custom fonts
│   └── favicon.ico        ← Browser tab icon
├── styles/                 ← Global styles
├── docs/                   ← ZipBuild documentation
├── supabase/              ← Database migrations
├── .env.local             ← Your secret environment variables
├── package.json           ← Project dependencies
└── CLAUDE.md              ← Claude Code configuration
```

---

## Adding Images and Logos

### Step 1: Put the File in the Right Place

All static assets go in the `/public` folder. Create subfolders to stay organized:

```
public/
├── images/
│   ├── logo.png
│   ├── hero-background.jpg
│   └── icons/
│       ├── arrow.svg
│       └── check.svg
├── fonts/
│   ├── CustomFont-Regular.woff2
│   └── CustomFont-Bold.woff2
└── documents/
    └── terms.pdf
```

### Step 2: Reference in Your Code

Files in `/public` are served from the root URL:

| File Location | URL in Code |
|---------------|-------------|
| `/public/images/logo.png` | `/images/logo.png` |
| `/public/fonts/Custom.woff2` | `/fonts/Custom.woff2` |
| `/public/favicon.ico` | `/favicon.ico` |

### Step 3: Using Images in React

**With Next.js Image component (recommended):**
```tsx
import Image from 'next/image'

<Image 
  src="/images/logo.png" 
  alt="Company Logo"
  width={200}
  height={50}
/>
```

**Regular img tag:**
```tsx
<img src="/images/logo.png" alt="Company Logo" />
```

**As a background:**
```tsx
<div style={{ backgroundImage: 'url(/images/hero.jpg)' }}>
```

**In CSS:**
```css
.hero {
  background-image: url('/images/hero.jpg');
}
```

---

## Telling Claude Where Files Are

Claude Code can't browse your file explorer. You need to tell it exactly where files are.

### Getting the File Path

**Mac:**
1. Find the file in Finder
2. Right-click the file
3. Hold `Option` key - "Copy" changes to "Copy as Pathname"
4. Click "Copy as Pathname"
5. Paste to Claude

**Windows:**
1. Find the file in Explorer
2. Right-click the file
3. Click "Copy as path"
4. Paste to Claude

**VS Code:**
1. Right-click the file in the sidebar
2. Click "Copy Path" or "Copy Relative Path"
3. Paste to Claude

### Example Messages

```
Use the logo at /Users/billy/projects/myapp/public/images/logo.png
```

```
I've added the hero image to public/images/hero.jpg - use it on the landing page
```

```
The CSV data is at /Users/billy/Downloads/customers.csv - help me import it
```

---

## Moving Files from Desktop to Project

If you have files on your Desktop or Downloads that Claude needs:

### Step 1: Copy to Your Project

**Mac (Terminal):**
```bash
cp ~/Desktop/logo.png ./public/images/
```

**Windows (Command Prompt):**
```cmd
copy C:\Users\YourName\Desktop\logo.png .\public\images\
```

**Or just drag and drop** in VS Code's file explorer.

### Step 2: Tell Claude

```
I've added logo.png to /public/images/logo.png - use it in the header
```

### Recommended Locations

| File Type | Put It In |
|-----------|-----------|
| Images (png, jpg, svg) | `/public/images/` |
| Fonts (woff2, ttf) | `/public/fonts/` |
| Documents (pdf) | `/public/documents/` |
| Data files (csv, json) | `/data/` (create if needed) |
| Icons | `/public/images/icons/` |

---

## Taking Screenshots

Screenshots help Claude understand visual issues or see what you're aiming for.

### Windows Snipping Tool

1. Press `Win + Shift + S`
2. Screen dims, cursor becomes crosshair
3. Click and drag to select area
4. Screenshot is copied to clipboard
5. Paste directly into Claude Code with `Ctrl + V`

**Alternative:** Search for "Snipping Tool" in Start menu for more options.

### Mac Screenshot

**Capture area:**
1. Press `Cmd + Shift + 4`
2. Cursor becomes crosshair
3. Click and drag to select area
4. Screenshot saves to Desktop

**Copy to clipboard instead:**
1. Press `Cmd + Shift + 4`
2. Then press `Control` while selecting
3. Pastes directly with `Cmd + V`

**Capture window:**
1. Press `Cmd + Shift + 4`
2. Press `Space`
3. Click the window you want

### Sharing Screenshots with Claude

**Method 1: Drag and drop**
- Find the screenshot file
- Drag it into the Claude Code window

**Method 2: Paste from clipboard**
- Take screenshot (copied to clipboard)
- In Claude Code, press `Ctrl+V` (Windows) or `Cmd+V` (Mac)

### What Screenshots Are Good For

```
[screenshot of broken UI]
The cards are overlapping - they should have 20px gap

[screenshot of error message]
I'm seeing this error when I click save

[screenshot of design reference]
I want the header to look like this Dribbble design

[screenshot of network tab]
This API call is failing - here's what it shows
```

---

## Working with Fonts

### Step 1: Download Font Files

Get `.woff2` files (best for web). Sources:
- [Google Fonts](https://fonts.google.com) - Click font → Download
- [Font Squirrel](https://www.fontsquirrel.com)
- Purchased fonts

### Step 2: Add to Project

Put font files in `/public/fonts/`:
```
public/
└── fonts/
    ├── Satoshi-Regular.woff2
    ├── Satoshi-Medium.woff2
    ├── Satoshi-Bold.woff2
    └── PlayfairDisplay-Regular.woff2
```

### Step 3: Register in CSS

Add to your `app/globals.css`:

```css
@font-face {
  font-family: 'Satoshi';
  src: url('/fonts/Satoshi-Regular.woff2') format('woff2');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'Satoshi';
  src: url('/fonts/Satoshi-Medium.woff2') format('woff2');
  font-weight: 500;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'Satoshi';
  src: url('/fonts/Satoshi-Bold.woff2') format('woff2');
  font-weight: 700;
  font-style: normal;
  font-display: swap;
}
```

### Step 4: Use in Tailwind

Update `tailwind.config.ts`:

```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  theme: {
    extend: {
      fontFamily: {
        sans: ['Satoshi', 'system-ui', 'sans-serif'],
        display: ['Playfair Display', 'serif'],
      },
    },
  },
}
```

Now use:
```tsx
<h1 className="font-display">Heading</h1>
<p className="font-sans">Body text</p>
```

---

## Environment Variables

Sensitive data (API keys, secrets) go in `.env.local`:

### Creating .env.local

1. Create file in project root called `.env.local`
2. Add your variables:

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...

# Stripe
STRIPE_SECRET_KEY=sk_test_xxxxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx

# Other
SOME_SECRET=my-secret-value
```

### The Rules

| Prefix | Where It Works | Use For |
|--------|----------------|---------|
| `NEXT_PUBLIC_` | Browser + Server | Public keys, URLs |
| No prefix | Server only | Secret keys, passwords |

**Never put secret keys with `NEXT_PUBLIC_`** - they'll be exposed to browsers.

### Accessing in Code

```typescript
// Server-side (API routes, Server Components)
const secret = process.env.STRIPE_SECRET_KEY

// Client-side (must have NEXT_PUBLIC_ prefix)
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
```

### .env.local is Secret

Make sure `.env.local` is in your `.gitignore`:

```
# .gitignore
.env.local
.env*.local
```

**Never commit secrets to git.**

---

## Importing Data (CSV, JSON)

### CSV Import

1. Put CSV in your project:
   ```
   data/
   └── customers.csv
   ```

2. Tell Claude:
   ```
   I have a CSV at /data/customers.csv with columns: name, email, phone
   Help me write a script to import this into the customers table
   ```

### JSON Data

For static JSON data:

```
public/
└── data/
    └── products.json
```

Use in code:
```typescript
// Fetch at runtime
const products = await fetch('/data/products.json').then(r => r.json())

// Or import at build time
import products from '@/public/data/products.json'
```

---

## File Permissions and Common Issues

### "EACCES: permission denied"

You don't have permission to access the file/folder.

**Mac/Linux fix:**
```bash
sudo chown -R $(whoami) ./your-project
```

**Windows:** Right-click folder → Properties → Security → Edit permissions

### "ENOENT: no such file or directory"

The file doesn't exist at that path.

**Checklist:**
- [ ] Is the path spelled correctly?
- [ ] Is the capitalization exact? (Linux servers are case-sensitive)
- [ ] Did you create the folder first?
- [ ] Are you in the right project directory?

### "File is too large"

For images over 4MB:
1. Compress first (use [TinyPNG](https://tinypng.com) or [Squoosh](https://squoosh.app))
2. Consider using smaller resolution for web
3. Use WebP format instead of PNG/JPG

---

## Organizing Assets for Real Projects

### Recommended Structure

```
public/
├── images/
│   ├── branding/
│   │   ├── logo.svg
│   │   ├── logo-dark.svg
│   │   └── favicon.ico
│   ├── marketing/
│   │   ├── hero.jpg
│   │   └── features/
│   │       ├── feature-1.png
│   │       └── feature-2.png
│   └── ui/
│       ├── placeholder-avatar.png
│       └── empty-state.svg
├── fonts/
│   ├── body/
│   │   ├── Satoshi-Regular.woff2
│   │   └── Satoshi-Bold.woff2
│   └── display/
│       └── PlayfairDisplay-Regular.woff2
└── documents/
    ├── privacy-policy.pdf
    └── terms-of-service.pdf
```

### Naming Conventions

- **Use lowercase:** `hero-image.jpg` not `Hero-Image.jpg`
- **Use hyphens:** `user-avatar.png` not `user_avatar.png`
- **Be descriptive:** `pricing-comparison-table.png` not `img1.png`
- **Include size if relevant:** `logo-32x32.png`, `logo-256x256.png`

---

## Quick Reference

### Adding an Image

```bash
# 1. Copy to project
cp ~/Desktop/myimage.png ./public/images/

# 2. Use in code
<Image src="/images/myimage.png" alt="Description" width={400} height={300} />
```

### Getting File Path to Share with Claude

| Platform | Method |
|----------|--------|
| Mac | Right-click + Option → "Copy as Pathname" |
| Windows | Right-click → "Copy as path" |
| VS Code | Right-click → "Copy Path" |

### Screenshot Shortcuts

| Platform | Shortcut |
|----------|----------|
| Windows | `Win + Shift + S` |
| Mac (to file) | `Cmd + Shift + 4` |
| Mac (to clipboard) | `Cmd + Shift + 4` then hold `Control` |

### File Locations Summary

| What | Where |
|------|-------|
| Images | `/public/images/` |
| Fonts | `/public/fonts/` |
| Favicons | `/public/favicon.ico` |
| PDFs/Documents | `/public/documents/` |
| Data files | `/data/` |
| Environment variables | `/.env.local` |

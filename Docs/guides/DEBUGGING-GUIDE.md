# Debugging Guide

> **This guide will teach you how to find and fix problems.** Not just where to look, but how to think. These are the same techniques professional developers use.

---

## The Debugging Mindset

Before we get into tools and techniques, understand this:

**Debugging is detective work, not guessing.**

When something breaks:
1. **Don't panic** - Errors are normal. Every developer sees them daily.
2. **Read carefully** - The error message usually tells you what's wrong.
3. **Reproduce it** - Can you make it happen again? Consistently?
4. **Isolate it** - What's the smallest change that causes the problem?
5. **Fix the root cause** - Not just the symptom.
6. **Verify the fix** - Test the exact scenario that was broken.

---

## Where Errors Live

Different types of problems show up in different places. Knowing where to look is half the battle.

```
┌─────────────────────────────────────────────────────────────┐
│                     YOUR APPLICATION                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   TERMINAL                 BROWSER                          │
│   ┌──────────────┐        ┌──────────────┐                 │
│   │ Build errors │        │ Console      │                 │
│   │ Server crash │        │ Network tab  │                 │
│   │ API failures │        │ React errors │                 │
│   │ Type errors  │        │ UI bugs      │                 │
│   └──────────────┘        └──────────────┘                 │
│                                                              │
│   VERCEL LOGS              SUPABASE LOGS                    │
│   ┌──────────────┐        ┌──────────────┐                 │
│   │ Production   │        │ Database     │                 │
│   │ errors       │        │ errors       │                 │
│   │ Function     │        │ RLS blocks   │                 │
│   │ timeouts     │        │ Auth issues  │                 │
│   └──────────────┘        └──────────────┘                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 1. Terminal Errors

### What Shows Up Here

The terminal (where you ran `npm run dev`) shows:
- Build errors (code won't compile)
- Server-side crashes
- API route errors
- TypeScript type errors
- Missing dependencies

### How to Read Terminal Errors

```
error - ./app/dashboard/page.tsx:15:23
Type error: Property 'name' does not exist on type 'User | null'.

  13 |   const user = await getUser()
  14 |   
> 15 |   return <div>{user.name}</div>
     |                     ^
  16 | }
```

**Breaking this down:**

| Part | Meaning |
|------|---------|
| `./app/dashboard/page.tsx` | The file with the problem |
| `:15:23` | Line 15, character 23 |
| `Type error:` | What kind of error |
| `Property 'name' does not exist on type 'User \| null'` | The actual problem |
| `> 15 \| return <div>{user.name}</div>` | The exact line |
| `^` | Points to exactly where |

**The fix:** The error says `user` might be `null`. You need to handle that case:
```typescript
return <div>{user?.name}</div>
// or
if (!user) return <div>Not logged in</div>
return <div>{user.name}</div>
```

### How to Share Terminal Errors with Claude

1. **Copy the ENTIRE error** - not just the last line
2. Scroll up to find where it starts (usually `error -` or `Error:`)
3. Include 5-10 lines of context
4. Paste directly into Claude Code

**Example message:**
```
I'm getting this error when I try to build:

error - ./app/dashboard/page.tsx:15:23
Type error: Property 'name' does not exist on type 'User | null'.

  13 |   const user = await getUser()
  14 |   
> 15 |   return <div>{user.name}</div>
     |                     ^
```

---

## 2. Browser Console

### How to Open It

**Chrome / Edge:**
- Right-click anywhere → "Inspect" → Click "Console" tab
- Or: `Ctrl+Shift+J` (Windows) / `Cmd+Option+J` (Mac)

**Firefox:**
- Right-click → "Inspect" → "Console" tab
- Or: `Ctrl+Shift+K` (Windows) / `Cmd+Option+K` (Mac)

**Safari:**
- Enable Developer menu: Safari → Preferences → Advanced → "Show Develop menu"
- Then: Develop → Show JavaScript Console

### What Shows Up Here

- JavaScript errors on the page
- Failed network requests
- React errors and warnings
- Console.log output from your code
- Unhandled promise rejections

### Reading Console Errors

```
Uncaught TypeError: Cannot read properties of undefined (reading 'map')
    at ProductList (ProductList.tsx:12:24)
    at renderWithHooks (react-dom.development.js:14985:18)
    at mountIndeterminateComponent (react-dom.development.js:17811:13)
```

**Breaking this down:**

| Part | Meaning |
|------|---------|
| `Uncaught TypeError` | Type of error (something's the wrong type) |
| `Cannot read properties of undefined` | You're trying to use something that doesn't exist |
| `(reading 'map')` | Specifically, you called `.map()` on undefined |
| `at ProductList (ProductList.tsx:12:24)` | **YOUR CODE** - this is where to look |
| `at renderWithHooks...` | React internals - usually ignore these |

**The rule:** Read from top, find the FIRST line that mentions YOUR code (not react-dom, not node_modules). That's your bug.

### Console Colors

| Color | Meaning |
|-------|---------|
| 🔴 Red | Error - something broke |
| 🟡 Yellow | Warning - might be a problem |
| ⚪ White/Grey | Info - just logging |
| 🔵 Blue | Debug info |

### How to Share Console Errors

**Option 1: Screenshot**
- Open console
- Take screenshot (see Working with Files guide)
- Drag into Claude Code

**Option 2: Copy text**
- Right-click the error in console
- "Copy" or "Copy message"
- Paste to Claude

---

## 3. Browser Network Tab

### How to Open It

Same as Console, but click "Network" tab instead.

### What It Shows

Every request your app makes:
- API calls to your backend
- Fetching data from Supabase
- Loading images and scripts
- External API calls

### Reading Network Requests

Each row is a request. Key columns:

| Column | Meaning |
|--------|---------|
| **Name** | The URL that was requested |
| **Status** | HTTP status code (see below) |
| **Type** | What kind of request (fetch, document, script) |
| **Time** | How long it took |

### HTTP Status Codes (What They Mean)

| Code | Meaning | Common Cause |
|------|---------|--------------|
| **200** | ✅ Success | Everything worked |
| **201** | ✅ Created | Successfully created something |
| **204** | ✅ No Content | Success, nothing to return |
| **301/302** | ↪️ Redirect | Page moved somewhere else |
| **400** | ❌ Bad Request | You sent invalid data |
| **401** | ❌ Unauthorized | Not logged in |
| **403** | ❌ Forbidden | Logged in but not allowed |
| **404** | ❌ Not Found | URL doesn't exist |
| **405** | ❌ Method Not Allowed | Wrong HTTP method (GET vs POST) |
| **422** | ❌ Validation Error | Data failed validation |
| **429** | ❌ Too Many Requests | Rate limited |
| **500** | ❌ Server Error | Bug in your API code |
| **502/503** | ❌ Server Down | Hosting/infrastructure issue |

### Inspecting a Failed Request

1. Click on the red/failed request
2. Look at these tabs:
   - **Headers** - What was sent
   - **Payload** - The data you sent (for POST/PUT)
   - **Response** - What came back (often has error message)
   - **Preview** - Formatted view of response

### Common Network Issues

**CORS Error:**
```
Access to fetch at 'https://api.example.com' from origin 'http://localhost:3000' 
has been blocked by CORS policy
```
→ The external API doesn't allow requests from your domain. Need to either:
- Call from your API route instead of frontend
- Configure CORS on the external API (if you control it)

**404 on API Route:**
→ Check the URL matches your file structure exactly:
- `/api/users` → `app/api/users/route.ts`
- `/api/users/[id]` → `app/api/users/[id]/route.ts`

**500 Internal Server Error:**
→ Bug in your API code. Check terminal for the actual error.

### How to Share Network Issues

1. Click the failed request
2. Screenshot the Headers and Response tabs
3. Or copy the response body if it's JSON
4. Share with Claude: "This API call is failing: [screenshot]"

---

## 4. React-Specific Debugging

### React DevTools

**Install the browser extension:**
- [Chrome](https://chrome.google.com/webstore/detail/react-developer-tools/fmkadmapgofadopljbjfkapdkoienihi)
- [Firefox](https://addons.mozilla.org/en-US/firefox/addon/react-devtools/)
- [Edge](https://microsoftedge.microsoft.com/addons/detail/react-developer-tools/gpphkfbcpidddadnkolkpfckpihlkkil)

**What it does:**
- Shows your component tree
- Lets you inspect props and state
- Highlights re-renders
- Shows which component caused a render

**How to use:**
1. Open DevTools (F12)
2. Click "Components" tab (added by extension)
3. Click any component to see its props and state
4. Watch values change in real-time

### Common React Errors

**"Cannot update a component while rendering a different component"**
→ You're setting state during render. Move the setState into useEffect or an event handler.

**"Rendered more hooks than during the previous render"**
→ You have a conditional before a hook. Hooks must always run in the same order.

```typescript
// ❌ BAD
if (condition) {
  const [state, setState] = useState()  // Hook after condition
}

// ✅ GOOD
const [state, setState] = useState()
if (condition) {
  // Use state here
}
```

**"Hydration mismatch" / "Text content did not match"**
→ Server rendered something different than client. Usually caused by:
- Using `Date.now()` or `Math.random()` during render
- Checking `window` or `localStorage` during render
- Time-dependent formatting

```typescript
// ❌ BAD - Different on server vs client
<p>Current time: {new Date().toLocaleTimeString()}</p>

// ✅ GOOD - Render on client only
const [time, setTime] = useState<string>()
useEffect(() => {
  setTime(new Date().toLocaleTimeString())
}, [])
<p>Current time: {time}</p>
```

**"Each child in a list should have a unique 'key' prop"**
→ When mapping over arrays, each item needs a unique key:

```typescript
// ❌ BAD
{items.map(item => <div>{item.name}</div>)}

// ✅ GOOD
{items.map(item => <div key={item.id}>{item.name}</div>)}
```

---

## 5. Vercel Logs (Production)

### How to Access

1. Go to [vercel.com](https://vercel.com)
2. Click your project
3. Click "Logs" in the top nav
4. Or: "Deployments" → Click a deployment → "Functions" tab

### What You'll See

- Real-time logs from your production app
- API route executions
- Serverless function logs
- Build output

### Filtering Logs

Use the filters to find specific issues:
- **Level:** Error, Warning, Info
- **Source:** Static, Function, Edge
- **Time range:** Last hour, day, week

### Common Production Issues

**Function Timeout:**
```
Task timed out after 10.00 seconds
```
→ Your API route took too long. Either:
- Optimize the code
- Increase timeout in vercel.json
- Move to background job

**Memory Limit:**
```
FATAL ERROR: CALL_AND_RETRY_LAST Allocation failed - JavaScript heap out of memory
```
→ Processing too much data at once. Stream or paginate instead.

**Cold Start:**
First request after idle period is slow. Normal for serverless. For critical paths, consider:
- Vercel Pro (faster cold starts)
- Edge functions (faster but limited)

---

## 6. Supabase Logs

### How to Access

1. Go to your Supabase project dashboard
2. Left sidebar → "Logs"
3. Choose log type:
   - **Postgres** - Database queries and errors
   - **Auth** - Login/signup issues
   - **Storage** - File upload/download issues
   - **Edge Functions** - If using Supabase functions

### RLS Debugging

When a query returns empty but data exists:

1. **Check RLS is the cause:**
   ```sql
   -- In Supabase SQL editor, temporarily disable RLS
   ALTER TABLE your_table DISABLE ROW LEVEL SECURITY;
   ```
   Run your query. If data appears, RLS is blocking it.
   
   ```sql
   -- Re-enable immediately!
   ALTER TABLE your_table ENABLE ROW LEVEL SECURITY;
   ```

2. **Check your policies:**
   ```sql
   -- See all policies on a table
   SELECT * FROM pg_policies WHERE tablename = 'your_table';
   ```

3. **Test as specific user:**
   ```sql
   -- See what auth.uid() returns
   SELECT auth.uid();
   
   -- Test your policy logic
   SELECT * FROM your_table WHERE user_id = auth.uid();
   ```

### Common Supabase Errors

**"JWTExpired"**
→ Session expired. User needs to re-login. Check your session handling.

**"Invalid API key"**
→ Using wrong environment variable. Check NEXT_PUBLIC_SUPABASE_ANON_KEY.

**"permission denied for table"**
→ RLS policy is blocking the operation. Check your policies.

**"duplicate key value violates unique constraint"**
→ Trying to insert a record that already exists. Check your logic.

---

## 7. Strategic Debugging Techniques

### The Console.log Method

When you don't know what's happening, add logs to trace the flow:

```typescript
async function handleSubmit(data) {
  console.log('1. handleSubmit called with:', data)
  
  const validated = validateData(data)
  console.log('2. After validation:', validated)
  
  const response = await saveToDatabase(validated)
  console.log('3. Database response:', response)
  
  if (response.error) {
    console.log('4. Error occurred:', response.error)
    return
  }
  
  console.log('5. Success!')
}
```

Run the action, check console. You'll see exactly where it stops or goes wrong.

**Pro tip:** Number your logs so you can see the order easily.

### The Elimination Method

When you don't know what's causing a bug:

1. Comment out half the code
2. Does the bug still happen?
   - **Yes** → Bug is in the remaining code. Comment out half of THAT.
   - **No** → Bug is in the commented code. Uncomment half back.
3. Repeat until you find the exact line

### The Fresh Eyes Method

When you're stuck:
1. Take a 5-minute break
2. Explain the problem out loud (rubber duck debugging)
3. Or explain it to Claude: "I expected X to happen but Y happened instead"

### The Minimal Reproduction

If a bug is complex:
1. Create a new file
2. Copy ONLY the code needed to show the bug
3. Remove everything else
4. Often, you'll find the bug during this process

---

## 8. Common Error Patterns

### "Module not found"

```
Module not found: Can't resolve './components/Button'
```

**Causes:**
- File doesn't exist at that path
- Typo in the import path
- Missing file extension (sometimes needed)
- Case sensitivity (`Button` vs `button`)

**Fix:**
- Check the file actually exists
- Check spelling exactly
- Check capitalization (Linux servers are case-sensitive)

### "Cannot read properties of undefined"

```
TypeError: Cannot read properties of undefined (reading 'name')
```

**Cause:** You're accessing `.name` on something that's `undefined`.

**Common scenarios:**
```typescript
// Data hasn't loaded yet
const user = await getUser()  // Returns undefined
console.log(user.name)        // 💥 Crash

// Fix: Check first
if (user) {
  console.log(user.name)
}
// Or: Optional chaining
console.log(user?.name)
```

### "Objects are not valid as a React child"

```
Error: Objects are not valid as a React child (found: object with keys {name, email})
```

**Cause:** You're trying to render an object directly.

```typescript
// ❌ BAD
<div>{user}</div>  // user is an object

// ✅ GOOD
<div>{user.name}</div>
// Or for debugging:
<pre>{JSON.stringify(user, null, 2)}</pre>
```

### "Too many re-renders"

```
Error: Too many re-renders. React limits the number of renders to prevent an infinite loop.
```

**Cause:** Setting state during render, causing infinite loop.

```typescript
// ❌ BAD - Sets state every render
function Component() {
  const [count, setCount] = useState(0)
  setCount(count + 1)  // 💥 Infinite loop
  return <div>{count}</div>
}

// ✅ GOOD - Only set state in response to something
function Component() {
  const [count, setCount] = useState(0)
  return (
    <button onClick={() => setCount(count + 1)}>
      {count}
    </button>
  )
}
```

### "Failed to fetch" / "Network error"

**Causes:**
- Server is down
- Wrong URL
- CORS issue
- No internet connection
- API route crashed (check terminal)

**Debug steps:**
1. Check terminal for server errors
2. Check Network tab for status code
3. Try the URL directly in browser
4. Check if it works in Postman/curl

---

## 9. When to Google vs Ask Claude

### Google when:
- You have an exact error message
- It's a library-specific issue
- You want to see multiple solutions
- The error is common (Stack Overflow probably has it)

**Good Google searches:**
- `"Cannot read properties of undefined" React`
- `Next.js 15 middleware not working`
- `Supabase RLS policy not applying`

### Ask Claude when:
- You have context about YOUR code
- You need to understand WHY something is happening
- You want a solution tailored to your project
- Google results are confusing or outdated

**Good Claude questions:**
- "Here's my code [paste]. I expect X but Y happens. Why?"
- "I'm getting this error [paste]. Here's the relevant file [paste]. Help me fix it."
- "What's the best way to handle [scenario] in Next.js 15 with Supabase?"

---

## 10. The Debug Checklist

When something's broken, go through this:

```markdown
## Debug Checklist

### 1. Identify
- [ ] What exactly is broken? (Be specific)
- [ ] What did you expect to happen?
- [ ] What actually happened?

### 2. Locate
- [ ] Check terminal for errors
- [ ] Check browser console
- [ ] Check network tab
- [ ] Check Vercel logs (if production)
- [ ] Check Supabase logs (if database related)

### 3. Reproduce
- [ ] Can you make it happen again?
- [ ] Does it happen every time or sometimes?
- [ ] Does it happen locally, production, or both?

### 4. Isolate
- [ ] What's the smallest action that causes it?
- [ ] Did it work before? What changed?
- [ ] Does it happen with different data?

### 5. Fix
- [ ] Do you understand the root cause?
- [ ] Is your fix addressing the root cause or just the symptom?
- [ ] Could this fix break anything else?

### 6. Verify
- [ ] Does the original bug still happen?
- [ ] Did you test the exact scenario that was broken?
- [ ] Are there related scenarios to test?

### 7. Learn
- [ ] Why did this happen?
- [ ] How can you prevent it in the future?
- [ ] Should this go in the Error Diary?
```

---

## 11. Getting Help from Claude

### The Perfect Bug Report

```
**What I'm trying to do:**
[One sentence goal]

**What I expected:**
[What should have happened]

**What actually happened:**
[What went wrong]

**Error message (if any):**
[Paste the full error]

**Relevant code:**
[Paste the file or function]

**What I've already tried:**
[List your attempts]
```

### Example

```
**What I'm trying to do:**
Load user's projects on the dashboard page

**What I expected:**
A list of projects to appear

**What actually happened:**
Empty array, even though I have projects in the database

**Error message:**
None - no errors in console or terminal

**Relevant code:**
// app/dashboard/page.tsx
export default async function Dashboard() {
  const supabase = createServerClient()
  const { data: projects } = await supabase
    .from('projects')
    .select('*')
  
  console.log('Projects:', projects)  // Logs: []
  
  return <ProjectList projects={projects} />
}

**What I've already tried:**
- Checked the database - projects exist
- Checked I'm logged in - I am
- No errors anywhere
```

Claude can now immediately identify this is likely an RLS issue.

---

## Summary

| Problem Type | Where to Look | What to Share |
|--------------|---------------|---------------|
| Won't compile | Terminal | Full error message |
| Page crashes | Browser Console | Error + stack trace |
| API not working | Network Tab | Status code + response |
| Data not appearing | Supabase Logs | Query + RLS policies |
| Production issue | Vercel Logs | Function logs + error |
| Styling broken | Browser Elements tab | Screenshot + CSS |

**Remember:**
1. Read the error message carefully
2. Find YOUR code in the stack trace
3. Reproduce before you fix
4. Fix the root cause, not the symptom
5. Verify the fix works

When stuck, share context with Claude. The more information you provide, the faster you'll get a solution.

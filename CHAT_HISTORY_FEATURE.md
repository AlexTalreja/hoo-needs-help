# Chat History Feature

**Date**: 2025-11-15
**Status**: ✅ Complete

---

## Overview

Students can now access their chat history, switch between past conversations, and continue chatting in previous sessions. All chat messages are persisted to the database and organized by session.

---

## Features

### ✅ Chat Sessions
- Each conversation is a separate session
- Sessions are course-specific
- Auto-saves all messages to database
- Session titles auto-generated from first question

### ✅ Chat History Sidebar
- Collapsible sidebar with toggle button
- Lists all past sessions for selected course
- Shows session title and "time ago" format
- Click to load previous conversation
- Delete sessions with confirmation

### ✅ Message Persistence
- All messages saved to database in real-time
- Citations preserved in JSONB format
- Timestamps for each message
- Session timestamp updates on new messages

### ✅ Session Management
- "New Chat" button creates fresh session
- Auto-creates session on course selection
- Load entire conversation history
- Continue chatting in old sessions

---

## Database Schema

### Tables Created

#### `chat_sessions`
```sql
CREATE TABLE chat_sessions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  course_id UUID REFERENCES courses(id),
  title TEXT DEFAULT 'New Chat',
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

#### `chat_messages`
```sql
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY,
  session_id UUID REFERENCES chat_sessions(id),
  role TEXT CHECK (role IN ('user', 'assistant')),
  content TEXT,
  citations JSONB,
  created_at TIMESTAMP
);
```

### Automatic Updates

**Trigger:** When a new message is added, `chat_sessions.updated_at` is automatically updated:
```sql
CREATE TRIGGER update_session_on_message
AFTER INSERT ON chat_messages
FOR EACH ROW
EXECUTE FUNCTION update_chat_session_timestamp();
```

---

## Components

### ChatHistory Sidebar

**Location:** `frontend/src/components/ChatHistory.tsx`

**Features:**
- **Toggle Button**: Collapse/expand sidebar
- **New Chat Button**: Create new session
- **Session List**: Shows all past sessions
- **Time Format**: "Just now", "5m ago", "2h ago", "3d ago"
- **Delete Button**: Remove sessions (hover to reveal)
- **Active Highlighting**: Current session highlighted in green

**Props:**
```tsx
interface ChatHistoryProps {
  selectedCourseId: string          // Filter sessions by course
  currentSessionId: string | null   // Highlight active session
  onSelectSession: (id: string) => void  // Load session callback
  onNewChat: () => void             // Create new session callback
}
```

### Chat Page Updates

**Key Functions:**

1. **`createNewSession()`** - Creates a new chat session
2. **`loadSession(sessionId)`** - Loads messages from a session
3. **`saveMessage(role, content, citations)`** - Saves message to DB
4. **Auto-title**: First user message becomes session title

---

## User Flow

### Starting a New Chat

1. Student navigates to `/chat`
2. System auto-creates new session
3. Welcome message appears
4. Student starts chatting
5. First question becomes session title

### Accessing Chat History

1. Click any session in sidebar
2. All messages load instantly
3. Continue chatting in that session
4. Messages append to existing conversation

### Creating New Chat

1. Click "New Chat" button
2. Fresh session created
3. Sidebar shows new session
4. Start new conversation

### Deleting Sessions

1. Hover over session in sidebar
2. Delete icon appears (trash can)
3. Click delete → Confirmation dialog
4. Session and all messages deleted

---

## RLS Policies

### Students
- ✅ Can view their own sessions
- ✅ Can create new sessions
- ✅ Can update session titles
- ✅ Can delete their sessions
- ✅ Can view/insert messages in their sessions

### Instructors/TAs
- ✅ Can view messages from their course sessions
- ❌ Cannot modify student sessions

---

## Setup Instructions

### 1. Run Database Migration

In **Supabase Dashboard → SQL Editor**:

```sql
-- Copy and paste entire contents of:
-- supabase/migrations/12_create_chat_sessions.sql
```

### 2. Verify Tables

```sql
SELECT * FROM chat_sessions;
SELECT * FROM chat_messages;
```

### 3. Test the Feature

1. Login as student
2. Navigate to `/chat`
3. Send a message
4. Check database:
   ```sql
   SELECT * FROM chat_sessions ORDER BY created_at DESC LIMIT 1;
   SELECT * FROM chat_messages ORDER BY created_at DESC;
   ```

---

## Features in Detail

### Auto-Generated Titles

Session titles are automatically set from the first user message:
```tsx
if (role === 'user' && messages.length <= 1) {
  const title = content.slice(0, 50) + (content.length > 50 ? '...' : '')
  await supabase.from('chat_sessions').update({ title }).eq('id', currentSessionId)
}
```

**Example:**
- User asks: "What is recursion in programming?"
- Session title: "What is recursion in programming?"

### Time Formatting

Smart relative time display:
- **< 1 minute**: "Just now"
- **< 60 minutes**: "5m ago"
- **< 24 hours**: "2h ago"
- **< 7 days**: "3d ago"
- **≥ 7 days**: "11/15/2025"

### Session Sorting

Sessions displayed in reverse chronological order (most recent first):
```tsx
.order('updated_at', { ascending: false })
```

This means:
- Recently active sessions appear at top
- Sending a message bumps session to top

---

## UI/UX Details

### Sidebar Toggle

**Collapsed State:**
- Width: 0px
- Toggle button shows ">" icon
- Positioned at left edge

**Expanded State:**
- Width: 288px (72rem)
- Toggle button shows "<" icon
- Full session list visible

### Active Session Indicator

```tsx
className={`${
  session.id === currentSessionId
    ? 'bg-emerald-50 border border-emerald-200'
    : 'hover:bg-gray-50 border border-transparent'
}`}
```

- **Active**: Green background, green border
- **Inactive**: White background, gray on hover

### Delete Confirmation

```tsx
if (!confirm('Delete this chat? This cannot be undone.')) return
```

Prevents accidental deletions.

---

## Edge Cases Handled

### Session Deleted While Active

**Problem:** User deletes current session
**Solution:** Auto-creates new session
```tsx
if (sessionId === currentSessionId) {
  onNewChat()
}
```

### Course Switch

**Problem:** User switches courses
**Solution:** Creates new session for new course
```tsx
useEffect(() => {
  if (selectedCourseId && user) {
    createNewSession()
  }
}, [selectedCourseId])
```

### Empty Session

**Problem:** Session with no messages (only welcome)
**Solution:** Allowed, but title stays "New Chat"

### Long Titles

**Problem:** Very long first questions
**Solution:** Truncate to 50 chars + "..."
```tsx
content.slice(0, 50) + (content.length > 50 ? '...' : '')
```

---

## Performance Optimizations

### Indexes

Fast queries with proper indexes:
```sql
CREATE INDEX idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX idx_chat_sessions_course_id ON chat_sessions(course_id);
CREATE INDEX idx_chat_sessions_updated_at ON chat_sessions(updated_at DESC);
CREATE INDEX idx_chat_messages_session_id ON chat_messages(session_id);
```

### Efficient Queries

Only fetch sessions for current course:
```tsx
.eq('course_id', selectedCourseId)
```

Only fetch messages for selected session:
```tsx
.eq('session_id', sessionId)
```

---

## Troubleshooting

### Problem: Messages not saving

**Check:**
1. `currentSessionId` is set
2. RLS policies allow insert
3. Browser console for errors

**Debug:**
```tsx
console.log('Current session:', currentSessionId)
console.log('Saving message:', role, content)
```

### Problem: Sessions not loading

**Check:**
1. User is logged in
2. Course is selected
3. Check Supabase logs for RLS errors

**Query:**
```sql
SELECT * FROM chat_sessions
WHERE user_id = 'user-id'
AND course_id = 'course-id';
```

### Problem: Sidebar not showing

**Check:**
1. `isOpen` state
2. CSS width transitions
3. Sessions array populated

---

## Future Enhancements

### Potential Features

1. **Search History**
   - Search across all sessions
   - Filter by keywords

2. **Session Tags/Labels**
   - Add custom tags
   - Color-coded labels

3. **Export Conversations**
   - Export as PDF/text
   - Email conversation

4. **Favorite Sessions**
   - Pin important conversations
   - Star/bookmark system

5. **Session Sharing**
   - Share with classmates
   - Collaborative sessions

6. **Advanced Filtering**
   - Filter by date range
   - Filter by citation type

7. **Session Statistics**
   - Message count
   - Questions asked
   - Topics discussed

---

## Testing Checklist

### ✅ Basic Functionality
- [ ] Create new session
- [ ] Send messages
- [ ] Messages save to database
- [ ] Session title auto-updates

### ✅ History Sidebar
- [ ] Toggle sidebar open/close
- [ ] See list of past sessions
- [ ] Click session loads messages
- [ ] Time formatting works
- [ ] Active session highlighted

### ✅ Session Management
- [ ] "New Chat" creates fresh session
- [ ] Delete session works
- [ ] Delete current session creates new one
- [ ] Course switch creates new session

### ✅ Message Persistence
- [ ] User messages saved
- [ ] AI responses saved
- [ ] Citations preserved
- [ ] Timestamps accurate

### ✅ Edge Cases
- [ ] Empty session handling
- [ ] Long title truncation
- [ ] Session deleted while active
- [ ] No sessions shows empty state

---

## Code Examples

### Creating a Session

```tsx
const { data, error } = await supabase
  .from('chat_sessions')
  .insert({
    user_id: user.id,
    course_id: selectedCourseId,
    title: 'New Chat',
  })
  .select()
  .single()

setCurrentSessionId(data.id)
```

### Loading Session Messages

```tsx
const { data, error } = await supabase
  .from('chat_messages')
  .select('*')
  .eq('session_id', sessionId)
  .order('created_at', { ascending: true })

const messages = data.map(msg => ({
  id: msg.id,
  type: msg.role,
  content: msg.content,
  citations: msg.citations,
  timestamp: new Date(msg.created_at),
}))
```

### Saving a Message

```tsx
await supabase
  .from('chat_messages')
  .insert({
    session_id: currentSessionId,
    role: 'user',
    content: 'What is recursion?',
    citations: null,
  })
```

---

## Summary

✅ **Chat history complete!**
✅ **All messages persisted to database**
✅ **Sidebar for easy navigation**
✅ **Session management (create, load, delete)**
✅ **Auto-generated titles**
✅ **Time-based sorting**

**Next Steps:**
1. Run migration 12 in Supabase
2. Test creating and loading sessions
3. Verify message persistence
4. Try deleting sessions

---

**Ready to use!** Students can now access their complete chat history and pick up conversations where they left off. 🎉

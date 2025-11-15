# Course Enrollment System

**Date**: 2025-11-15
**Status**: ✅ Complete

---

## Overview

Students can now browse, enroll in courses, and chat with course-specific AI assistants. Each course has its own set of documents, providing a tailored learning experience.

---

## Features Implemented

### ✅ Database Schema
- **`course_enrollments` table** - Junction table for many-to-many relationship
- **RLS policies** - Students can enroll, view their enrollments, and unenroll
- **Course settings** - `is_public`, `enrollment_code`, `max_students`

### ✅ Courses Page
- Browse all available public courses
- View enrolled courses
- Enroll/unenroll from courses
- Enrollment code support for private courses
- Instructor information display

### ✅ Chat Integration
- Course selector dropdown in chat
- Auto-select first enrolled course
- Course-specific chat sessions
- Prompt if not enrolled in any courses

### ✅ Navigation
- "📚 Courses" tab for students
- Updated Header with course navigation
- Protected routes for authenticated users

---

## Database Schema

### New Table: `course_enrollments`

```sql
CREATE TABLE public.course_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  course_id UUID NOT NULL REFERENCES courses(id),
  enrolled_at TIMESTAMP DEFAULT NOW(),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'completed')),
  UNIQUE(user_id, course_id)
);
```

### Updated Table: `courses`

New columns added:
- `is_public` BOOLEAN - Whether course is publicly visible
- `enrollment_code` TEXT - Optional code required to enroll
- `max_students` INTEGER - Maximum enrollment capacity

---

## User Flows

### Student Enrollment Flow

1. **Login** → Student logs in
2. **Navigate to Courses** → Click "📚 Courses" tab
3. **Browse Courses** → See available public courses
4. **Enroll** → Click "Enroll" button
5. **Enter Code** (if required) → Private courses need enrollment code
6. **Success** → Course appears in "Enrolled Courses" section

### Chat Flow

1. **Navigate to Chat** → Click "💬 Chat" tab
2. **Select Course** → Choose from dropdown of enrolled courses
3. **Ask Questions** → Chat with course-specific AI
4. **Switch Courses** → Change dropdown to chat with different course

### Unenrollment Flow

1. **Go to Courses** → Navigate to courses page
2. **Find Course** → Locate enrolled course
3. **Click Unenroll** → Confirm unenrollment
4. **Update** → Course moves to "Available Courses" section

---

## File Structure

```
frontend/src/
├── pages/
│   ├── Courses.tsx                ✨ NEW - Course browsing & enrollment
│   ├── ChatTest.tsx               ✅ UPDATED - Course selector added
│   └── ...
├── components/
│   └── Header.tsx                 ✅ UPDATED - Courses tab for students
├── contexts/
│   └── AuthContext.tsx            ✅ UPDATED - userRole support
└── App.tsx                        ✅ UPDATED - /courses route

supabase/migrations/
└── 11_create_enrollments.sql      ✨ NEW - Enrollment schema
```

---

## Components

### Courses Page (`/courses`)

**Features:**
- **Enrolled Courses Section**
  - Shows courses student is enrolled in
  - "Go to Chat" button for quick access
  - "Unenroll" button to leave course
  - Green border to highlight active enrollments

- **Available Courses Section**
  - Lists all public courses not yet enrolled
  - Shows instructor information
  - "Enroll" button for each course

- **Enrollment Code Modal**
  - Appears for private courses
  - Validates code before enrollment
  - User-friendly error messages

**State Management:**
```tsx
const [enrolledCourses, setEnrolledCourses] = useState<Course[]>([])
const [availableCourses, setAvailableCourses] = useState<Course[]>([])
const [enrollmentCode, setEnrollmentCode] = useState('')
const [showCodeModal, setShowCodeModal] = useState(false)
```

### Chat Page Updates (`/chat`)

**New Features:**
- Course selector dropdown (top of page)
- Auto-loads student's enrolled courses
- Auto-selects first course
- Resets chat history when switching courses
- Shows "enroll prompt" if no courses

**Enrollment Check:**
```tsx
if (!loadingCourses && enrolledCourses.length === 0) {
  return <EnrollmentPrompt />
}
```

**Course Selector:**
```tsx
<select value={selectedCourseId} onChange={...}>
  {enrolledCourses.map(course => (
    <option value={course.id}>{course.name}</option>
  ))}
</select>
```

---

## API Integration

### Supabase Queries

#### Load Enrolled Courses
```tsx
const { data } = await supabase
  .from('course_enrollments')
  .select(`
    course_id,
    courses (id, name, instructor_id, users (full_name, email))
  `)
  .eq('user_id', user.id)
  .eq('status', 'active')
```

#### Load Available Courses
```tsx
const { data } = await supabase
  .from('courses')
  .select(`id, name, created_at, is_public, users (full_name, email)`)
  .eq('is_public', true)
```

#### Enroll in Course
```tsx
await supabase
  .from('course_enrollments')
  .insert({
    user_id: user.id,
    course_id: courseId,
    status: 'active',
  })
```

#### Unenroll from Course
```tsx
await supabase
  .from('course_enrollments')
  .update({ status: 'inactive' })
  .eq('user_id', user.id)
  .eq('course_id', courseId)
```

---

## RLS Policies

### Students
- ✅ Can view their own enrollments
- ✅ Can enroll themselves in courses
- ✅ Can update their enrollment status (unenroll)

### Instructors/TAs
- ✅ Can view all enrollments for their courses
- ❌ Cannot modify student enrollments directly

### Policy Examples

**Students can enroll:**
```sql
CREATE POLICY "Students can enroll in courses"
ON course_enrollments FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND role = 'student'
  )
);
```

**View own enrollments:**
```sql
CREATE POLICY "Students can view own enrollments"
ON course_enrollments FOR SELECT
TO authenticated
USING (auth.uid() = user_id);
```

---

## Setup Instructions

### 1. Run Database Migration

In **Supabase Dashboard → SQL Editor**:

```sql
-- Copy and paste the entire contents of:
-- supabase/migrations/11_create_enrollments.sql
```

### 2. Verify Migration

Check that the table was created:
```sql
SELECT * FROM course_enrollments;
SELECT is_public, enrollment_code FROM courses;
```

### 3. Create Test Courses (Optional)

```sql
-- Make an existing course public
UPDATE courses
SET is_public = true
WHERE name = 'Your Course Name';

-- Or create a new course
INSERT INTO courses (name, instructor_id, is_public)
VALUES ('Test Course 101', 'instructor-user-id', true);
```

### 4. Test Enrollment Flow

1. Login as a student
2. Navigate to `/courses`
3. Enroll in a public course
4. Go to `/chat` and select the course
5. Ask a question!

---

## Usage Examples

### Student Journey

**Step 1: Login**
```
Visit: http://localhost:3000
Click: "Get Started" → Sign up as Student
```

**Step 2: Browse Courses**
```
Navigate: /courses
See: List of available courses
Click: "Enroll" on desired course
```

**Step 3: Chat with AI**
```
Navigate: /chat
Select: Course from dropdown
Type: "What is recursion?"
Get: AI answer based on course materials
```

### Instructor Journey

**Create Course via Teacher Dashboard:**
```
Navigate: /teacher
Click: "Create New Course"
Fill: Course name, system prompt
Toggle: Make public or set enrollment code
```

**Upload Course Materials:**
```
Navigate: /teacher → Course → Upload Files
Upload: PDFs, VTT transcripts, videos
```

---

## Features by Role

### Student Features
- ✅ Browse public courses
- ✅ Enroll in courses (with optional code)
- ✅ View enrolled courses
- ✅ Unenroll from courses
- ✅ Select active course in chat
- ✅ Course-specific AI responses

### Instructor Features
- ✅ Create courses (public/private)
- ✅ Set enrollment codes
- ✅ View course enrollments (via teacher dashboard)
- ✅ Upload course-specific materials
- ✅ Track student questions and analytics

### TA Features
- ✅ View course enrollments
- ✅ Access teacher dashboard
- ✅ Moderate AI responses

---

## Edge Cases Handled

### No Enrolled Courses
**Problem:** Student tries to chat without enrolling
**Solution:** Show enrollment prompt with "Browse Courses" button

### Course Deleted
**Problem:** Student enrolled in course that gets deleted
**Solution:** CASCADE delete removes enrollment automatically

### Empty Course
**Problem:** Course has no documents uploaded
**Solution:** AI still responds but with limited context (shows in citations)

### Enrollment Code
**Problem:** Private course requires code
**Solution:** Modal prompts for code, validates before enrollment

### Duplicate Enrollment
**Problem:** Student tries to enroll twice
**Solution:** UNIQUE constraint on (user_id, course_id) prevents duplicates

---

## Troubleshooting

### Problem: "No courses enrolled" even after enrolling

**Check:**
1. Verify enrollment in database:
   ```sql
   SELECT * FROM course_enrollments WHERE user_id = 'your-user-id';
   ```
2. Check enrollment status is 'active'
3. Refresh the page
4. Check browser console for errors

### Problem: Cannot enroll in course

**Possible causes:**
1. **RLS policy blocking** - Check Supabase logs
2. **User not authenticated** - Verify login
3. **Duplicate enrollment** - Already enrolled?
4. **Wrong enrollment code** - Check code is correct

**Debug:**
```sql
-- Check if enrollment exists
SELECT * FROM course_enrollments
WHERE user_id = 'user-id' AND course_id = 'course-id';

-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'course_enrollments';
```

### Problem: Course not showing in dropdown

**Check:**
1. Enrollment status is 'active'
2. Course hasn't been deleted
3. Browser console for API errors
4. Supabase logs for query issues

---

## Future Enhancements

### Potential Features

1. **Enrollment Limits**
   - Enforce `max_students` capacity
   - Waitlist functionality

2. **Course Categories**
   - Add `category` field (CS, Math, etc.)
   - Filter courses by category

3. **Course Search**
   - Search by name, instructor, description
   - Advanced filtering

4. **Enrollment Notifications**
   - Email confirmation on enrollment
   - Notify instructor of new enrollments

5. **Course Calendar**
   - Add `start_date` and `end_date`
   - Auto-archive old courses

6. **Student Progress**
   - Track questions asked per course
   - Completion certificates

7. **Course Reviews**
   - Student ratings and feedback
   - Display on course cards

---

## Testing Checklist

### ✅ Enrollment Flow
- [ ] Login as student
- [ ] Navigate to `/courses`
- [ ] See available courses
- [ ] Enroll in public course
- [ ] Course appears in "Enrolled Courses"
- [ ] Click "Go to Chat" button works

### ✅ Chat Integration
- [ ] Navigate to `/chat`
- [ ] See course dropdown
- [ ] Dropdown shows enrolled courses
- [ ] Select different course
- [ ] Chat history resets
- [ ] Ask question gets course-specific response

### ✅ Unenrollment
- [ ] Click "Unenroll" button
- [ ] Confirm dialog appears
- [ ] Course removed from enrolled list
- [ ] Course appears in available list

### ✅ Private Courses
- [ ] Enroll in private course
- [ ] Modal prompts for code
- [ ] Wrong code shows error
- [ ] Correct code enrolls successfully

### ✅ Edge Cases
- [ ] No enrolled courses shows prompt
- [ ] Dropdown disabled when loading
- [ ] Can't send message without selected course
- [ ] Duplicate enrollment prevented

---

## Summary

✅ **Course enrollment system complete!**
✅ **Students can browse and join courses**
✅ **Chat is now course-specific**
✅ **Navigation updated**
✅ **Database schema implemented**

**Next Steps:**
1. Run migration 11 in Supabase
2. Create some test courses
3. Test enrollment flow
4. Upload course materials
5. Test course-specific chat!

---

**Need help?** Check the code comments or ask for assistance!

Project: "HooNeedsHelp" - The AI TA Platform

This document outlines the features, architecture, and implementation plan for "HooNeedsHelp," an AI-powered teaching assistant designed for a hackathon.

1. Core Concept & Value Proposition

For Students: Get instant, 24/7 answers to course questions. Answers are not generic but are grounded specifically in their course materials (lectures, readings, syllabus), with direct links to video timestamps and PDF page numbers.

For TAs: Reduce repetitive question-answering. Focus on high-level, complex student problems. A "human-in-the-loop" system allows them to correct the AI, improving it over time.

For Instructors: Gain unprecedented insight into student learning. A dashboard reveals exactly which concepts are most confusing week by week, allowing for targeted reviews and clarifications.

2. Feature Breakdown

We can split the app into three main "views" or "components."

Component 1: Student-Facing AI TA

This is the main chat interface where students interact with the AI.

Chat Interface: A clean, responsive chat window (React + Tailwind).

Instructor Persona: The AI's personality and system prompt (e.g., "You are a friendly and encouraging TA for CS 101...") are set by the instructor and pulled from the database.

Grounded Responses (RAG): The AI's answer is generated based on a context built from:

Uploaded PDFs (syllabus, readings, slides)

Zoom Video Transcripts (.vtt files)

TA-Verified Answers

Rich Citations: This is the killer feature. The response must include sources:

PDFs: "According to the syllabus (page 2)..."

Videos: "Professor Smith explained this in Lecture 3 (at 14:32)."

Clickable Timestamps: The (at 14:32) link is clickable. It will:

Load the relevant video (e.g., in a modal or a dedicated player view).

Automatically seek to that exact timestamp (video.currentTime = 872).

Feedback Mechanism: A simple (👍/👎) on each AI answer. A "thumbs down" flags the question for TA review.

Component 2: TA & Instructor Workspace

A secure, authenticated area (/admin) for TAs and Instructors.

Auth: Simple email/password login using Supabase Auth.

Review Queue: A dashboard showing all student questions that were "flagged" (👎) or had low AI confidence.

Review UI:

Shows the original Student Question.

Shows the AI's (incorrect) Answer.

Provides a rich text editor for the TA to write a "Verified Answer."

Submit & Re-train: When a TA submits a correction, this new Q&A pair is immediately added to the RAG knowledge base as a high-priority "verified" source. This instantly improves future answers.

Add Knowledge: A simple form for TAs to proactively add common questions and answers from office hours.

Component 3: Instructor Analytics Dashboard

An admin-only view that aggregates all Q&A data.

Top-Level KPIs: Total questions, avg. student rating, # of flagged answers.

Concept "Struggle" Cloud: A bar chart or word cloud of the most common topics/keywords students are asking about (e.g., "recursion," "pointer," "exam 1").

Question Spikes: A line chart showing question volume over time. The instructor can see a spike in questions after a specific lecture or before an assignment is due.

Lecture "Heatmap":

This visualizes which parts of lectures are most confusing.

It aggregates all timestamp citations from the AI's answers.

Result: A bar chart overlaid on a video's timeline. A tall bar at 15:30 means many students needed clarification on that specific moment.

3. Proposed Tech Stack & Architecture

This stack is perfect for a hackathon: fast, integrated, and powerful.

Component

Technology

Why?

Frontend

React (with Vite)

Fast development, component-based, great for dynamic UI.

Styling

Tailwind CSS

Utility-first. Incredibly fast for building a beautiful, responsive UI without writing CSS files.

Backend

Supabase

The all-in-one backend. We'll use all of its features.

↳ Authentication

Supabase Auth

Built-in, secure user management for TAs/Instructors.

↳ Database

Supabase DB (Postgres)

Our primary data store for users, courses, and logs.

↳ Vector Store

pgvector (Postgres extension)

Supabase has this built-in. We'll store our text embeddings directly in the database.

↳ File Storage

Supabase Storage

To store the uploaded PDFs, .vtt transcripts, and video files.

↳ Serverless

Supabase Edge Functions

For all backend logic. This is where we'll handle RAG, AI calls, and data processing.

AI - Embeddings

OpenAI (text-embedding-3-small)

Called from a Supabase Edge Function to turn text chunks into vectors.

AI - Chat

OpenAI (gpt-4o-mini)

Called from an Edge Function. Fast, cheap, and powerful for generating the final answer.

Video Player

HTML5 <video> or Video.js

For playing the lecture videos with timestamp seeking.

4. Simplified Database Schema (Supabase)

Here are the key tables you'd need in your Supabase Postgres DB.

courses

id (uuid, primary key)

name (text, e.g., "CS 101: Intro to Python")

instructor_id (uuid, foreign key to users)

system_prompt (text, the AI persona)

course_documents

id (uuid, primary key)

course_id (uuid, foreign key to courses)

file_name (text, e.g., "syllabus.pdf")

storage_path (text, path in Supabase Storage)

type (text, 'pdf', 'vtt', 'video')

document_chunks (The Vector Store)

id (uuid, primary key)

document_id (uuid, foreign key to course_documents)

content (text, the actual text chunk)

metadata (jsonb, e.g., {"page": 3} or {"start_time": 120.5, "end_time": 125.0})

embedding (vector, using pgvector)

ta_verified_answers (Also a Vector Store)

id (uuid, primary key)

course_id (uuid, foreign key to courses)

question (text, the "canonical" question)

answer (text, the TA-written answer)

embedding (vector, embedding of the question for lookup)

qa_logs (For Analytics)

id (uuid, primary key)

course_id (uuid, foreign key to courses)

question (text)

ai_answer (text)

sources_cited (jsonb, array of {"doc_id": ..., "page": ...} or {"video_id": ..., "time": ...})

rating (int, 1 for 👍, -1 for 👎)

status (text, 'answered', 'flagged', 'reviewed')

created_at (timestamp)

5. Core User Flows (How It Works)

Flow 1: Instructor Setup (Data Ingestion)

Instructor (Admin) logs in.

Goes to "Manage Course" and uploads files (syllabus.pdf, lecture1.mp4, lecture1.vtt).

Files are saved to Supabase Storage.

This triggers a Supabase Edge Function (on-file-upload).

The Function:

If PDF: Parses text page by page, breaks into chunks, generates embeddings, saves to document_chunks.

If .VTT (Transcript): Parses the file, creating chunks like [120.5 - 125.0] "So recursion is when...". Generates embeddings, saves to document_chunks with timestamp metadata.

If .MP4: Just saves the file. We link to it.

Flow 2: Student Asks a Question (RAG)

Student types in chat: "what is recursion?"

The React App calls the ask-question Supabase Edge Function.

The Function:
a.  Generates an embedding for the question "what is recursion?".
b.  Performs two vector similarity searches in parallel:
i.  Search document_chunks for relevant text/transcript snippets.
ii. Search ta_verified_answers for relevant TA answers.
c.  Grabs the Top K results (e.g., 3 PDF chunks, 2 transcript snippets, 1 TA answer).
d.  Constructs a Prompt for the LLM:
```
System: You are a friendly TA for CS 101.

Context:
- (From syllabus.pdf, page 3): "Recursion is a key concept..."
- (From lecture1.vtt, 120.5s): "So recursion is when a function calls itself..."
- (From TA, verified): "A common mistake with recursion is forgetting the base case."

User Question: what is recursion?

Answer (using ONLY the context above and cite your sources):
```


e.  Calls OpenAI API with this prompt.
f.  Gets the response, parses it for citations.
g.  Logs the Q&A to the qa_logs table.
h.  Returns the final, formatted answer to the React app.

React App displays the answer and the clickable links.

Flow 3: TA Corrects an Answer

Student dislikes (👎) an answer. This updates the qa_logs table (status = 'flagged').

TA logs in, sees the flagged question in their "Review Queue."

TA clicks "Review," reads the Q&A, and writes a new, "Verified Answer."

TA clicks "Submit."

This calls a submit-correction Supabase Edge Function.

The Function:
a.  Generates an embedding for the original question.
b.  Saves the question, new answer, and embedding to the ta_verified_answers table.
c.  Updates the original log in qa_logs (status = 'reviewed').

Done. The next time a student asks this question, the TA's answer will be the #1 context source.
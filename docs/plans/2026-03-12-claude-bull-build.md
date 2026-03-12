# Claude Bull — Full Application Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the Claude Bull equity research web app — a 3-screen Next.js application that reads SEC filings and produces investment memos, supporting Anthropic, OpenAI, Google Gemini, Groq, and OpenRouter as AI providers.

**Architecture:** Next.js 14 App Router with a provider-agnostic AI layer (Vercel AI SDK). BYOK — all API keys stored encrypted in localStorage, never server-side. SEC EDGAR free public API fetches filings. Research runs as 9 sequential streaming steps.

**Tech Stack:** Next.js 14 · TypeScript · Tailwind CSS · shadcn/ui · Vercel AI SDK (ai, @ai-sdk/anthropic, @ai-sdk/openai, @ai-sdk/google, @ai-sdk/groq) · SEC EDGAR REST API · Zod · Zustand · Vitest


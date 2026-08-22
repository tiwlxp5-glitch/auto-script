# Auto Script Project Rules

## 1. Code Explanation Rule
When providing code blocks or technical commands to the user, the agent MUST ALWAYS explain what each part of the code does in detail. 
- Do not just output code blocks and ask the user to copy-paste them.
- Break the code down into logical sections and explain the 'why' and 'how'.
- Use simple analogies (like building blocks, security guards, etc.) to explain complex logic, keeping in mind that the user is a beginner.

## 2. Gemini Model Version Rule
When writing code that integrates with the Google Gemini API (e.g., using `@google/genai`), ALWAYS use the `gemini-3.6-flash` model (or the explicitly required latest version). Do NOT use `gemini-2.5-flash` or older models, as they are deprecated for new users and will result in a 404 "NOT_FOUND" / "UNAUTHENTICATED" API error.

## 3. Proactive Compliance & Security Warning Rule
The agent MUST proactively warn the user about any critical platform rules, Terms of Service (ToS) violations (e.g., using Vercel free tier for commercial SaaS), licensing issues, or data privacy concerns (e.g., PDPA, GDPR, safeguarding personal data). If a requested action or architectural choice poses a compliance or security risk, the agent must alert the user immediately and suggest a safer, compliant alternative, rather than just executing the request blindly.

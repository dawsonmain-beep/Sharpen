---
name: sharpen
description: Rewrite a rough prompt into the prompt its author meant, using the conversation to name what it refers to. Use when the user says "sharpen this prompt", "enhance this prompt", "improve my prompt", "make this a better prompt", or /sharpen.
---

# Sharpen

The UI half of this plugin adds a **✨ Sharpen** button above the prompt box. It rewrites the draft in place and opens a "Sharpen" pane with the readings it chose, any questions, and what changed. `/sharpen` is this skill: you sharpen the prompt in chat.

When the user asks you in chat to sharpen or enhance a prompt, follow the meta-prompt in `hooks/core.ts` (the `SYSTEM` constant) exactly. It was chosen by a blind evaluation on the owner's real prompts. In short:

1. Write what the author wants so plainly that the agent cannot misread it, in the author's own voice. Name every reference ("it", "option 2", "like we discussed") from the conversation; never guess one.
2. The author decides. Do not choose for them, and do not add instructions, constraints, approval steps or deliverables they did not give. A real question stays a question; a report that something is wrong asks for the fix.
3. Match the size of the ask. A reply or small follow-up stays one to three sentences. An ordinary task is a short paragraph with one check the agent can run itself. Only a large project gets parts.
4. State nothing as fact that the draft or the conversation does not show. Keep names, numbers, paths, URLs, code and slash commands exactly. Never leave a placeholder.
5. Most drafts need no question. Ask at most two, and only what the author alone can answer.

Reply with:

1. **The sharpened prompt**, ready to copy, in one code block.
2. **Readings**: each reading of the author's words you had to choose, or none.
3. **What changed**: one to four short bullets.
4. **Questions**: at most two, or none.

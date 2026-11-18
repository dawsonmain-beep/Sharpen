<img src=".claude-plugin/icon.png" alt="Sharpen icon" width="96">

# sharpen

Adds a **✨ Sharpen** button above the Claude Code prompt box. Type a rough prompt and press it: the draft is replaced with the prompt you meant to write. Sharpen reads the last few messages of the conversation, so "2 but brighter" becomes "Go with option 2, the wide shot, but make it brighter".

What it does and does not do:

- It names what your draft refers to, states the ask outright and fixes the typing.
- It keeps the size of the ask. A one-line reply stays one line.
- It never decides for you and never adds instructions you did not give. Open choices come back as questions in the pane.
- For a real task it adds one check the agent can run itself.

The "Sharpen" pane lists the readings it chose for your words, any questions, and what changed. "Restore original" puts your draft back. `/sharpen` (the bundled skill) has Claude sharpen a prompt in chat instead of in the box.

Each press is one Opus call through your own session, about 7 seconds, and it counts toward `/cost`. The call is sent your draft and up to eight recent messages of the conversation.

The meta-prompt in `hooks/core.ts` was chosen by a blind evaluation on 104 real prompts: it beat the previous version in 93% of head-to-head comparisons on held-out prompts, and beat the unedited draft in 78%.

## Install

At the prompt of a Claude Code terminal session:

```
/plugin install sharpen --marketplace dawsonmain-beep/sharpen
```

Answer `y` to add the marketplace, then press Enter for the user scope.

From a shell:

```
claude plugin install sharpen --marketplace dawsonmain-beep/sharpen
```

In the desktop app: click + next to the prompt box, then Plugins, Add marketplace with `dawsonmain-beep/sharpen`, then Add plugin.

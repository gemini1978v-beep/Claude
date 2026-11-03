# cache-warmth

Claude Code mod: one line under the prompt showing

- **Кэш** — minutes left of the 60-minute prompt cache since the last turn (green → yellow → red, "остыл" past 60);
- **5ч** — five-hour rate-limit window: % used and time to reset;
- **Нед** — weekly rate-limit window: % used and time to reset.

```
Кэш ██████░░░░ 37м  5ч ██░░░░░░░░ 23% ↻2ч10м  Нед ████░░░░░░ 41% ↻3д5ч
```

## Install

At the prompt of a terminal session:

```
/plugin install cache-warmth --marketplace gemini1978v-beep/Claude
```

From a shell:

```bash
claude plugin install cache-warmth --marketplace gemini1978v-beep/Claude
```

In the desktop app, where `/plugin` does not run: click + next to the prompt box, then Plugins, Add marketplace with `gemini1978v-beep/Claude`, then Add plugin.

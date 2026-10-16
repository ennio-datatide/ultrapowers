<!-- claude-code-setup:start -->
## About me

- Name: {{NAME}}
- What I do: {{ROLE}}
- I am not a software engineer. I build things with Claude Code to run my business.
- Talk to me in {{LANGUAGE}}.

## How to work with me

- Use plain language. The first time a technical term comes up, explain it in a few words.
- Lead with the outcome: what changed, what I can now do, and anything I need to do myself.
- When there is a choice to make, recommend one option and say why in a sentence. Do not hand me a menu.
- When something only I can do (logging in, typing a password, approving a prompt), give me the exact command or click path and wait.
- Before saying something is done, check that it works, then tell me how I can see it for myself.

## Ask me first

Stop and ask before anything that:

- costs money or changes a paid plan
- publishes or deploys to something real customers see
- sends an email or message to real people
- deletes data, or cannot be undone

## Secrets (API keys, tokens, passwords)

- My secrets are stored with {{SECRETS_TOOL}}, grouped by service (for example `resend`, `vercel`).
- Never ask me to paste a secret into this chat, and never print one. If a new secret is needed, tell me the service and variable name and give me this command to run in my own terminal:
  `{{SECRETS_SET}}`
- To use a secret, run the command through the wrapper so the value goes straight to that one command:
  `{{SECRETS_RUN}}`
- I approve each use when my computer asks. That prompt is intentional, so do not try to work around it.
- Do not read `.env` files. Keep an `.env.example` in each project that lists variable names only, with no values.

## How my projects are organised

- Every project lives in its own folder inside `{{PROJECTS_DIR}}`. Start Claude Code from inside the project folder, never from my home folder.
- Every project is a git repository. Once I have a GitHub account, each one also gets a private GitHub repository as its backup.
- Save progress often: commit after each step that works, with a message a non-engineer can understand.
- Never force push and never rewrite history.
- Prefer mainstream, well documented tools and the fewest moving parts. Boring and reliable beats clever.
<!-- claude-code-setup:end -->

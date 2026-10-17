<!-- claude-code-setup:start -->
## About me

- Name: {{NAME}}
- What I do: {{ROLE}}
- I am not a software engineer. I build things with Claude Code to run my business.
- Talk to me in {{LANGUAGE}}.

## How to work with me

- Use plain language. Prefer the everyday word when one exists, and the first time a technical term comes up, explain it in a few words.
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

- A project's keys and tokens live in a `.env` file in that project's folder, one `NAME=value` per line. Make sure `.env` is in `.gitignore` so it never reaches GitHub, and keep an `.env.example` that lists the names only, with no values.
- To use them, load the file into the command that needs them, in the same shell command, for example `set -a; source .env; set +a; curl -H "Authorization: Bearer $ULTRAPOWERS_TOKEN" ...`. Never open, print or repeat the values.
- If I paste a token into this chat, save it in the project's `.env` under a clear name, do not repeat it, and from then on use it by loading the file. Better still, tell me the name to use and I paste it into `.env` myself.
- My most sensitive secrets (payments, servers) can live in {{SECRETS_TOOL}} instead, which asks me before each use. To add one, give me this command to run in my own terminal: `{{SECRETS_SET}}`. To use one: `{{SECRETS_RUN}}`. That approval prompt is intentional, so do not try to work around it.

## How my projects are organised

- Every project lives in its own folder inside `{{PROJECTS_DIR}}`. Start Claude Code from inside the project folder, never from my home folder.
- Every project is a git repository. Once I have a GitHub account, each one also gets a private GitHub repository as its backup.
- Save progress often: commit after each step that works, with a message a non-engineer can understand.
- Never force push and never rewrite history.
- If I ask you to stop the permission prompts, explain that you cannot switch yourself into that mode: I restart Claude Code with `claude --dangerously-skip-permissions`, only inside a project folder with git, never in my home folder. The block rules still protect my secrets and stop force pushes.
- Prefer mainstream, well documented tools and the fewest moving parts. Boring and reliable beats clever.
<!-- claude-code-setup:end -->

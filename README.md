# PromptGuard

A simple browser extension that tries to help protect your personal data while chatting with ChatGPT and other AI platforms.

## What it does

When you type a message in ChatGPT, PromptGuard attempts to detect sensitive information like email addresses, phone numbers, names, and API keys, and replaces them with placeholders before your message is sent. The original values are restored visually in the chat so you can still read your conversation naturally.

## Features

- Detects common PII types: emails, phone numbers, credit cards, SSNs, IP addresses, names, locations, organizations, and secrets (API keys, tokens, passwords)
- Replaces detected values with placeholders (e.g., `[EMAIL_1]`, `[NAME_1]`)
- Shows original values as green badges in the chat
- Allows excluding specific values from detection
- Scoped per chat session

## How it works

PromptGuard intercepts your message before it's sent, replaces any detected sensitive data with placeholders like `[EMAIL_1]` or `[NAME_1]`, and restores the original values visually in the chat so your conversation remains readable.

**What you see:**

![What you see](docs/prompt-redacted.png)

**What ChatGPT actually receives:**

![What ChatGPT actually receives](docs/prompt-real.png)

## Installation

1. Clone this repository
2. Run `npm install`
3. Run `npm run build`
4. Load `dist/chrome` or `dist/firefox` as an unpacked extension in your browser

## Development

```bash
npm install
npm run dev          # Watch mode
npm run build        # Production build
npm test             # Run tests
npm run prettify     # Check formatting
npm run prettify:fix # Fix formatting
npm run lint         # Lint code
npm run lint:fix     # Fix lint errors
```

## Special thanks

This project relies heavily on [Compromise.js](https://github.com/spencermountain/compromise) and [Gitleaks](https://github.com/gitleaks/gitleaks) for natural language processing and comprehensive secret detection. A big thank you to Spencer Kelly, Zachary Rice, and all the contributors behind these projects for building such powerful tools and making this extension possible.

## License

[MIT](LICENSE) - Copyright (c) 2026 Giacomo Trudu

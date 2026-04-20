# Webnett Network Prototype

Webnett Network is a local prototype for a trust-first digital currency network.

## Milestone

Webnett Local Prototype MVP v0.1

This milestone proves that Webnett can run locally on Windows with Next.js as a browser-based prototype.

## Current Features

- Demo WBN wallets
- Test WBN faucet
- Wallet-to-wallet transfers
- Block mining
- Block explorer
- Transaction history
- Transaction receipts
- Validator staking
- Locked stake accounting
- Governance voting
- Validator reward pool
- Local browser autosave
- Launch readiness dashboard

## Tested Working

- Next.js local development server
- Custom Webnett page loaded from app/page.tsx
- Wallet generation
- Adding test WBN
- Sending WBN between wallets
- Mining and confirming blocks
- Explorer activity
- Validator staking
- Launch Center dashboard

## Run Locally

From PowerShell:

cd C:\Users\jkk-a\webnett-network
npm run dev

Then open the local URL shown in the terminal.

Usually:

http://localhost:3000

If port 3000 is busy, use the port shown by Next.js, such as:

http://localhost:3001

## Important Files

app/page.tsx
components/
components/ui/
lib/
package.json
README.md

The main Webnett prototype currently lives in app/page.tsx.

## Important Disclaimer

This is experimental prototype software only.

WBN in this project is demo/test currency only. It has no real-world value, is not a financial product, is not an investment, is not exchange-listed, and is not a live cryptocurrency.

Do not present this prototype as a public token, investment opportunity, or financial product.

## Safe Public Description

Webnett Network is a trust-first digital currency experiment with demo wallets, block mining, validator staking, governance voting, reward pools, and transparent explorer activity.

It is currently a local prototype and testnet-style software demo.

## Next Development Steps

1. Keep the current working version safe.
2. Create a Git checkpoint.
3. Split the large app/page.tsx file into smaller files.
4. Move blockchain logic into lib/chain.ts.
5. Move wallet logic into lib/wallet.ts.
6. Move storage logic into lib/storage.ts.
7. Move UI into components/WebnettDashboard.tsx.
8. Add real cryptographic transaction signing.
9. Add backend persistence.
10. Add peer-to-peer testnet node logic.
11. Add a proper public landing page.
12. Run security review before any public release.

## Project Notes

The current version has already proven the main concept locally:

- The app loads.
- Wallets work.
- Test WBN can be created.
- Transfers can be queued.
- Blocks can be mined.
- Validators can be created.
- Governance exists.
- The Launch Center can track readiness.

This is the foundation for the next phase of Webnett development.

## Live Demo

https://webnett-network.vercel.app

## Live Demo

https://webnett-network.vercel.app

## Phase 2 Security Progress

- Real browser crypto wallet generation added.
- Signed transfer payloads added.
- Transaction payload hashes added.
- Mining now blocks missing or invalid signed user transfers.
- Transaction helper module added.
- Block helper module added.
- Chain integrity validation now checks block hashes and previous-hash links.

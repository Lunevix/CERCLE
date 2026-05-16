# CERCLE — Decentralized Rotational Savings & Community Credit Network

> ROSCA 2.0 on Stellar — digitizing informal savings groups into programmable, trust-minimized financial circles.

## Overview

CERCLE automates community savings circles (ROSCAs/Chamas) on the Stellar blockchain using Soroban smart contracts. Members contribute periodically; each cycle one member receives the pooled funds. Smart contracts enforce fairness, transparency, and accountability — no manual intervention required.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    User Interface Layer                  │
│           Web App │ Mobile App │ SMS/USSD               │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│               Backend Orchestration Layer                │
│    Circle Lifecycle │ Scheduling │ Reputation Engine     │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│             Smart Contract Execution Layer               │
│  CercleFactory │ RotationalPool │ InsuranceVault │ Reputation │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│                  Stellar / Soroban Network               │
└─────────────────────────────────────────────────────────┘
```

## Repository Structure

```
cercle/
├── frontend/          # React web + mobile-first app
├── backend/           # Node.js coordination service
├── contracts/         # Soroban Rust smart contracts
├── sdk/               # Circle interaction SDK
├── infra/             # Docker, CI/CD, deployment
└── docs/              # Documentation
```

## Quick Start

### Prerequisites
- Node.js >= 20, npm >= 10
- Rust + `wasm32-unknown-unknown` target
- Stellar CLI (`stellar`)
- Docker (for local infra)

### Setup

```bash
git clone https://github.com/your-org/cercle
cd cercle
cp .env.example .env
npm install
npm run contracts:build
npm run dev
```

### Testnet Deployment

```bash
npm run contracts:deploy:testnet
```

## Modules

| Module | Description |
|--------|-------------|
| Circle Lifecycle Engine | Create, join, activate, close circles |
| Contribution Enforcement | Track payments, detect defaults |
| Rotational Payout Engine | Deterministic payout sequencing |
| Insurance Protection | Pooled default coverage |
| Reputation Scoring | Trust scores from participation history |
| Communication Engine | SMS/USSD for offline-first access |

## Smart Contracts

| Contract | Purpose |
|----------|---------|
| `CercleFactory` | Deploy and configure savings circles |
| `RotationalPool` | Manage contributions and payout rotation |
| `InsuranceVault` | Pooled insurance against defaults |
| `ReputationRegistry` | On-chain trust scoring |

## Contributing

See [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) for task segmentation by role (FE/BE/SC/INFRA/DOCS).

## License

MIT

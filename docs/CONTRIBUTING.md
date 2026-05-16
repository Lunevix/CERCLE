# Contributing to CERCLE

## Role Tags

All issues and PRs are tagged by role:

| Tag | Area |
|-----|------|
| `FE` | Frontend (React, UI, mobile) |
| `BE` | Backend (Node.js, API, scheduler) |
| `SC` | Smart Contracts (Soroban/Rust) |
| `INFRA` | DevOps, Docker, CI/CD |
| `DOCS` | Documentation |

## Git Workflow

```bash
# 1. Branch from develop
git checkout develop
git pull
git checkout -b feat/SC-insurance-claim-logic

# 2. Make changes, commit
git add contracts/insurance_vault/src/lib.rs
git commit -m "feat(SC): implement insurance claim validation"

# 3. Push and open PR against develop
git push -u origin feat/SC-insurance-claim-logic
```

Branch naming: `feat/<TAG>-description`, `fix/<TAG>-description`, `chore/<TAG>-description`

## PR Requirements

- CI must pass (lint + tests + contract build)
- At least 1 reviewer approval
- No direct pushes to `main` or `develop`

## Sprint Issue Categories

### Circle Creation System (Phase 1)
- [ ] `SC` CercleFactory: add member invitation codes
- [ ] `BE` Circle activation endpoint
- [ ] `FE` Member invitation UI

### Rotational Payout Engine (Phase 2)
- [ ] `SC` RotationalPool: timeout-based cycle advance
- [ ] `BE` Payout event indexer
- [ ] `FE` Real-time payout notification

### Insurance & Reputation (Phase 3)
- [ ] `SC` InsuranceVault: partial claim logic
- [ ] `SC` ReputationRegistry: cross-circle score aggregation
- [ ] `BE` Reputation analytics API

### Communication Layer (Phase 4)
- [ ] `BE` Africa's Talking SMS notifications
- [ ] `BE` USSD contribute flow
- [ ] `FE` Offline PWA caching (service worker)

### Hardening (Phase 5)
- [ ] `SC` Formal security audit
- [ ] `BE` Load test 100+ member circles
- [ ] `FE` Low-literacy UX mode (icon-only navigation)
- [ ] `INFRA` Production Kubernetes manifests

## Code Standards

- **Contracts**: no `unwrap()` in production paths, emit events for all state changes
- **Backend**: validate all inputs with `express-validator` or `zod`, never trust client amounts
- **Frontend**: all financial amounts displayed in XLM (divide stroops by 10,000,000)
- **Tests**: every new contract function needs at least one happy-path and one failure test

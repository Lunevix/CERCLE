# CERCLE — Architecture Overview

## System Layers

```
┌──────────────────────────────────────────────────────────────┐
│                     User Interface Layer                     │
│  React Web App (PWA)  │  SMS/USSD (Africa's Talking)        │
└────────────────────────────┬─────────────────────────────────┘
                             │ REST + SSE
┌────────────────────────────▼─────────────────────────────────┐
│                  Backend Orchestration Layer                  │
│                                                              │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────┐  │
│  │Circle       │  │Contribution  │  │Reputation Engine   │  │
│  │Lifecycle    │  │Enforcement   │  │(score aggregation) │  │
│  └─────────────┘  └──────────────┘  └────────────────────┘  │
│                                                              │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────┐  │
│  │Scheduler    │  │BullMQ Queue  │  │USSD Session Mgr    │  │
│  │(cron+sync)  │  │(Redis)       │  │(Redis TTL)         │  │
│  └─────────────┘  └──────────────┘  └────────────────────┘  │
│                                                              │
│  PostgreSQL (financial state)  │  Redis (queues, sessions)  │
└────────────────────────────┬─────────────────────────────────┘
                             │ Soroban RPC
┌────────────────────────────▼─────────────────────────────────┐
│               Smart Contract Execution Layer                 │
│                                                              │
│  ┌──────────────┐  ┌───────────────┐  ┌──────────────────┐  │
│  │CercleFactory │  │RotationalPool │  │InsuranceVault    │  │
│  │(circle setup)│  │(contributions │  │(default coverage)│  │
│  │              │  │ + payouts)    │  │                  │  │
│  └──────────────┘  └───────────────┘  └──────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐    │
│  │ReputationRegistry (on-chain trust scoring)           │    │
│  └──────────────────────────────────────────────────────┘    │
└────────────────────────────┬─────────────────────────────────┘
                             │
┌────────────────────────────▼─────────────────────────────────┐
│                   Stellar / Soroban Network                  │
└──────────────────────────────────────────────────────────────┘
```

## Data Flow: Contribution Cycle

```
Member → POST /api/contributions
       → BullMQ job enqueued
       → Worker: stellarService.submitContribution()
       → RotationalPool.contribute() on-chain
         → Insurance cut → InsuranceVault
         → Net amount pooled
         → If all members contributed → auto payout
           → ReputationRegistry.record_contribution()
           → ReputationRegistry.record_payout()
       → DB: contributions table updated
       → Frontend: React Query invalidation
```

## Data Flow: Default Detection

```
Scheduler (hourly cron)
  → Query circles past cycle deadline
  → For each member without contribution:
    → Insert into defaults table
    → RotationalPool.mark_default() on-chain
    → InsuranceVault.pay_claim() triggered
    → ReputationRegistry.record_default()
```

## Contract Roles

| Role     | Capabilities |
|----------|-------------|
| admin    | Create circles, mark defaults, advance cycles, authorize verifiers |
| member   | Join circles, contribute, receive payouts |
| verifier | Record reputation events (pool contracts) |

## Storage Design (Soroban)

- `instance` storage: config, counters, admin (cheap, always loaded)
- `persistent` storage: per-member/per-cycle data (TTL-extended on access)
- No `temporary` storage for financial state (must survive ledger gaps)

## Deterministic Payout Ordering

Members are stored in a `Vec<Address>` in join order. The `payout_index` advances
sequentially each cycle. After all members have received a payout, `paid_out` resets
and the rotation begins again. No randomness — fully auditable.

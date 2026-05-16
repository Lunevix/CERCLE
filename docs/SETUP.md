# CERCLE — Setup Guide

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | ≥ 20 | https://nodejs.org |
| Rust | stable | `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \| sh` |
| wasm32 target | — | `rustup target add wasm32-unknown-unknown` |
| Stellar CLI | latest | `cargo install stellar-cli --locked` |
| Docker | ≥ 24 | https://docs.docker.com/get-docker/ |

## Local Development

### 1. Clone and configure

```bash
git clone https://github.com/your-org/cercle
cd cercle
cp .env.example .env
# Edit .env — set ADMIN_SECRET_KEY to a funded testnet keypair
```

Generate a testnet keypair:
```bash
stellar keys generate --global admin --network testnet
stellar keys address admin
# Fund it: https://laboratory.stellar.org/#account-creator?network=test
```

### 2. Start infrastructure

```bash
cd infra
docker compose up -d postgres redis
```

### 3. Install dependencies

```bash
npm install
```

### 4. Build and deploy contracts

```bash
npm run contracts:build
npm run contracts:deploy:testnet
# Copy output contract IDs into .env
```

### 5. Start backend

```bash
npm run dev --workspace=backend
```

### 6. Start frontend

```bash
npm run dev --workspace=frontend
# Open http://localhost:5173
```

## Running Tests

```bash
# All tests
npm test

# Contracts only
npm run contracts:test

# Backend only
npm test --workspace=backend

# Frontend only
npm test --workspace=frontend
```

## Docker (full stack)

```bash
cd infra
docker compose up --build
# Frontend: http://localhost:5173
# Backend:  http://localhost:3000
```

## Environment Variables

See `.env.example` for all variables. Critical ones:

| Variable | Description |
|----------|-------------|
| `ADMIN_SECRET_KEY` | Stellar secret key for contract deployment |
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `FACTORY_CONTRACT_ID` | Deployed CercleFactory contract ID |
| `AT_API_KEY` | Africa's Talking API key (SMS/USSD) |

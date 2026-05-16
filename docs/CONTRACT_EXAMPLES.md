# Smart Contract Interaction Examples

## Using the CERCLE SDK

```typescript
import { CercleClient, CircleContract } from '@cercle/sdk';

const client = new CercleClient({
  rpcUrl: 'https://soroban-testnet.stellar.org',
  networkPassphrase: 'Test SDF Network ; September 2015',
  factoryContractId: 'C...',
  reputationContractId: 'C...',
  insuranceContractId: 'C...',
});

// Create a circle (10 XLM/month, 5 members, 2% insurance)
const circleId = await client.createCircle({
  signerSecret: 'S...',
  contributionAmount: 100_000_000n, // 10 XLM in stroops
  cycleLengthDays: 30,
  maxMembers: 5,
  insuranceBps: 200,
});

// Get circle info
const circle = await client.getCircle(circleId);
console.log(circle);

// Interact with a specific pool
const pool = new CircleContract(circle.poolContract, config);
await pool.join('S...');          // member joins
await pool.contribute('S...');    // member contributes
```

## Using Stellar CLI Directly

### Initialize factory
```bash
stellar contract invoke \
  --id $FACTORY_CONTRACT_ID \
  --source admin \
  --network testnet \
  -- initialize \
  --admin GADMIN...
```

### Create a circle
```bash
stellar contract invoke \
  --id $FACTORY_CONTRACT_ID \
  --source admin \
  --network testnet \
  -- create_circle \
  --admin GADMIN... \
  --contribution_amount 100000000 \
  --cycle_length_days 30 \
  --max_members 5 \
  --insurance_bps 200 \
  --pool_contract CPOOL...
```

### Check reputation score
```bash
stellar contract invoke \
  --id $REPUTATION_CONTRACT_ID \
  --source admin \
  --network testnet \
  -- get_score \
  --member GMEMBER...
```

### Check insurance vault balance
```bash
stellar contract invoke \
  --id $INSURANCE_CONTRACT_ID \
  --source admin \
  --network testnet \
  -- get_balance
```

## Circle Lifecycle Walkthrough

```
1. Admin deploys CercleFactory, InsuranceVault, ReputationRegistry
2. Admin calls factory.create_circle() → gets circle_id
3. Members call pool.join() (up to max_members)
4. Admin activates circle (status: pending → active)
5. Each cycle:
   a. Members call pool.contribute() before deadline
   b. When all contribute → payout auto-executes to next member
   c. Scheduler detects any defaults → insurance triggered
   d. Reputation scores updated on-chain
6. After N cycles (N = member count), full rotation complete
7. Admin can close circle or restart rotation
```

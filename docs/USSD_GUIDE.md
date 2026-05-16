# SMS/USSD Integration Guide

CERCLE supports offline-first participation via Africa's Talking USSD gateway.

## Setup

1. Create an Africa's Talking account at https://africastalking.com
2. Register a USSD service code (e.g. `*384*CERCLE#`)
3. Set callback URL to `https://your-domain.com/ussd`
4. Add credentials to `.env`:
   ```
   AT_API_KEY=your_api_key
   AT_USERNAME=your_username
   AT_SENDER_ID=CERCLE
   ```

## USSD Menu Flow

```
*384*CERCLE#
│
├── 1. View my circles
│   └── Lists circles by name + current cycle
│
├── 2. Check balance
│   └── Shows current pool balance for active circle
│
├── 3. Contribute
│   ├── Select circle
│   └── Confirm → triggers backend contribution job
│
├── 4. Check reputation
│   └── Shows on-time/total contributions
│
└── 0. Exit
```

## Phone-Based Identity

Members without wallets are identified by phone number:
- Phone number stored in `members.phone` column
- Backend maps phone → Stellar address (custodial for SMS users)
- Contributions submitted by backend relay wallet on member's behalf

## SMS Notifications

Sent via Africa's Talking SMS API for:
- Contribution reminder (2 days before deadline)
- Payout received confirmation
- Default warning
- Circle activation

## Testing USSD Locally

Use Africa's Talking simulator:
1. Go to https://simulator.africastalking.com
2. Enter your service code
3. Set callback to `http://localhost:3000/ussd` (use ngrok for local testing)

```bash
# Expose local backend
npx ngrok http 3000
# Use the ngrok URL as your AT callback
```

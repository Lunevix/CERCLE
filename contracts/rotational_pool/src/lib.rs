//! RotationalPool — manages contributions and deterministic payout rotation.

#![cfg_attr(target_family = "wasm", no_std)]
use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short,
    token, Address, Env, IntoVal, Symbol, Vec,
};

// ── Storage keys ──────────────────────────────────────────────────────────────
const ADMIN: Symbol = symbol_short!("ADMIN");
const CONFIG: Symbol = symbol_short!("CONFIG");
const MEMBERS: Symbol = symbol_short!("MEMBERS");
const CYCLE: Symbol = symbol_short!("CYCLE");
const PAID_OUT: Symbol = symbol_short!("PAIDOUT");

// ── Types ─────────────────────────────────────────────────────────────────────
#[contracttype]
#[derive(Clone)]
pub struct PoolConfig {
    pub circle_id: u64,
    pub contribution_amount: i128,
    pub cycle_length_days: u32,
    pub max_members: u32,
    pub insurance_bps: u32,
    pub token: Address,
    pub insurance_vault: Address,
    pub reputation_registry: Address,
    pub cycle_start_ledger: u32,
}

#[contracttype]
#[derive(Clone)]
pub struct CycleState {
    pub cycle_number: u32,
    pub contributions_this_cycle: u32,
    pub payout_index: u32,   // index into members vec — deterministic rotation
    pub total_pooled: i128,
}

#[contracttype]
pub enum DataKey {
    Contributed(Address, u32), // (member, cycle)
    Defaulted(Address, u32),
}

// ── Events ────────────────────────────────────────────────────────────────────
fn emit<T>(env: &Env, topic: Symbol, data: T) 
where 
    T: IntoVal<Env, soroban_sdk::Val> 
{
    env.events().publish((topic,), data);
}

// ── Contract ──────────────────────────────────────────────────────────────────
#[contract]
pub struct RotationalPool;

#[contractimpl]
impl RotationalPool {
    pub fn initialize(
        env: Env,
        admin: Address,
        config: PoolConfig,
    ) {
        admin.require_auth();
        if env.storage().instance().has(&ADMIN) {
            panic!("already initialized");
        }
        env.storage().instance().set(&ADMIN, &admin);
        env.storage().instance().set(&CONFIG, &config);
        env.storage().instance().set(&MEMBERS, &Vec::<Address>::new(&env));
        env.storage().instance().set(&CYCLE, &CycleState {
            cycle_number: 1,
            contributions_this_cycle: 0,
            payout_index: 0,
            total_pooled: 0,
        });
        env.storage().instance().set(&PAID_OUT, &Vec::<Address>::new(&env));
    }

    /// Join the circle (before it starts).
    pub fn join(env: Env, member: Address) {
        member.require_auth();
        let config: PoolConfig = env.storage().instance().get(&CONFIG).unwrap();
        let mut members: Vec<Address> = env.storage().instance().get(&MEMBERS).unwrap();
        assert!(!members.contains(&member), "already a member");
        assert!((members.len() as u32) < config.max_members, "circle full");
        members.push_back(member.clone());
        env.storage().instance().set(&MEMBERS, &members);
        emit(&env, symbol_short!("JOINED"), member);
    }

    /// Submit contribution for the current cycle.
    pub fn contribute(env: Env, member: Address) {
        member.require_auth();
        let config: PoolConfig = env.storage().instance().get(&CONFIG).unwrap();
        let mut cycle: CycleState = env.storage().instance().get(&CYCLE).unwrap();
        let members: Vec<Address> = env.storage().instance().get(&MEMBERS).unwrap();

        assert!(members.contains(&member), "not a member");
        let key = DataKey::Contributed(member.clone(), cycle.cycle_number);
        assert!(!env.storage().persistent().has(&key), "already contributed");

        // Calculate insurance deduction
        let insurance_cut = (config.contribution_amount * config.insurance_bps as i128) / 10_000;
        let net = config.contribution_amount - insurance_cut;

        // Transfer full amount from member to this contract
        let token_client = token::Client::new(&env, &config.token);
        token_client.transfer(&member, &env.current_contract_address(), &config.contribution_amount);

        // Forward insurance cut to vault
        if insurance_cut > 0 {
            token_client.transfer(
                &env.current_contract_address(),
                &config.insurance_vault,
                &insurance_cut,
            );

            // Sync vault internal state
            env.invoke_contract::<()>(
                &config.insurance_vault,
                &Symbol::new(&env, "record_deposit"),
                soroban_sdk::vec![
                    &env,
                    env.current_contract_address().into_val(&env),
                    insurance_cut.into_val(&env),
                ],
            );
        }

        env.storage().persistent().set(&key, &true);
        cycle.contributions_this_cycle += 1;
        cycle.total_pooled += net;
        env.storage().instance().set(&CYCLE, &cycle);

        emit(&env, symbol_short!("CONTRIB"), (member, cycle.cycle_number, net));

        // Auto-execute payout when all members have contributed
        if cycle.contributions_this_cycle == members.len() as u32 {
            Self::_execute_payout(env);
        }
    }

    /// Mark a member as defaulted (admin only). Triggers insurance.
    pub fn mark_default(env: Env, admin: Address, member: Address) {
        admin.require_auth();
        Self::_require_admin(&env, &admin);
        let cycle: CycleState = env.storage().instance().get(&CYCLE).unwrap();
        let key = DataKey::Defaulted(member.clone(), cycle.cycle_number);
        env.storage().persistent().set(&key, &true);
        emit(&env, symbol_short!("DEFAULT"), (member, cycle.cycle_number));
    }

    /// Force advance cycle (admin, for timeout scenarios).
    pub fn advance_cycle(env: Env, admin: Address) {
        admin.require_auth();
        Self::_require_admin(&env, &admin);
        Self::_execute_payout(env);
    }

    pub fn get_cycle(env: Env) -> CycleState {
        env.storage().instance().get(&CYCLE).unwrap()
    }

    pub fn get_members(env: Env) -> Vec<Address> {
        env.storage().instance().get(&MEMBERS).unwrap()
    }

    pub fn has_contributed(env: Env, member: Address, cycle_number: u32) -> bool {
        env.storage().persistent().has(&DataKey::Contributed(member, cycle_number))
    }

    // ── Internal ──────────────────────────────────────────────────────────────
    fn _require_admin(env: &Env, caller: &Address) {
        let admin: Address = env.storage().instance().get(&ADMIN).unwrap();
        assert!(admin == *caller, "not admin");
    }

    fn _execute_payout(env: Env) {
        let config: PoolConfig = env.storage().instance().get(&CONFIG).unwrap();
        let mut cycle: CycleState = env.storage().instance().get(&CYCLE).unwrap();
        let members: Vec<Address> = env.storage().instance().get(&MEMBERS).unwrap();
        let mut paid_out: Vec<Address> = env.storage().instance().get(&PAID_OUT).unwrap();

        // Deterministic: rotate through members in join order, skip already paid
        let n = members.len() as u32;
        let mut recipient_idx = cycle.payout_index % n;
        // Find next unpaid member
        for _ in 0..n {
            let candidate = members.get(recipient_idx).unwrap();
            if !paid_out.contains(&candidate) {
                // Execute payout
                let token_client = token::Client::new(&env, &config.token);
                token_client.transfer(
                    &env.current_contract_address(),
                    &candidate,
                    &cycle.total_pooled,
                );
                paid_out.push_back(candidate.clone());
                emit(&env, symbol_short!("PAYOUT"), (candidate, cycle.cycle_number, cycle.total_pooled));

                // Advance cycle
                cycle.cycle_number += 1;
                cycle.contributions_this_cycle = 0;
                cycle.payout_index = (recipient_idx + 1) % n;
                cycle.total_pooled = 0;

                // Reset paid_out after full rotation
                if paid_out.len() as u32 == n {
                    paid_out = Vec::new(&env);
                }

                env.storage().instance().set(&CYCLE, &cycle);
                env.storage().instance().set(&PAID_OUT, &paid_out);
                return;
            }
            recipient_idx = (recipient_idx + 1) % n;
        }
        panic!("no eligible recipient");
    }
}

// ── Tests ─────────────────────────────────────────────────────────────────────
#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::{
        testutils::Address as _,
        token, Env,
    };

    fn setup(env: &Env) -> (Address, Address, Address, Address, RotationalPoolClient) {
        let admin = Address::generate(env);
        let member_a = Address::generate(env);
        let member_b = Address::generate(env);

        // Deploy a mock token
        let token_admin = Address::generate(env);
        let token_id = env.register_stellar_asset_contract(token_admin.clone());
        let token_client = token::StellarAssetClient::new(env, &token_id);

        // Mint enough for both members (contribution=1000, 2 members, 2 cycles)
        token_client.mint(&member_a, &10_000);
        token_client.mint(&member_b, &10_000);

        // Deploy vault (no-op for these tests — use a dummy address)
        let vault = Address::generate(env);
        let reputation = Address::generate(env);

        let pool_id = env.register_contract(None, RotationalPool);
        let client = RotationalPoolClient::new(env, &pool_id);

        let config = PoolConfig {
            circle_id: 1,
            contribution_amount: 1_000,
            cycle_length_days: 30,
            max_members: 2,
            insurance_bps: 0, // no insurance cut for simplicity
            token: token_id.clone(),
            insurance_vault: vault,
            reputation_registry: reputation,
            cycle_start_ledger: 0,
        };

        env.mock_all_auths();
        client.initialize(&admin, &config);

        (admin, member_a, member_b, token_id, client)
    }

    #[test]
    fn test_join() {
        let env = Env::default();
        env.mock_all_auths();
        let (_, member_a, member_b, _, client) = setup(&env);

        client.join(&member_a);
        client.join(&member_b);

        let members = client.get_members();
        assert_eq!(members.len(), 2);
        assert_eq!(members.get(0).unwrap(), member_a);
        assert_eq!(members.get(1).unwrap(), member_b);
    }

    #[test]
    fn test_contribute_tracked() {
        let env = Env::default();
        env.mock_all_auths();
        let (_, member_a, member_b, _, client) = setup(&env);

        client.join(&member_a);
        client.join(&member_b);
        client.contribute(&member_a);

        assert!(client.has_contributed(&member_a, &1));
        assert!(!client.has_contributed(&member_b, &1));

        let cycle = client.get_cycle();
        assert_eq!(cycle.contributions_this_cycle, 1);
        assert_eq!(cycle.total_pooled, 1_000);
    }

    #[test]
    fn test_full_payout_cycle() {
        let env = Env::default();
        env.mock_all_auths();
        let (_, member_a, member_b, token_id, client) = setup(&env);
        let token = token::Client::new(&env, &token_id);

        client.join(&member_a);
        client.join(&member_b);

        let before_a = token.balance(&member_a);
        let before_b = token.balance(&member_b);

        // Both contribute — triggers auto-payout to member_a (index 0)
        client.contribute(&member_a);
        client.contribute(&member_b);

        // Cycle should have advanced
        let cycle = client.get_cycle();
        assert_eq!(cycle.cycle_number, 2);
        assert_eq!(cycle.total_pooled, 0);

        // member_a should have received 2000 (both contributions, no insurance cut)
        // member_b paid 1000 and received nothing yet
        let after_a = token.balance(&member_a);
        let after_b = token.balance(&member_b);
        assert_eq!(after_a - before_a, 1_000); // paid 1000, received 2000 → net +1000
        assert_eq!(before_b - after_b, 1_000); // paid 1000, received nothing → net -1000
    }

    #[test]
    fn test_second_cycle_payout_goes_to_member_b() {
        let env = Env::default();
        env.mock_all_auths();
        let (_, member_a, member_b, token_id, client) = setup(&env);
        let token = token::Client::new(&env, &token_id);

        client.join(&member_a);
        client.join(&member_b);

        // Cycle 1: member_a gets payout
        client.contribute(&member_a);
        client.contribute(&member_b);

        // Cycle 2: member_b should get payout
        client.contribute(&member_a);
        client.contribute(&member_b);

        let cycle = client.get_cycle();
        assert_eq!(cycle.cycle_number, 3);

        // member_b received 2000 in cycle 2
        let balance_b = token.balance(&member_b);
        // started 10000, paid 1000 twice, received 2000 once → 10000 - 2000 + 2000 = 10000
        assert_eq!(balance_b, 10_000);
    }
}

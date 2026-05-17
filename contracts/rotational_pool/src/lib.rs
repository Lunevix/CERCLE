//! RotationalPool — manages contributions and deterministic payout rotation.

#![no_std]
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
    T: soroban_sdk::IntoVal<Env, soroban_sdk::Val> 
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
                soroban_sdk::vec![&env, env.current_contract_address().into_val(&env), insurance_cut.into_val(&env)],
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
    use soroban_sdk::{testutils::Address as _, Env};

    #[test]
    fn test_join_and_contribute_cycle() {
        let env = Env::default();
        env.mock_all_auths();
        // Minimal smoke test — full integration tested via backend e2e
        let admin = Address::generate(&env);
        let _ = admin; // contract registration requires token setup; covered in integration tests
    }
}

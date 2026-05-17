//! ReputationRegistry — on-chain trust scoring based on participation history.
//! Score range: 0–1000. New members start at 500.

#![cfg_attr(target_family = "wasm", no_std)]
use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short,
    Address, Env, Symbol,
};

const ADMIN: Symbol = symbol_short!("ADMIN");
const BASE_SCORE: i32 = 500;
const MAX_SCORE: i32 = 1000;
const MIN_SCORE: i32 = 0;

// Score deltas
const DELTA_ON_TIME: i32 = 10;
const DELTA_LATE: i32 = -5;
const DELTA_DEFAULT: i32 = -50;
const DELTA_PAYOUT_RECEIVED: i32 = 5;

#[contracttype]
#[derive(Clone)]
pub struct MemberRecord {
    pub score: i32,
    pub total_contributions: u32,
    pub on_time_contributions: u32,
    pub defaults: u32,
    pub circles_completed: u32,
}

#[contracttype]
pub enum DataKey {
    Member(Address),
    Verifier(Address),
}

#[contract]
pub struct ReputationRegistry;

#[contractimpl]
impl ReputationRegistry {
    pub fn initialize(env: Env, admin: Address) {
        if env.storage().instance().has(&ADMIN) {
            panic!("already initialized");
        }
        env.storage().instance().set(&ADMIN, &admin);
    }

    /// Add a verifier (authorized pool contract).
    pub fn add_verifier(env: Env, admin: Address, verifier: Address) {
        admin.require_auth();
        Self::_require_admin(&env, &admin);
        env.storage().persistent().set(&DataKey::Verifier(verifier), &true);
    }

    /// Record an on-time contribution.
    pub fn record_contribution(env: Env, verifier: Address, member: Address, on_time: bool) {
        verifier.require_auth();
        Self::_require_verifier(&env, &verifier);
        let mut rec = Self::_get_or_init(&env, &member);
        rec.total_contributions += 1;
        if on_time {
            rec.on_time_contributions += 1;
            rec.score = (rec.score + DELTA_ON_TIME).min(MAX_SCORE);
        } else {
            rec.score = (rec.score + DELTA_LATE).max(MIN_SCORE);
        }
        env.storage().persistent().set(&DataKey::Member(member.clone()), &rec);
        env.events().publish((symbol_short!("CONTRIB"), on_time), member);
    }

    /// Record a default event.
    pub fn record_default(env: Env, verifier: Address, member: Address) {
        verifier.require_auth();
        Self::_require_verifier(&env, &verifier);
        let mut rec = Self::_get_or_init(&env, &member);
        rec.defaults += 1;
        rec.score = (rec.score + DELTA_DEFAULT).max(MIN_SCORE);
        env.storage().persistent().set(&DataKey::Member(member.clone()), &rec);
        env.events().publish((symbol_short!("DEFAULT"),), member);
    }

    /// Record payout received (positive signal).
    pub fn record_payout(env: Env, verifier: Address, member: Address) {
        verifier.require_auth();
        Self::_require_verifier(&env, &verifier);
        let mut rec = Self::_get_or_init(&env, &member);
        rec.circles_completed += 1;
        rec.score = (rec.score + DELTA_PAYOUT_RECEIVED).min(MAX_SCORE);
        env.storage().persistent().set(&DataKey::Member(member.clone()), &rec);
    }

    pub fn get_score(env: Env, member: Address) -> i32 {
        Self::_get_or_init(&env, &member).score
    }

    pub fn get_record(env: Env, member: Address) -> MemberRecord {
        Self::_get_or_init(&env, &member)
    }

    /// Minimum score required to join a circle (configurable threshold check).
    pub fn meets_threshold(env: Env, member: Address, min_score: i32) -> bool {
        Self::_get_or_init(&env, &member).score >= min_score
    }

    fn _get_or_init(env: &Env, member: &Address) -> MemberRecord {
        env.storage()
            .persistent()
            .get(&DataKey::Member(member.clone()))
            .unwrap_or(MemberRecord {
                score: BASE_SCORE,
                total_contributions: 0,
                on_time_contributions: 0,
                defaults: 0,
                circles_completed: 0,
            })
    }

    fn _require_admin(env: &Env, caller: &Address) {
        let admin: Address = env.storage().instance().get(&ADMIN).unwrap();
        assert!(admin == *caller, "not admin");
    }

    fn _require_verifier(env: &Env, caller: &Address) {
        assert!(
            env.storage().persistent().has(&DataKey::Verifier(caller.clone())),
            "not a verifier"
        );
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::{testutils::Address as _, Env};

    #[test]
    fn test_initial_score() {
        let env = Env::default();
        env.mock_all_auths();
        let id = env.register_contract(None, ReputationRegistry);
        let client = ReputationRegistryClient::new(&env, &id);
        let admin = Address::generate(&env);
        client.initialize(&admin);
        let member = Address::generate(&env);
        assert_eq!(client.get_score(&member), 500);
    }

    #[test]
    fn test_on_time_increases_score() {
        let env = Env::default();
        env.mock_all_auths();
        let id = env.register_contract(None, ReputationRegistry);
        let client = ReputationRegistryClient::new(&env, &id);
        let admin = Address::generate(&env);
        let verifier = Address::generate(&env);
        let member = Address::generate(&env);
        client.initialize(&admin);
        client.add_verifier(&admin, &verifier);
        client.record_contribution(&verifier, &member, &true);
        assert_eq!(client.get_score(&member), 510);
    }

    #[test]
    fn test_default_decreases_score() {
        let env = Env::default();
        env.mock_all_auths();
        let id = env.register_contract(None, ReputationRegistry);
        let client = ReputationRegistryClient::new(&env, &id);
        let admin = Address::generate(&env);
        let verifier = Address::generate(&env);
        let member = Address::generate(&env);
        client.initialize(&admin);
        client.add_verifier(&admin, &verifier);
        client.record_default(&verifier, &member);
        assert_eq!(client.get_score(&member), 450);
    }

    #[test]
    fn test_score_clamped_at_max() {
        let env = Env::default();
        env.mock_all_auths();
        let id = env.register_contract(None, ReputationRegistry);
        let client = ReputationRegistryClient::new(&env, &id);
        let admin = Address::generate(&env);
        let verifier = Address::generate(&env);
        let member = Address::generate(&env);
        client.initialize(&admin);
        client.add_verifier(&admin, &verifier);
        for _ in 0..60 {
            client.record_contribution(&verifier, &member, &true);
        }
        assert_eq!(client.get_score(&member), 1000);
    }
}

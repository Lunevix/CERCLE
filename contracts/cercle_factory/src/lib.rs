//! CercleFactory — deploys and configures savings circles.
//! Roles: admin (deployer), member, verifier.

#![cfg_attr(target_family = "wasm", no_std)]
use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short,
    Address, Env, Symbol,
};

// ── Storage keys ──────────────────────────────────────────────────────────────
const ADMIN: Symbol = symbol_short!("ADMIN");
const CIRCLE_COUNT: Symbol = symbol_short!("CC");

// ── Data types ────────────────────────────────────────────────────────────────
#[contracttype]
#[derive(Clone)]
pub struct CircleConfig {
    pub id: u64,
    pub admin: Address,
    pub contribution_amount: i128, // in stroops
    pub cycle_length_days: u32,
    pub max_members: u32,
    pub insurance_bps: u32,        // basis points (e.g. 200 = 2%)
    pub pool_contract: Address,
    pub active: bool,
}

#[contracttype]
pub enum DataKey {
    Circle(u64),
    AdminOf(u64),
}

// ── Events ────────────────────────────────────────────────────────────────────
fn emit_circle_created(env: &Env, id: u64, admin: &Address) {
    env.events().publish(
        (symbol_short!("CREATED"), id),
        admin.clone(),
    );
}

// ── Contract ──────────────────────────────────────────────────────────────────
#[contract]
pub struct CercleFactory;

#[contractimpl]
impl CercleFactory {
    /// Initialize factory with an admin address.
    pub fn initialize(env: Env, admin: Address) {
        if env.storage().instance().has(&ADMIN) {
            panic!("already initialized");
        }
        env.storage().instance().set(&ADMIN, &admin);
        env.storage().instance().set(&CIRCLE_COUNT, &0u64);
    }

    /// Create a new savings circle. Returns the circle id.
    pub fn create_circle(
        env: Env,
        admin: Address,
        contribution_amount: i128,
        cycle_length_days: u32,
        max_members: u32,
        insurance_bps: u32,
        pool_contract: Address,
    ) -> u64 {
        admin.require_auth();

        assert!(contribution_amount > 0, "contribution must be positive");
        assert!(cycle_length_days > 0, "cycle must be positive");
        assert!(max_members >= 2, "need at least 2 members");
        assert!(insurance_bps <= 1000, "insurance max 10%");

        let id: u64 = env.storage().instance().get(&CIRCLE_COUNT).unwrap_or(0);
        let next_id = id + 1;

        let config = CircleConfig {
            id: next_id,
            admin: admin.clone(),
            contribution_amount,
            cycle_length_days,
            max_members,
            insurance_bps,
            pool_contract,
            active: true,
        };

        env.storage().persistent().set(&DataKey::Circle(next_id), &config);
        env.storage().instance().set(&CIRCLE_COUNT, &next_id);

        emit_circle_created(&env, next_id, &admin);
        next_id
    }

    /// Deactivate a circle (admin only).
    pub fn deactivate_circle(env: Env, caller: Address, circle_id: u64) {
        caller.require_auth();
        let mut config: CircleConfig = env
            .storage()
            .persistent()
            .get(&DataKey::Circle(circle_id))
            .expect("circle not found");
        assert!(config.admin == caller, "not circle admin");
        config.active = false;
        env.storage().persistent().set(&DataKey::Circle(circle_id), &config);
    }

    /// Get circle configuration.
    pub fn get_circle(env: Env, circle_id: u64) -> CircleConfig {
        env.storage()
            .persistent()
            .get(&DataKey::Circle(circle_id))
            .expect("circle not found")
    }

    /// Total circles created.
    pub fn circle_count(env: Env) -> u64 {
        env.storage().instance().get(&CIRCLE_COUNT).unwrap_or(0)
    }
}

// ── Tests ─────────────────────────────────────────────────────────────────────
#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::{testutils::Address as _, Env};

    #[test]
    fn test_create_and_get_circle() {
        let env = Env::default();
        env.mock_all_auths();
        let id = env.register_contract(None, CercleFactory);
        let client = CercleFactoryClient::new(&env, &id);
        let admin = Address::generate(&env);
        let pool = Address::generate(&env);
        client.initialize(&admin);
        let circle_id = client.create_circle(&admin, &1_000_0000_i128, &30_u32, &5_u32, &200_u32, &pool);
        assert_eq!(circle_id, 1);
        let c = client.get_circle(&circle_id);
        assert_eq!(c.contribution_amount, 1_000_0000_i128);
        assert!(c.active);
    }

    #[test]
    fn test_deactivate_circle() {
        let env = Env::default();
        env.mock_all_auths();
        let id = env.register_contract(None, CercleFactory);
        let client = CercleFactoryClient::new(&env, &id);
        let admin = Address::generate(&env);
        let pool = Address::generate(&env);
        client.initialize(&admin);
        let circle_id = client.create_circle(&admin, &1_000_0000_i128, &30_u32, &5_u32, &200_u32, &pool);
        client.deactivate_circle(&admin, &circle_id);
        assert!(!client.get_circle(&circle_id).active);
    }

    #[test]
    #[should_panic]
    fn test_min_members_validation() {
        let env = Env::default();
        env.mock_all_auths();
        let id = env.register_contract(None, CercleFactory);
        let client = CercleFactoryClient::new(&env, &id);
        let admin = Address::generate(&env);
        let pool = Address::generate(&env);
        client.initialize(&admin);
        client.create_circle(&admin, &1_000_0000_i128, &30_u32, &1_u32, &200_u32, &pool);
    }
}

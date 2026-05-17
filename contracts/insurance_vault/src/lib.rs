//! InsuranceVault — collects premiums and compensates defaults.

#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short,
    token, Address, Env, Symbol,
};

const ADMIN: Symbol = symbol_short!("ADMIN");
const TOKEN: Symbol = symbol_short!("TOKEN");
const BALANCE: Symbol = symbol_short!("BAL");

#[contracttype]
pub enum DataKey {
    Claim(Address, u32),   // (circle_pool, cycle)
    Authorized(Address),   // authorized pool contracts
}

#[contract]
pub struct InsuranceVault;

#[contractimpl]
impl InsuranceVault {
    pub fn initialize(env: Env, admin: Address, token: Address) {
        if env.storage().instance().has(&ADMIN) {
            panic!("already initialized");
        }
        env.storage().instance().set(&ADMIN, &admin);
        env.storage().instance().set(&TOKEN, &token);
        env.storage().instance().set(&BALANCE, &0i128);
    }

    /// Authorize a pool contract to trigger claims.
    pub fn authorize_pool(env: Env, admin: Address, pool: Address) {
        admin.require_auth();
        Self::_require_admin(&env, &admin);
        env.storage().persistent().set(&DataKey::Authorized(pool), &true);
    }

    /// Called by RotationalPool when a default is detected.
    /// Pays `amount` to `recipient` from vault reserves.
    pub fn pay_claim(
        env: Env,
        pool: Address,
        recipient: Address,
        amount: i128,
        circle_id: u64,
        cycle: u32,
    ) {
        pool.require_auth();
        assert!(
            env.storage().persistent().has(&DataKey::Authorized(pool.clone())),
            "pool not authorized"
        );
        let claim_key = DataKey::Claim(pool.clone(), cycle);
        assert!(!env.storage().persistent().has(&claim_key), "claim already paid");

        let balance: i128 = env.storage().instance().get(&BALANCE).unwrap_or(0);
        assert!(balance >= amount, "insufficient vault funds");

        let token: Address = env.storage().instance().get(&TOKEN).unwrap();
        token::Client::new(&env, &token).transfer(
            &env.current_contract_address(),
            &recipient,
            &amount,
        );

        env.storage().instance().set(&BALANCE, &(balance - amount));
        env.storage().persistent().set(&claim_key, &true);

        env.events().publish(
            (symbol_short!("INSURE"), circle_id),
            (recipient, amount, cycle),
        );
    }

    /// Receive premium deposits (called by pool contracts via token transfer + this).
    pub fn record_deposit(env: Env, pool: Address, amount: i128) {
        pool.require_auth();
        assert!(
            env.storage().persistent().has(&DataKey::Authorized(pool)),
            "pool not authorized"
        );
        assert!(amount > 0, "invalid amount");
        let balance: i128 = env.storage().instance().get(&BALANCE).unwrap_or(0);
        env.storage().instance().set(&BALANCE, &(balance + amount));
    }

    pub fn get_balance(env: Env) -> i128 {
        env.storage().instance().get(&BALANCE).unwrap_or(0)
    }

    fn _require_admin(env: &Env, caller: &Address) {
        let admin: Address = env.storage().instance().get(&ADMIN).unwrap();
        assert!(admin == *caller, "not admin");
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::{testutils::Address as _, Env};

    #[test]
    fn test_initialize() {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register_contract(None, InsuranceVault);
        let client = InsuranceVaultClient::new(&env, &contract_id);
        let admin = Address::generate(&env);
        let token = Address::generate(&env);
        client.initialize(&admin, &token);
        assert_eq!(client.get_balance(), 0);
    }
}

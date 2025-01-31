
import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet@v0.14.0/index.ts';
import { assertEquals } from 'https://deno.land/std@0.90.0/testing/asserts.ts';

Clarinet.test({
    name: "Ensure that properties can be listed and verified",
    async fn(chain: Chain, accounts: Map<string, Account>)
    {
        const owner = accounts.get("wallet_1")!;

        let block = chain.mineBlock([
            Tx.contractCall(
                "real_estate",
                "list-property",
                [
                    types.uint(1000000), // price
                    types.uint(1000),    // total shares
                    types.ascii("123 Main St, New York, NY 10001"),
                    types.ascii("3 bed, 2 bath apartment in prime location")
                ],
                owner.address
            )
        ]);

        assertEquals(block.receipts[0].result, '(ok u0)');
        assertEquals(block.height, 2);
    }
});

Clarinet.test({
    name: "Ensure that shares can be purchased correctly",
    async fn(chain: Chain, accounts: Map<string, Account>)
    {
        const owner = accounts.get("wallet_1")!;
        const buyer = accounts.get("wallet_2")!;

        let block = chain.mineBlock([
            Tx.contractCall(
                "real_estate",
                "list-property",
                [
                    types.uint(1000000),
                    types.uint(1000),
                    types.ascii("123 Main St"),
                    types.ascii("Property details")
                ],
                owner.address
            )
        ]);

        block = chain.mineBlock([
            Tx.contractCall(
                "real_estate",
                "buy-shares",
                [
                    types.uint(0), // property_id
                    types.uint(100) // share_amount
                ],
                buyer.address
            )
        ]);

        assertEquals(block.receipts[0].result, '(ok true)');
        assertEquals(block.height, 3);
    }
});

Clarinet.test({
    name: "Ensure that rental payments can be recorded and distributed",
    async fn(chain: Chain, accounts: Map<string, Account>)
    {
        const owner = accounts.get("wallet_1")!;
        const shareholder = accounts.get("wallet_2")!;

        // First list property
        let block = chain.mineBlock([
            Tx.contractCall(
                "real_estate",
                "list-property",
                [
                    types.uint(1000000),
                    types.uint(1000),
                    types.ascii("123 Main St"),
                    types.ascii("Property details")
                ],
                owner.address
            ),
            // Shareholder buys shares
            Tx.contractCall(
                "real_estate",
                "buy-shares",
                [types.uint(0), types.uint(100)],
                shareholder.address
            )
        ]);

        // Record rental payment
        block = chain.mineBlock([
            Tx.contractCall(
                "real_estate",
                "record-rental-payment",
                [types.uint(0), types.uint(10000)],
                owner.address
            ),
            // Distribute rental income
            Tx.contractCall(
                "real_estate",
                "distribute-rental-income",
                [types.uint(0)],
                shareholder.address
            )
        ]);

        assertEquals(block.receipts[0].result, '(ok true)');
        assertEquals(block.receipts[1].result, '(ok true)');
    }
});

Clarinet.test({
    name: "Ensure that maintenance proposals can be created and voted on",
    async fn(chain: Chain, accounts: Map<string, Account>)
    {
        const owner = accounts.get("wallet_1")!;
        const shareholder = accounts.get("wallet_2")!;

        let block = chain.mineBlock([
            // List property
            Tx.contractCall(
                "real_estate",
                "list-property",
                [
                    types.uint(1000000),
                    types.uint(1000),
                    types.ascii("123 Main St"),
                    types.ascii("Property details")
                ],
                owner.address
            ),
            // Buy enough shares to make proposal
            Tx.contractCall(
                "real_estate",
                "buy-shares",
                [types.uint(0), types.uint(100)],
                shareholder.address
            )
        ]);

        block = chain.mineBlock([
            // Create maintenance proposal
            Tx.contractCall(
                "real_estate",
                "create-maintenance-proposal",
                [
                    types.uint(0),
                    types.ascii("Paint exterior and fix roof"),
                    types.uint(50000)
                ],
                shareholder.address
            ),
            // Vote on proposal
            Tx.contractCall(
                "real_estate",
                "vote-on-proposal",
                [types.uint(0), types.bool(true)],
                owner.address
            )
        ]);

        assertEquals(block.receipts[0].result, '(ok true)');
        assertEquals(block.receipts[1].result, '(ok true)');
    }
});

Clarinet.test({
    name: "Ensure that property price can be updated by owner",
    async fn(chain: Chain, accounts: Map<string, Account>)
    {
        const owner = accounts.get("wallet_1")!;
        const nonOwner = accounts.get("wallet_2")!;

        let block = chain.mineBlock([
            Tx.contractCall(
                "real_estate",
                "list-property",
                [
                    types.uint(1000000),
                    types.uint(1000),
                    types.ascii("123 Main St"),
                    types.ascii("Property details")
                ],
                owner.address
            )
        ]);

        block = chain.mineBlock([
            // Try updating price as non-owner
            Tx.contractCall(
                "real_estate",
                "update-property-price",
                [types.uint(0), types.uint(1500000)],
                nonOwner.address
            ),
            // Update price as owner
            Tx.contractCall(
                "real_estate",
                "update-property-price",
                [types.uint(0), types.uint(1500000)],
                owner.address
            )
        ]);

        assertEquals(block.receipts[0].result, `(err u105)`); // err-unauthorized
        assertEquals(block.receipts[1].result, '(ok true)');
    }
});

Clarinet.test({
    name: "Ensure that admin functions are protected",
    async fn(chain: Chain, accounts: Map<string, Account>)
    {
        const deployer = accounts.get("deployer")!;
        const unauthorized = accounts.get("wallet_1")!;

        let block = chain.mineBlock([
            // Try updating platform fee as unauthorized user
            Tx.contractCall(
                "real_estate",
                "update-platform-fee",
                [types.uint(30)],
                unauthorized.address
            ),
            // Update platform fee as contract owner
            Tx.contractCall(
                "real_estate",
                "update-platform-fee",
                [types.uint(30)],
                deployer.address
            ),
            // Try locking property as unauthorized user
            Tx.contractCall(
                "real_estate",
                "lock-property",
                [types.uint(0)],
                unauthorized.address
            ),
            // Lock property as contract owner
            Tx.contractCall(
                "real_estate",
                "lock-property",
                [types.uint(0)],
                deployer.address
            )
        ]);

        assertEquals(block.receipts[0].result, `(err u100)`); // err-owner-only
        assertEquals(block.receipts[1].result, '(ok true)');
        assertEquals(block.receipts[2].result, `(err u100)`); // err-owner-only
        assertEquals(block.receipts[3].result, `(err u101)`); // err-not-found (as no property exists yet)
    }
});

Clarinet.test({
    name: "Ensure that read-only functions return correct data",
    async fn(chain: Chain, accounts: Map<string, Account>)
    {
        const owner = accounts.get("wallet_1")!;

        // First create a property
        let block = chain.mineBlock([
            Tx.contractCall(
                "real_estate",
                "list-property",
                [
                    types.uint(1000000),
                    types.uint(1000),
                    types.ascii("123 Main St"),
                    types.ascii("Property details")
                ],
                owner.address
            )
        ]);

        // Test read-only functions
        let propertyDetails = chain.callReadOnlyFn(
            "real_estate",
            "get-property-details",
            [types.uint(0)],
            owner.address
        );

        let shareBalance = chain.callReadOnlyFn(
            "real_estate",
            "get-share-balance",
            [types.uint(0), types.principal(owner.address)],
            owner.address
        );

        let platformFee = chain.callReadOnlyFn(
            "real_estate",
            "get-platform-fee",
            [],
            owner.address
        );

        // Assert the responses contain expected data
        assertEquals(propertyDetails.result.includes('u1000000'), true);
        assertEquals(shareBalance.result, 'u1000');
        assertEquals(platformFee.result, 'u25');
    }
});

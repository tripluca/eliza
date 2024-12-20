import {
    Action,
    elizaLogger,
    IAgentRuntime,
    Memory,
    HandlerCallback,
    State,
    composeContext,
    generateObject,
    ModelClass,
} from "@ai16z/eliza";
import { coingeckoProvider } from "../providers/coins";
import {
    PriceLookupContent,
    PriceLookupSchema,
    isPriceLookupContent,
} from "../types";
import type { PriceResponse } from "../types";

export const getPriceAction: Action = {
    name: "GET_COIN_PRICE",
    description:
        "Get the current USD price for a specified cryptocurrency using CoinGecko API.",
    validate: async (runtime: IAgentRuntime, _message: Memory) => {
        elizaLogger.log("Validating runtime for GET_COIN_PRICE...");
        return !!(
            runtime.getSetting("COINGECKO_API_KEY") ||
            process.env.COINGECKO_API_KEY
        );
    },
    handler: async (
        runtime: IAgentRuntime,
        _message: Memory,
        state: State,
        _options: any,
        callback: HandlerCallback
    ) => {
        elizaLogger.log("Starting GET_COIN_PRICE handler...");

        try {
            const apiKey =
                runtime.getSetting("COINGECKO_API_KEY") ??
                process.env.COINGECKO_API_KEY;

            // Get the list of supported coins first
            const { supportedCoins } = await coingeckoProvider.get(
                runtime,
                _message
            );

            // Generate the coin name from the message context
            const context = composeContext({
                state,
                template: "Get price for {{coinName}}",
            });

            const priceRequest = await generateObject({
                runtime,
                context,
                modelClass: ModelClass.LARGE,
                schema: PriceLookupSchema,
            });

            if (!isPriceLookupContent(priceRequest.object)) {
                callback(
                    {
                        text: "Invalid coin name specified.",
                    },
                    []
                );
                return;
            }

            const searchTerm = priceRequest.object.coinName.toLowerCase();

            // Find the coin in our supported coins list
            const coin = supportedCoins.find(
                (c) =>
                    c.id === searchTerm ||
                    c.symbol === searchTerm ||
                    c.name === searchTerm
            );

            if (!coin) {
                callback(
                    {
                        text: `Could not find coin "${searchTerm}" in CoinGecko's supported coins list.`,
                    },
                    []
                );
                return;
            }

            // Fetch the price
            const priceUrl = `https://api.coingecko.com/api/v3/simple/price?ids=${coin.id}&vs_currencies=usd`;
            const priceResponse = await fetch(priceUrl, {
                method: "GET",
                headers: {
                    accept: "application/json",
                    "x-cg-demo-api-key": apiKey,
                },
            });

            if (!priceResponse.ok) {
                throw new Error(`HTTP error! status: ${priceResponse.status}`);
            }

            const priceData: PriceResponse = await priceResponse.json();
            const price = priceData[coin.id]?.usd;

            if (typeof price !== "number") {
                callback(
                    {
                        text: `Unable to fetch price for ${coin.name} (${coin.symbol}).`,
                    },
                    []
                );
                return;
            }

            callback(
                {
                    text: `Current price for ${coin.name} (${coin.symbol.toUpperCase()}): $${price.toFixed(2)} USD`,
                },
                []
            );
        } catch (error) {
            elizaLogger.error("Error during price lookup:", error);
            callback(
                {
                    text: "Failed to fetch coin price. Please check the logs for more details.",
                },
                []
            );
        }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "What's the current price of Bitcoin?",
                },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "Current price for Bitcoin (BTC): $45,123.45 USD",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Show me ETH price",
                },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "Current price for Ethereum (ETH): $2,456.78 USD",
                },
            },
        ],
    ],
    similes: [
        "GET_COIN_PRICE",
        "FETCH_CRYPTO_PRICE",
        "CHECK_TOKEN_PRICE",
        "LOOKUP_COIN_VALUE",
        "GET_TOKEN_PRICE",
        "CHECK_CRYPTO_PRICE",
        "FETCH_TOKEN_VALUE",
    ],
};

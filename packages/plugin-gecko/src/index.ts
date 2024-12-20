export * from "./actions/price";
export * from "./providers/coins";
export * from "./types";

import type { Plugin } from "@ai16z/eliza";
import { getPriceAction } from "./actions/price";
import { coingeckoProvider } from "./providers/coins";

export const coingeckoPlugin: Plugin = {
    name: "coingecko",
    description: "CoinGecko cryptocurrency price integration plugin",
    providers: [coingeckoProvider],
    evaluators: [],
    services: [],
    actions: [getPriceAction],
};

export default coingeckoPlugin;

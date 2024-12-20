export interface CoinListEntry {
    id: string;
    symbol: string;
    name: string;
}

export interface PriceResponse {
    [key: string]: {
        usd: number;
    };
}

export const PriceLookupSchema = {
    type: "object",
    properties: {
        coinName: { type: "string" },
    },
    required: ["coinName"],
};

export interface PriceLookupContent {
    coinName: string;
}

export const isPriceLookupContent = (
    content: any
): content is PriceLookupContent => {
    return typeof content === "object" && typeof content.coinName === "string";
};

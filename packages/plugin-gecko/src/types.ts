import { z } from "zod";

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

export const PriceLookupSchema = z.object({
    coinName: z.string(),
});

export type PriceLookupContent = z.infer<typeof PriceLookupSchema>;

import { Plugin } from "@ai16z/eliza";
import { continueAction } from "./actions/fetchInfo.ts";

import { timeProvider } from "./providers/coinList.ts";

export * as actions from "./actions/index.ts";
export * as evaluators from "./evaluators/index.ts";
export * as providers from "./providers/index.ts";

export const geckoPlugin: Plugin = {
    name: "gecko",
    description: "Agent gecko with basic actions and evaluators",
    actions: [fetchInfo],
    evaluators: [],
    providers: [coinList],
};

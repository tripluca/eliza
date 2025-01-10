import { Action, IAgentRuntime, Memory } from "@elizaos/core";
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function loadActiveSignals(): string[] {
    try {
        const activeSignalsPath = join(process.cwd(), '../packages/plugin-top-signals/data/active_signals.txt');
        const data = readFileSync(activeSignalsPath, 'utf-8');
        return data.split('\n').filter(line => line.trim());
    } catch (error) {
        console.error('[TopSignalsPlugin] Error loading active signals:', error);
        return [];
    }
}

export const checkMarketSignalsAction: Action = {
    name: "CHECK_MARKET_SIGNALS",
    similes: [
        "CHECK_MARKET_SIGNALS",
        "SHOW_MARKET_SIGNALS",
        "GET_MARKET_SIGNALS",
        "LIST_MARKET_SIGNALS",
        "VIEW_MARKET_SIGNALS",
        "DISPLAY_MARKET_SIGNALS",
        "REPORT_MARKET_SIGNALS",
        "CHECK_SIGNALS",
        "SHOW_SIGNALS",
        "GET_SIGNALS"
    ],
    description: "Check current market top signals and their status",
    validate: async (_runtime: IAgentRuntime, message: Memory) => {
        const messageText = typeof message.content === 'string' 
            ? message.content 
            : typeof message.content === 'object' && message.content.text
                ? message.content.text
                : String(message.content);

        // Simple pattern matching for market signals queries
        const patterns = [
            /market.*signals?/i,
            /signals?.*status/i,
            /active.*signals?/i,
            /current.*signals?/i,
            /show.*signals?/i
        ];

        return patterns.some(pattern => pattern.test(messageText));
    },
    handler: async (_runtime: IAgentRuntime, _message: Memory) => {
        const activeSignals = loadActiveSignals();
        return {
            action: "CHECK_MARKET_SIGNALS",
            signals: activeSignals
        };
    },
    examples: [
        [
            {
                user: "user",
                content: { text: "What are the current market signals?" }
            },
            {
                user: "juan",
                content: { 
                    text: "Here are the active market signals...",
                    action: "CHECK_MARKET_SIGNALS"
                }
            }
        ],
        [
            {
                user: "user",
                content: { text: "Show me the active signals" }
            },
            {
                user: "juan",
                content: { 
                    text: "Currently tracking these market signals...",
                    action: "CHECK_MARKET_SIGNALS"
                }
            }
        ],
        [
            {
                user: "user",
                content: { text: "What's the market signal status?" }
            },
            {
                user: "juan",
                content: { 
                    text: "Based on our signals tracking...",
                    action: "CHECK_MARKET_SIGNALS"
                }
            }
        ]
    ]
}; 
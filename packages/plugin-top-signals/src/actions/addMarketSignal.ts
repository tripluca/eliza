import { Action, IAgentRuntime, Memory } from "@elizaos/core";
import { readFileSync, appendFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Helper function to sanitize strings for JSON
function sanitizeForJson(str: string): string {
    return str.replace(/[\u0000-\u001F\u007F-\u009F]/g, '')  // Remove control characters
             .replace(/'/g, "'")  // Replace smart quotes
             .trim();
}

function addMarketSignal(signal: string): boolean {
    try {
        const activeSignalsPath = join(process.cwd(), '../packages/plugin-top-signals/data/active_signals.txt');
        console.log('[TopSignalsPlugin] Writing to file:', activeSignalsPath);
        
        // Clean and format the new signal
        const cleanSignal = sanitizeForJson(signal);
        console.log('[TopSignalsPlugin] Cleaned signal:', cleanSignal);
        
        // Read current signals to check for duplicates and get count
        const data = readFileSync(activeSignalsPath, 'utf-8');
        const currentSignals = data.split('\n').filter(line => line.trim());
        console.log('[TopSignalsPlugin] Current signals count:', currentSignals.length);
        
        // Check if signal already exists
        if (currentSignals.some(s => s.toLowerCase() === cleanSignal.toLowerCase())) {
            console.log('[TopSignalsPlugin] Signal already exists:', cleanSignal);
            return false;
        }
        
        // Add the new signal with a number prefix
        const newSignal = `${currentSignals.length + 1}. ${cleanSignal}`;
        console.log('[TopSignalsPlugin] Writing new signal to file:', newSignal);
        appendFileSync(activeSignalsPath, `\n${newSignal}`);
        console.log('[TopSignalsPlugin] Successfully wrote signal to file');
        return true;
    } catch (error) {
        console.error('[TopSignalsPlugin] Error adding signal:', error);
        return false;
    }
}

export const addMarketSignalAction: Action = {
    name: "ADD_MARKET_SIGNAL",
    similes: [
        "ADD_SIGNAL",
        "NEW_SIGNAL",
        "CREATE_SIGNAL",
        "ADD_MARKET_INDICATOR",
        "NEW_MARKET_SIGNAL",
        "RECORD_SIGNAL",
        "LOG_SIGNAL"
    ],
    description: "Add a new market signal to the active signals list",
    validate: async (_runtime: IAgentRuntime, message: Memory) => {
        console.log('\n[TopSignalsPlugin] *** ADD_MARKET_SIGNAL VALIDATION START ***');
        console.log('[TopSignalsPlugin] Action name:', "ADD_MARKET_SIGNAL");
        console.log('[TopSignalsPlugin] Similes:', JSON.stringify(addMarketSignalAction.similes, null, 2));
        
        const messageText = typeof message.content === 'string' 
            ? message.content 
            : typeof message.content === 'object' && message.content.text
                ? message.content.text
                : String(message.content);

        console.log('[TopSignalsPlugin] Processing message:', messageText);

        // Match patterns for adding new signals
        const patterns = [
            /add.*(?:new\s+)?(?:market\s+)?signals?/i,
            /new.*(?:market\s+)?signals?/i,
            /create.*(?:market\s+)?signals?/i,
            /record.*(?:market\s+)?signals?/i,
            /log.*(?:market\s+)?signals?/i
        ];

        const matches = patterns.map(pattern => ({
            pattern: pattern.toString(),
            matches: pattern.test(messageText)
        }));
        console.log('[TopSignalsPlugin] Pattern matches:', matches);

        const result = patterns.some(pattern => pattern.test(messageText));
        console.log('[TopSignalsPlugin] Validation result:', result);
        console.log('[TopSignalsPlugin] *** ADD_MARKET_SIGNAL VALIDATION END ***\n');
        return result;
    },
    handler: async (_runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
        console.log('\n[TopSignalsPlugin] *** ADD_SIGNAL HANDLER CALLED ***');
        console.log('[TopSignalsPlugin] Full Message:', {
            id: message.id,
            content: message.content
        });
        
        const messageText = typeof message.content === 'string' 
            ? message.content 
            : typeof message.content === 'object' && message.content.text
                ? message.content.text
                : String(message.content);

        // Extract the signal from the message
        // Look for text after keywords like "add", "new", "signal", etc.
        const signalMatch = messageText.match(/(?:add|new|create|record|log).*?(?:signal|indicator)s?:?\s*["']?([^"']+)["']?/i);
        if (!signalMatch || !signalMatch[1]) {
            console.log('[TopSignalsPlugin] No signal found in message');
            return false;
        }

        const newSignal = signalMatch[1].trim();
        return addMarketSignal(newSignal);
    },
    examples: [
        [
            {
                user: "user",
                content: { text: 'Add new market signal: "Social media mentions of crypto reaching new highs"' }
            },
            {
                user: "juan",
                content: { 
                    text: "✅ OK! I have added this new market top signal to the list",
                    action: "ADD_MARKET_SIGNAL"
                }
            }
        ],
        [
            {
                user: "user",
                content: { text: "Record this signal: Institutional investors increasing positions" }
            },
            {
                user: "juan",
                content: { 
                    text: "I'll record this new market signal in my database...",
                    action: "ADD_MARKET_SIGNAL"
                }
            }
        ]
    ]
}; 
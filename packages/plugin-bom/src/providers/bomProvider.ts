import { Provider, IAgentRuntime, Memory, Content } from '@elizaos/core';

interface BomAnalysis {
    totalValue: string;
    itemCount: number;
    timestamp: string;
    status: 'pending' | 'completed' | 'error';
}

interface BomContent extends Content {
    analysis?: BomAnalysis;
}

export const bomProvider: Provider = {
    get: async (runtime: IAgentRuntime, message: Memory) => {
        try {
            // Get recent analysis history
            const recentAnalyses = await runtime.messageManager.getMemories({
                roomId: message.roomId,
                count: 5
            });

            // Filter and map analyses
            const analysisHistory = recentAnalyses
                .filter(mem => (mem.content as BomContent).analysis)
                .map(mem => {
                    const data = (mem.content as BomContent).analysis!;
                    return `- ${data.timestamp}: Analyzed ${data.itemCount} items, total value: ${data.totalValue} (${data.status})`;
                })
                .join('\n');

            if (!analysisHistory) {
                return "No recent BOM analyses found.";
            }

            return `Recent BOM Analyses:\n${analysisHistory}`;
        } catch (error) {
            console.error('BOM Provider Error:', error);
            return 'Unable to retrieve BOM analysis history.';
        }
    }
}; 
import { createRoot } from 'react-dom/client';
import ChatWidget from './components/chat-widget';
import type { UUID } from '@elizaos/core';

// Declare global type for the chat widget initialization function
declare global {
    interface Window {
        initElizaChat: (config: {
            containerId: string;
            agentId: UUID;
            position?: "bottom-right" | "bottom-left";
            size?: "sm" | "md" | "lg" | "xl" | "full";
        }) => void;
    }
}

// Create a function to initialize the chat widget
window.initElizaChat = function(config: {
    containerId: string;
    agentId: UUID;
    position?: "bottom-right" | "bottom-left";
    size?: "sm" | "md" | "lg" | "xl" | "full";
}) {
    const container = document.getElementById(config.containerId);
    if (!container) {
        console.error(`Container with id "${config.containerId}" not found`);
        return;
    }

    const root = createRoot(container);
    root.render(
        <ChatWidget 
            agentId={config.agentId}
            position={config.position || "bottom-right"}
            size={config.size || "md"}
        />
    );
}; 
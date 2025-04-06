import { useState } from "react";
import type { UUID } from "@elizaos/core";
import { ExpandableChat, ExpandableChatBody } from "@/components/ui/chat/expandable-chat";
import Chat from "@/components/chat";

interface ChatWidgetProps {
    agentId: UUID;
    position?: "bottom-right" | "bottom-left";
    size?: "sm" | "md" | "lg" | "xl" | "full";
}

export default function ChatWidget({ agentId, position = "bottom-right", size = "md" }: ChatWidgetProps) {
    return (
        <ExpandableChat position={position} size={size}>
            <ExpandableChatBody>
                <Chat agentId={agentId} />
            </ExpandableChatBody>
        </ExpandableChat>
    );
} 
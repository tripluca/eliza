import { Button } from "@/components/ui/button";
import {
    ChatBubble,
    ChatBubbleMessage,
    // ChatBubbleTimestamp, // Commented out unused import
} from "@/components/ui/chat/chat-bubble";
import { ChatInput } from "@/components/ui/chat/chat-input";
import { ChatMessageList } from "@/components/ui/chat/chat-message-list";
import { useTransition, animated, type AnimatedProps, type SpringValue } from "@react-spring/web"; // Uncomment react-spring
import { Send } from "lucide-react";
import { useEffect, useRef, useState, useCallback } from "react";
import type { Content, UUID } from "@elizaos/core";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { cn, moment } from "@/lib/utils";
import { Avatar, AvatarImage } from "./ui/avatar"; // Uncomment Avatar import
import CopyButton from "./copy-button";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import AIWriter from "react-aiwriter";
import type { IAttachment } from "@/types";
// import { useAutoScroll } from "@/components/ui/chat/hooks/useAutoScroll";
import { AvatarFallback } from "@radix-ui/react-avatar"; // Uncomment AvatarFallback import

type ExtraContentFields = {
    user: string;
    createdAt: number;
    isLoading?: boolean;
};

type ContentWithUser = Content & ExtraContentFields;

// Uncomment the type definition
type AnimatedDivProps = {
    style?: {
        display?: string;
        flexDirection?: string;
        gap?: string;
        opacity?: SpringValue<number>;
        transform?: SpringValue<string>;
    };
    children?: React.ReactNode;
};

const AnimatedDiv = animated.div as React.FC<AnimatedDivProps>; // Uncomment this line

export default function Page({ agentId }: { agentId: UUID }) {
    const { toast } = useToast();
    const [input, setInput] = useState("");
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const formRef = useRef<HTMLFormElement>(null);
    const socketRef = useRef<WebSocket | null>(null); // Ref to hold the WebSocket instance
    const chatContainerRef = useRef<HTMLDivElement>(null);

    const queryClient = useQueryClient();

    const getMessageVariant = (role: string) =>
        role !== "user" ? "received" : "sent";

    // const { scrollRef, isAtBottom, scrollToBottom, disableAutoScroll } = useAutoScroll({
    //     smooth: true,
    // });
   
    // useEffect(() => {
    //     scrollToBottom();
    // }, [queryClient.getQueryData(["messages", agentId])]);

    // useEffect(() => {
    //     scrollToBottom();
    // }, []);

    // WebSocket connection effect
    useEffect(() => {
        if (!agentId) {
            console.error("Agent ID is missing!");
            toast({
                variant: "destructive",
                title: "Configuration Error",
                description: "Agent ID is required.",
            });
            return;
        }

        const urlParams = new URLSearchParams(window.location.search);
        const mode = urlParams.get('mode'); // Check if running in embedded mode

        let wsUrl: string;

        if (mode === 'embedded') {
            // Construct WebSocket URL for same-origin (served by backend)
            const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsHost = window.location.host; // e.g., localhost:3000
            wsUrl = `${wsProtocol}//${wsHost}/${agentId}/ws`;
            console.log(`Attempting to connect WebSocket (embedded same-origin): ${wsUrl}`);
        } else {
            // Fallback: Construct URL directly (for non-embedded use)
            const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            // Use VITE_WS_PORT for standalone dev server, default to 3000 if not set
            const wsPort = import.meta.env.VITE_WS_PORT || '3000'; 
            const wsHost = window.location.hostname;
            wsUrl = `${wsProtocol}//${wsHost}:${wsPort}/${agentId}/ws`;
            console.log(`Attempting to connect WebSocket directly (standalone fallback): ${wsUrl}`);
        }

        const socket = new WebSocket(wsUrl);
        socketRef.current = socket; // Store socket instance in ref

        socket.onopen = () => {
            console.log("WebSocket connection established");
            toast({ title: "Connected to agent" });
        };

        socket.onmessage = (event) => {
            console.log("WebSocket message received:", event.data);
            try {
                const receivedData = JSON.parse(event.data);
                console.log("Parsed WebSocket data:", receivedData);

                // --- Restore state update logic ---
                // Validate received data structure (basic example)
                if (!receivedData || typeof receivedData.text !== 'string') {
                    console.error("Invalid message structure received:", receivedData);
                    toast({
                         variant: "destructive",
                         title: "Received invalid message format from server.",
                    });
                    return; 
                }

                // Explicitly create the new message object for the state
                const newMessage: ContentWithUser = {
                    // Map known fields from Content type
                    text: receivedData.text,
                    action: receivedData.action,
                    attachments: receivedData.attachments, // Ensure attachments are handled if present
                    // Use sender info from server if available, otherwise default
                    user: receivedData.user || 'system', // Assuming server might send 'user' field
                    createdAt: Date.now(),
                    isLoading: false, // Ensure isLoading is false for received messages
                    // Add any other fields from Content if necessary
                };

                // Update message list using TanStack Query
                queryClient.setQueryData(
                    ["messages", agentId],
                    (old: ContentWithUser[] = []) => [
                        ...old.filter((msg) => !msg.isLoading), // Remove previous loading placeholder
                        newMessage // Add the correctly structured message
                    ]
                );
                // --- End of restored block ---

            } catch (error) {
                console.error("Error parsing WebSocket message:", error);
                toast({
                    variant: "destructive",
                    title: "Error processing message",
                    description: String(error),
                });
            }
        };

        socket.onerror = (error) => {
            console.error("WebSocket error:", error);
            toast({
                variant: "destructive",
                title: "WebSocket Connection Error",
            });
        };

        socket.onclose = (event) => {
            console.log("WebSocket connection closed:", event);
            toast({ title: "Disconnected from agent", variant: "destructive" });
            socketRef.current = null; // Clear ref on close
        };

        // Cleanup on component unmount
        return () => {
            console.log("Closing WebSocket connection");
            socket.close();
            socketRef.current = null;
        };
    }, [agentId, queryClient, toast]); // Reconnect if agentId changes

    // /* --- Restore auto-scroll effects --- */
    // Effect to scroll to bottom when messages update
    // useEffect(() => {
    //     scrollToBottom();
    // }, [queryClient.getQueryData(["messages", agentId]), scrollToBottom]); // Added scrollToBottom dependency
    
    // Effect to scroll to bottom initially
    // useEffect(() => {
    //     scrollToBottom();
    // }, [scrollToBottom]); // Added scrollToBottom dependency
    // /* --- End of restored block --- */

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (e.nativeEvent.isComposing) return;
            handleSendMessage(null, input);
        }
    };

    // Modify handleSendMessage to use WebSocket if available (optional, depends on backend)
    // For now, it still uses HTTP POST via apiClient
    const handleSendMessage = (e: React.FormEvent<HTMLFormElement> | null, messageText?: string) => {
        e?.preventDefault();
        const textToSend = messageText || input;
        if (!textToSend) return;

        // Optimistic update: Add user message and loading placeholder immediately
        const optimisticUserMessage: ContentWithUser = {
            text: textToSend,
            user: "user",
            createdAt: Date.now(),
        };
        const loadingPlaceholder: ContentWithUser = {
            text: "",
            user: "system",
            isLoading: true,
            createdAt: Date.now() + 1, // Ensure unique key
        };

        queryClient.setQueryData(
            ["messages", agentId],
            (old: ContentWithUser[] = []) => [...old, optimisticUserMessage, loadingPlaceholder]
        );

        // Send message via HTTP POST (as before)
        // The server will handle processing and broadcasting the response via WebSocket
        sendMessageMutation.mutate({
            message: textToSend,
        });

        setInput("");
        formRef.current?.reset();
    };

    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.focus();
        }
    }, []);

    const sendMessageMutation = useMutation({
        mutationKey: ["send_message", agentId],
        mutationFn: ({
            message,
        }: {
            message: string;
        }) => apiClient.sendMessage(agentId, message),
        onSuccess: (newMessages: ContentWithUser[]) => {
            queryClient.setQueryData(
                ["messages", agentId],
                (old: ContentWithUser[] = []) => [
                    ...old.filter((msg) => !msg.isLoading),
                    ...newMessages.map((msg) => ({
                        ...msg,
                        createdAt: Date.now(),
                    })),
                ]
            );
        },
        onError: (e) => {
            toast({
                variant: "destructive",
                title: "Unable to send message",
                description: e.message,
            });
        },
    });

    const messages =
        queryClient.getQueryData<ContentWithUser[]>(["messages", agentId]) ||
        [];

    /* --- Temporarily commented out: Initial client-side message --- */
    // // Add initial welcome message if no messages exist
    // useEffect(() => {
    //     if (messages.length === 0) {
    //         queryClient.setQueryData(
    //             ["messages", agentId],
    //             [{
    //                 text: "Ciao! Sono Stella!\nPosso aiutarti a trovare informazioni sull'alloggio, opportunità di investimento, sulla vita a Collescipoli, o rispondere alle tue domande (Sono smart, non una classica chatbot)",
    //                 user: "system",
    //                 createdAt: Date.now(),
    //             }]
    //         );
    //     }
    // }, [messages.length, agentId, queryClient]);
    /* --- End of temporarily commented out block --- */

    // // Uncomment transition logic
    // const transitions = useTransition(messages, {
    //     from: { opacity: 0, transform: "translateY(10px)" },
    //     enter: { opacity: 1, transform: "translateY(0px)" },
    //     leave: { opacity: 0, transform: "translateY(-10px)" },
    //     keys: (item: ContentWithUser) => item.createdAt + item.user,
    //     trail: 100,
    // });

    return (
        <div className="flex flex-col h-full">
            <ChatMessageList 
                // ref={scrollRef} // Removed scrollRef
                // scrollRef={scrollRef} // Removed scrollRef prop
                // isAtBottom={isAtBottom} // Removed isAtBottom prop
                // scrollToBottom={scrollToBottom} // Removed scrollToBottom prop
                // disableAutoScroll={disableAutoScroll} // Removed disableAutoScroll prop
                className="flex-1 overflow-y-auto p-4"
            >
                {/* Temporarily render messages directly without transitions */}
                {messages.map((message: ContentWithUser) => (
                    <div key={message.createdAt + message.user} className={`flex flex-col gap-2 py-2`}> 
                        <ChatBubble
                            variant={getMessageVariant(message.user)}
                            className={cn(
                                "relative", 
                                "flex flex-col gap-2 py-2", // Apply layout classes here
                                message.isLoading && "animate-pulse"
                            )}
                        >
                            {/* Uncomment Avatar section */}
                            <div className="absolute top-0 left-0 transform -translate-x-1/2 -translate-y-1/2 z-10">
                                <Avatar className="h-8 w-8 border">
                                    <AvatarImage
                                        src={message.user !== "user" ? "/eliza.png" : "/user.png"}
                                        alt={message.user !== "user" ? "AI" : "User"}
                                        width={32}
                                        height={32}
                                    />
                                    <AvatarFallback className="bg-gray-300 dark:bg-gray-700"></AvatarFallback>
                                </Avatar>
                            </div>
                            {message.isLoading ? (
                                <div className="h-6 w-24 rounded-md bg-gray-300 dark:bg-gray-700" />
                            ) : (
                                <ChatBubbleMessage
                                    className={`whitespace-pre-wrap text-sm leading-relaxed ${message.user !== "user" ? 'text-gray-900 dark:text-gray-100' : 'text-white'}`}
                                >
                                    {message.text}
                                </ChatBubbleMessage>
                            )}
                            <div className="absolute bottom-1 right-2 flex items-center space-x-1 opacity-70">
                                {message.user !== "user" && !message.isLoading && (
                                    <CopyButton text={message.text} />
                                )}
                                {!message.isLoading && (
                                     <Tooltip>
                                        <TooltipTrigger asChild>
                                            <span className="text-xs">
                                                {moment(message.createdAt).fromNow()}
                                            </span>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            {moment(message.createdAt).format('LLL')}
                                        </TooltipContent>
                                    </Tooltip>
                                )}
                            </div>
                        </ChatBubble>
                    </div>
                ))}
            </ChatMessageList>
            <form 
                ref={formRef} 
                onSubmit={handleSendMessage}
                className="sticky bottom-0 border-t bg-background p-4 shadow-sm"
            >
                <div className="relative flex items-center">
                    <ChatInput
                        value={input}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        ref={inputRef}
                        placeholder="Ask Stella anything..."
                        className="flex-1 pr-12"
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                        <Button
                            type="submit"
                            size="icon"
                            variant="ghost"
                            disabled={sendMessageMutation.isPending || !input}
                            aria-label="Send message"
                            className="h-8 w-8 p-0"
                        >
                            <Send className="h-5 w-5" />
                        </Button>
                    </div>
                </div>
            </form>
        </div>
    );
}

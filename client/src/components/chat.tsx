import { Button } from "@/components/ui/button";
import {
    ChatBubble,
    ChatBubbleMessage,
    // ChatBubbleTimestamp, // Commented out unused import
} from "@/components/ui/chat/chat-bubble";
import { ChatInput } from "@/components/ui/chat/chat-input";
import { ChatMessageList } from "@/components/ui/chat/chat-message-list";
import { useTransition, animated, type AnimatedProps, type SpringValue } from "@react-spring/web";
import { Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Content, UUID } from "@elizaos/core";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { cn, moment } from "@/lib/utils";
import { Avatar, AvatarImage } from "./ui/avatar";
import CopyButton from "./copy-button";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import AIWriter from "react-aiwriter";
import type { IAttachment } from "@/types";
import { useAutoScroll } from "@/components/ui/chat/hooks/useAutoScroll";
import { AvatarFallback } from "@radix-ui/react-avatar";

type ExtraContentFields = {
    user: string;
    createdAt: number;
    isLoading?: boolean;
};

type ContentWithUser = Content & ExtraContentFields;

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

const AnimatedDiv = animated.div as React.FC<AnimatedDivProps>;

export default function Page({ agentId }: { agentId: UUID }) {
    const { toast } = useToast();
    const [input, setInput] = useState("");
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const formRef = useRef<HTMLFormElement>(null);

    const queryClient = useQueryClient();

    const getMessageVariant = (role: string) =>
        role !== "user" ? "received" : "sent";

    const { scrollRef, isAtBottom, scrollToBottom, disableAutoScroll } = useAutoScroll({
        smooth: true,
    });
   
    useEffect(() => {
        scrollToBottom();
    }, [queryClient.getQueryData(["messages", agentId])]);

    useEffect(() => {
        scrollToBottom();
    }, []);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (e.nativeEvent.isComposing) return;
            handleSendMessage(null, input);
        }
    };

    const handleSendMessage = (e: React.FormEvent<HTMLFormElement> | null, messageText?: string) => {
        e?.preventDefault();
        const textToSend = messageText || input;
        if (!textToSend) return;

        const newMessages = [
            {
                text: textToSend,
                user: "user",
                createdAt: Date.now(),
            },
            {
                text: "",
                user: "system",
                isLoading: true,
                createdAt: Date.now(),
            },
        ];

        queryClient.setQueryData(
            ["messages", agentId],
            (old: ContentWithUser[] = []) => [...old, ...newMessages]
        );

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

    // Add initial welcome message if no messages exist
    useEffect(() => {
        if (messages.length === 0) {
            queryClient.setQueryData(
                ["messages", agentId],
                [{
                    text: "Ciao! Sono Stella!\nPosso aiutarti a trovare informazioni sull'alloggio, opportunità di investimento, sulla vita a Collescipoli, o rispondere alle tue domande (Sono smart, non una classica chatbot)",
                    user: "system",
                    createdAt: Date.now(),
                }]
            );
        }
    }, [messages.length, agentId, queryClient]);

    const transitions = useTransition(messages, {
        from: { opacity: 0, transform: "translateY(10px)" },
        enter: { opacity: 1, transform: "translateY(0px)" },
        leave: { opacity: 0, transform: "translateY(-10px)" },
        keys: (item) => item.createdAt + item.user, // Use a unique key combination
        trail: 100, // Adds a slight delay between items
    });

    return (
        <div className="flex flex-col h-full">
            <ChatMessageList ref={scrollRef} className="flex-1 overflow-y-auto p-4">
                {transitions((style, message) => (
                    <AnimatedDiv style={style} className={`flex flex-col gap-2 py-2`}>
                        <ChatBubble
                            variant={getMessageVariant(message.user)}
                            className={cn(
                                "relative",
                                message.isLoading && "animate-pulse"
                            )}
                        >
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
                                    text={message.text}
                                    className={`whitespace-pre-wrap text-sm leading-relaxed ${message.user !== "user" ? 'text-gray-900 dark:text-gray-100' : 'text-white'}`}
                                />
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
                    </AnimatedDiv>
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
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        ref={inputRef}
                        placeholder="Ask Stella anything..."
                        className="flex-1 pr-12"
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                        <Button
                            type="submit"
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

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
        keys: (message) =>
            `${message.createdAt}-${message.user}-${message.text}`,
        from: { opacity: 0, transform: "translateY(50px)" },
        enter: { opacity: 1, transform: "translateY(0px)" },
        leave: { opacity: 0, transform: "translateY(10px)" },
    });

    return (
        <div className="flex h-full flex-col">
            <div className="flex-1 overflow-y-auto" ref={scrollRef}>
                <ChatMessageList 
                    scrollRef={scrollRef}
                    isAtBottom={isAtBottom}
                    scrollToBottom={scrollToBottom}
                    disableAutoScroll={disableAutoScroll}
                >
                    {transitions((style, message: ContentWithUser) => {
                        const variant = getMessageVariant(message?.user);
                        return (
                            <AnimatedDiv
                                style={{
                                    ...style,
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: "0.5rem",
                                }}
                            >
                                <ChatBubble
                                    variant={variant}
                                    className="flex flex-row items-center gap-2"
                                >
                                    {message?.user !== "user" ? (
                                        <Avatar className="size-20 rounded-lg border select-none">
                                            <AvatarImage src="/images/assistants/stella.png" className="rounded-lg object-cover" />
                                        </Avatar>
                                    ) : null}
                                    <div className="flex flex-col">
                                        <ChatBubbleMessage
                                            isLoading={message?.isLoading}
                                        >
                                            {
                                                message?.text && typeof message.text === 'string'
                                                    ? message.text.split('\n').map((line, index, arr) => (
                                                        <span key={index}>
                                                            {line}
                                                            {index < arr.length - 1 && <br />} 
                                                        </span>
                                                    ))
                                                    : message?.text
                                            }
                                        </ChatBubbleMessage>
                                    </div>
                                </ChatBubble>
                            </AnimatedDiv>
                        );
                    })}
                </ChatMessageList>
            </div>
            <div className="flex flex-col gap-2 p-4">
                { /* Suggested Questions Buttons */}
                <div className="flex flex-wrap gap-2 mb-2">
                    {
                        [
                            "Puoi dirmi di più sullo spazio di lavoro nell'appartamento?",
                            "Ci sono spazi di coworking nelle vicinanze?",
                            "Quali opzioni di trasporto sono disponibili a Collescipoli?"
                        ].map((q) => (
                            <Button
                                key={q}
                                variant="outline"
                                size="sm"
                                className="text-xs h-auto py-1 px-2 whitespace-normal text-left"
                                disabled={sendMessageMutation.isPending}
                                onClick={() => {
                                    handleSendMessage(null, q);
                                }}
                            >
                                {q}
                            </Button>
                        ))
                    }
                </div>
                <form
                    ref={formRef}
                    onSubmit={(e) => handleSendMessage(e)}
                    className="relative rounded-md border bg-card"
                >
                    <ChatInput
                        ref={inputRef}
                        onKeyDown={handleKeyDown}
                        value={input}
                        onChange={({ target }) => setInput(target.value)}
                        placeholder={sendMessageMutation.isPending ? "Stella is thinking..." : "Type your message here..."}
                        disabled={sendMessageMutation.isPending}
                        className="min-h-12 resize-none rounded-md bg-card border-0 p-3 shadow-none focus-visible:ring-0"
                    />
                    <div className="flex items-center p-3 pt-0">
                        <Button
                            disabled={!input || sendMessageMutation?.isPending}
                            type="submit"
                            size="sm"
                            className="ml-auto gap-1.5 h-[30px]"
                        >
                            {sendMessageMutation?.isPending
                                ? "..."
                                : "Send Message"}
                            <Send className="size-3.5" />
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}

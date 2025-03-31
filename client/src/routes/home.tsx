import { useQuery } from "@tanstack/react-query";
import { Cog } from "lucide-react";
import PageTitle from "@/components/page-title";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { apiClient } from "@/lib/api";
import { NavLink, useLocation } from "react-router-dom";
import type { UUID } from "@elizaos/core";
import { formatAgentName } from "@/lib/utils";
import { Skeleton } from "../components/ui/skeleton";

export default function Home() {
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const isEmbedded = queryParams.get('mode') === 'embedded';

    const query = useQuery({
        queryKey: ["agents"],
        queryFn: () => apiClient.getAgents(),
        refetchInterval: 5_000
    });

    const agents = query?.data?.agents;

    return (
        <div className="flex flex-col gap-4 h-full p-4">
            <PageTitle title="Agents" />
            <div 
                className={isEmbedded && agents?.length === 1 
                    ? "flex justify-center w-full"
                    : "grid grid-cols-1 gap-4 md:grid-cols-4"
                }
            >
                {agents?.map((agent: { id: UUID; name: string }) => (
                    <Card 
                        key={agent.id}
                        className={isEmbedded && agents?.length === 1 ? "w-full max-w-md" : ""}
                    >
                        <CardHeader className={agent?.name === "Stella" ? "text-center" : ""}>
                            {agent?.name !== "Stella" && <CardTitle>{agent?.name}</CardTitle>}
                            {agent?.name === "Stella" && (
                                <p className="text-sm text-muted-foreground">
                                    Ciao! Sono Stella!
                                    <br />
                                    Posso aiutarti a trovare informazioni sull'alloggio, opportunità di investimento, sulla vita a Collescipoli, o rispondere alle tue domande (Sono smart, non una classica chatbot)
                                </p>
                            )}
                        </CardHeader>
                        <CardContent>
                            {agent?.name === "Stella" ? (
                                <img 
                                    src="/images/assistants/stella.png" 
                                    alt="Stella" 
                                    className="rounded-md aspect-square w-48 h-48 mx-auto object-cover"
                                />
                            ) : (
                                <div className="rounded-md bg-muted aspect-square w-full grid place-items-center">
                                    <div className="text-6xl font-bold uppercase">
                                        {formatAgentName(agent?.name)}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                        <CardFooter>
                            <div className="flex items-center gap-4 w-full">
                                <NavLink
                                    to={`/chat/${agent.id}${location.search}`}
                                    className="w-full grow"
                                >
                                    <Button
                                        variant="outline"
                                        className="w-full grow"
                                    >
                                        Chat
                                    </Button>
                                </NavLink>
                                <NavLink
                                    to={`/settings/${agent.id}${location.search}`}
                                    key={agent.id}
                                >
                                    <Button size="icon" variant="outline">
                                        <Cog />
                                    </Button>
                                </NavLink>
                            </div>
                        </CardFooter>
                    </Card>
                ))}
            </div>
        </div>
    );
}

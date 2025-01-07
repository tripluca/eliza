import { Link } from "@remix-run/react";
import { useQuery } from "@tanstack/react-query";

import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "~/components/ui/sidebar";
import { apiClient } from "~/lib/api";

export function AppSidebar() {
    const query = useQuery({
        queryKey: ["agents"],
        queryFn: () => apiClient.getAgents(),
    });

    const agents = query?.data?.agents;

    return (
        <Sidebar>
            <SidebarContent>
                <SidebarGroup>
                    <Link to="/">
                        <SidebarGroupLabel>
                            <img
                                src="/elizaos.webp"
                                width="100%"
                                height="100%"
                                className="w-32"
                            />
                        </SidebarGroupLabel>
                    </Link>
                    <SidebarGroupLabel>Agents</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {agents?.map((agent) => (
                                <SidebarMenuItem key={agent.id}>
                                    <Link to={`/chat/${agent.id}`}>
                                        <SidebarMenuButton>
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 bg-muted rounded-md uppercase aspect-square grid place-items-center">
                                                    {agent?.name?.substring(
                                                        0,
                                                        2
                                                    )}
                                                </div>
                                                <span>{agent.name}</span>
                                            </div>
                                        </SidebarMenuButton>
                                    </Link>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>
        </Sidebar>
    );
}

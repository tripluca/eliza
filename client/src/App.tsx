import "./index.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./components/app-sidebar";
import { TooltipProvider } from "./components/ui/tooltip";
import { Toaster } from "./components/ui/toaster";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import Chat from "./routes/chat";
import Overview from "./routes/overview";
import Home from "./routes/home";
import useVersion from "./hooks/use-version";
import { cn } from "./lib/utils";

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: Number.POSITIVE_INFINITY,
        },
    },
});

function AppLayout() {
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const isEmbedded = queryParams.get('mode') === 'embedded';

    return (
        <div
            className="dark antialiased"
            style={{
                colorScheme: "dark",
            }}
        >
            <TooltipProvider delayDuration={0}>
                <SidebarProvider>
                    {!isEmbedded && <AppSidebar />}
                    <SidebarInset>
                        <div className={cn("flex flex-1 flex-col gap-4 size-full", !isEmbedded && "container")}>
                            <Routes>
                                <Route path="/" element={<Home />} />
                                <Route
                                    path="chat/:agentId"
                                    element={<Chat />}
                                />
                                <Route
                                    path="settings/:agentId"
                                    element={<Overview />}
                                />
                            </Routes>
                        </div>
                    </SidebarInset>
                </SidebarProvider>
                <Toaster />
            </TooltipProvider>
        </div>
    );
}

function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <BrowserRouter>
                <AppLayout />
            </BrowserRouter>
        </QueryClientProvider>
    );
}

export default App;

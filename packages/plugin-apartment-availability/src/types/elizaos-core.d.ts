declare module '@elizaos/core' {
  export interface IAgentRuntime {
    getService(serviceType: string): any;
    registerService(serviceType: string, service: any): void;
    registerAction(action: Action): void;
  }
  
  export interface Action {
    name: string;
    description: string;
    examples: string[];
    handler: (runtime: IAgentRuntime, params: any) => Promise<any>;
  }
  
  export interface Plugin {
    name: string;
    version: string;
    description: string;
    initialize: (runtime: IAgentRuntime) => Promise<boolean>;
    shutdown: (runtime: IAgentRuntime) => Promise<boolean>;
    actions?: Action[];
  }
  
  export interface Service {
    // Base service interface
  }
} 
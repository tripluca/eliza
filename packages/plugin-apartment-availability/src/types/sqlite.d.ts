declare module 'sqlite' {
  export interface Database {
    exec(sql: string): Promise<void>;
    run(sql: string, params?: any[]): Promise<any>;
    get(sql: string, params?: any[]): Promise<any>;
    all(sql: string, params?: any[]): Promise<any[]>;
    close(): Promise<void>;
  }
  
  export interface OpenOptions {
    filename: string;
    driver: any;
  }
  
  export function open(options: OpenOptions): Promise<Database>;
} 
export function officeEnv(env: NodeJS.ProcessEnv, legacyName: string): string | undefined;
export function officeOverrides(env: NodeJS.ProcessEnv, values: Record<string, string>): NodeJS.ProcessEnv;
export function officeHome(env?: NodeJS.ProcessEnv, home?: string, exists?: (file: string) => boolean): string;

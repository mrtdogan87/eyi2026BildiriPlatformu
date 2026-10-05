export type EnvironmentConfig = { mode: 'local' | 'preview' | 'production'; namespace: string; captureDir?: string };
export function assertEnvironment(env?: NodeJS.ProcessEnv): EnvironmentConfig;
export function assertLocal(env?: NodeJS.ProcessEnv): EnvironmentConfig;
export function assertMigrationTarget(env?: NodeJS.ProcessEnv): EnvironmentConfig;

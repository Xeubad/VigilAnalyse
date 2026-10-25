// shared/record-schema.mjs 的类型声明，供前端 TS 复用
export declare const RECORD_TYPES: readonly string[];
export declare const SEVERITIES: readonly string[];
export declare function validateRecord(r: unknown): string | null;

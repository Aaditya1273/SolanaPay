export const isAddress = (address: string) => /^0x[a-fA-F0-9]{40}$/.test(address);
export const isPositiveNumber = (n: number) => typeof n === 'number' && isFinite(n) && n > 0;
export const assert = (cond: any, msg: string): asserts cond => { if (!cond) throw new Error(msg); };

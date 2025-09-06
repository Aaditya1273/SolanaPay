export const delay = (ms: number) => new Promise(res => setTimeout(res, ms));
export const uuid = () => `id_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
export const now = () => Date.now();

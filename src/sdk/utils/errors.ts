export class SDKError extends Error { constructor(message: string, public code?: string, public meta?: any){ super(message); this.name='SDKError'; } }
export class ValidationError extends SDKError { constructor(message: string, meta?: any){ super(message, 'VALIDATION_ERROR', meta); }}

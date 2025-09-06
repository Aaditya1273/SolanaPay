// Type definitions for trusted-types
// This file provides basic type definitions for the Trusted Types API

declare global {
  interface Window {
    trustedTypes?: {
      createPolicy: (name: string, rules: any) => any;
      defaultPolicy?: any;
    };
  }
}

// Basic trusted types interfaces
interface TrustedHTML {
  toString(): string;
}

interface TrustedScript {
  toString(): string;
}

interface TrustedScriptURL {
  toString(): string;
}

interface TrustedTypePolicy {
  createHTML(input: string): TrustedHTML;
  createScript(input: string): TrustedScript;
  createScriptURL(input: string): TrustedScriptURL;
}

interface TrustedTypePolicyFactory {
  createPolicy(policyName: string, policyOptions?: any): TrustedTypePolicy;
  isHTML(value: any): value is TrustedHTML;
  isScript(value: any): value is TrustedScript;
  isScriptURL(value: any): value is TrustedScriptURL;
}

declare const trustedTypes: TrustedTypePolicyFactory | undefined;

export {};

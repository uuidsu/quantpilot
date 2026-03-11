export interface ProviderDef {
  id: string;
  label: string;
  requiresKey: boolean;
  keyLabel: string;
  keyPlaceholder: string;
}

export const PROVIDER_DEFS: ProviderDef[] = [
  {
    id: "twse",
    label: "證交所 TWSE（免費）",
    requiresKey: false,
    keyLabel: "",
    keyPlaceholder: "",
  },
  {
    id: "fugle",
    label: "富果 Fugle",
    requiresKey: true,
    keyLabel: "API Token",
    keyPlaceholder: "fugle-api-token-xxx",
  },
];

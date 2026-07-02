type DemoCredentialPair = {
  identifier: string;
  password: string;
};

const DEMO_CREDENTIALS: DemoCredentialPair[] = [
  { identifier: "admin", password: "12345678" },
  { identifier: "admin@kayora.com", password: "12345678" },
];

function normalizeIdentifier(identifier: string): string {
  return identifier.trim().toLowerCase();
}

export function attemptDemoLogin(identifier: string, password: string): boolean {
  const normalizedInput = normalizeIdentifier(identifier);

  return DEMO_CREDENTIALS.some(
    (pair) => normalizeIdentifier(pair.identifier) === normalizedInput && pair.password === password
  );
}
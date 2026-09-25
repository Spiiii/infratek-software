const neonTargets = {
  preview: "ep-nameless-leaf-b3fc4hoi",
  production: "ep-still-fog-b3h6yj1y",
} as const;

type GuardedTarget = keyof typeof neonTargets;

const endpointIdFromUrl = (connectionString: string) => {
  let hostname: string;
  try {
    hostname = new URL(connectionString).hostname;
  } catch {
    throw new Error("Migration database URL is invalid");
  }

  const firstLabel = hostname.split(".")[0];
  return firstLabel.endsWith("-pooler")
    ? firstLabel.slice(0, -"-pooler".length)
    : firstLabel;
};

export const assertMigrationTarget = (
  target: string,
  connectionString: string,
) => {
  if (target !== "preview" && target !== "production") return;

  const actualEndpoint = endpointIdFromUrl(connectionString);
  const expectedEndpoint = neonTargets[target as GuardedTarget];
  if (actualEndpoint !== expectedEndpoint) {
    throw new Error(
      `Refusing ${target} migration: URL endpoint ${actualEndpoint} does not match ${expectedEndpoint}`,
    );
  }
};


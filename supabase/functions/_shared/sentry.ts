const DSN = "https://359bf5e29aa3462dae0797ffb6f97f20@pitoune.bugsink.com/1";

const dsnMatch = DSN.match(/^https:\/\/(.+)@(.+)\/(\d+)$/);
const [, sentryKey, sentryHost, projectId] = dsnMatch!;
const envelopeUrl = `https://${sentryHost}/api/${projectId}/envelope/`;

export function captureException(
  err: unknown,
  tags: Record<string, string> = {}
) {
  const error = err instanceof Error ? err : new Error(String(err));

  const frames = (error.stack || "")
    .split("\n")
    .slice(1)
    .map((line) => {
      const match = line.match(/at\s+(.+?)\s+\((.+):(\d+):(\d+)\)/);
      if (!match) return { filename: line.trim(), lineno: 0, function: "?" };
      return {
        function: match[1],
        filename: match[2],
        lineno: parseInt(match[3]),
        colno: parseInt(match[4]),
      };
    });

  const event = {
    event_id: crypto.randomUUID().replace(/-/g, ""),
    timestamp: Date.now() / 1000,
    platform: "node",
    server_name: "supabase-edge",
    tags,
    exception: {
      values: [
        {
          type: error.name,
          value: error.message,
          stacktrace: { frames },
        },
      ],
    },
  };

  const envelope = [
    JSON.stringify({
      event_id: event.event_id,
      sent_at: new Date().toISOString(),
      dsn: DSN,
    }),
    JSON.stringify({ type: "event" }),
    JSON.stringify(event),
  ].join("\n");

  // Fire-and-forget
  fetch(envelopeUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-sentry-envelope",
      "X-Sentry-Auth": `Sentry sentry_version=7, sentry_key=${sentryKey}`,
    },
    body: envelope,
  }).catch(() => {});
}

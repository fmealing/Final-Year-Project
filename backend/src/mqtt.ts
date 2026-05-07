// ─── HiveMQ MQTT publisher ────────────────────────────────────────────────────
import mqtt, { MqttClient } from "mqtt";

let client: MqttClient | null = null;

export function getMqttClient(): MqttClient | null {
  return client;
}

export function initMqtt(): void {
  const brokerUrl = process.env.HIVEMQ_URL;
  if (!brokerUrl) {
    console.warn("[MQTT] HIVEMQ_URL not set — skipping MQTT init");
    return;
  }

  client = mqtt.connect(brokerUrl, {
    username: process.env.HIVEMQ_USERNAME,
    password: process.env.HIVEMQ_PASSWORD,
    clientId: `ghost-glove-backend-${Math.random().toString(16).slice(2, 8)}`,
  });

  client.on("connect", () => console.log("[MQTT] Connected to HiveMQ"));
  client.on("error",   (e) => console.error("[MQTT] Error:", e.message));
}

// Publish a session summary after upload
export function publishSessionSummary(summary: {
  sessionId: string;
  repCount: number;
  durationMs: number;
  startedAt: string;
}): void {
  if (!client?.connected) return;
  client.publish(
    "ghostglove/sessions/summary",
    JSON.stringify(summary),
    { qos: 1, retain: false }
  );
}

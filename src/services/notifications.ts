import { insertRow, updateRow } from "./api";

export type NotificationEventName =
  | "BOOKING_CREATED" | "BOOKING_CONFIRMED" | "DRIVER_ASSIGNED" | "DRIVER_ACCEPTED"
  | "TRIP_STARTED" | "ETA_UPDATED" | "TRIP_DELAYED" | "BREAKDOWN_REPORTED"
  | "TRIP_DELIVERED" | "POD_AVAILABLE" | "INVOICE_CREATED" | "PAYMENT_REMINDER"
  | "PAYMENT_RECEIVED" | "DOCUMENT_EXPIRING" | "MAINTENANCE_DUE";

export interface MessagePayload {
  recipient: string;
  template: string;
  variables: Record<string, string | number>;
}

export interface MessagingProvider {
  readonly id: string;
  send(message: MessagePayload): Promise<{ ok: true } | { ok: false; reason: string }>;
}

export const mockWhatsAppProvider: MessagingProvider = {
  id: "mock-whatsapp",
  async send(message) {
    if (!message.recipient) return { ok: false, reason: "Missing recipient" };
    return { ok: true };
  },
};

let provider: MessagingProvider = mockWhatsAppProvider;
export function setMessagingProvider(next: MessagingProvider) {
  provider = next;
}

/** Records the notification, then hands it to the configured channel adapter. */
export async function emitNotification(input: {
  tenantId: string;
  event: NotificationEventName;
  recipient: string;
  recipientUserId?: string;
  channel?: "whatsapp" | "sms" | "email" | "in_app";
  template?: string;
  payload?: Record<string, unknown>;
}) {
  const row = await insertRow("notifications", {
    tenant_id: input.tenantId,
    event: input.event,
    recipient: input.recipient,
    recipient_user_id: input.recipientUserId ?? null,
    channel: input.channel ?? "whatsapp",
    template: input.template ?? input.event.toLowerCase(),
    payload: (input.payload ?? {}) as never,
    status: "queued",
  });

  const result = await provider.send({
    recipient: input.recipient,
    template: row.template ?? input.event,
    variables: (input.payload ?? {}) as Record<string, string | number>,
  });

  await updateRow(
    "notifications",
    row.id,
    result.ok
      ? { status: "sent", sent_at: new Date().toISOString() }
      : { status: "failed", failure_reason: result.reason },
  ).catch(() => undefined);

  return row;
}

export async function writeAudit(input: {
  tenantId: string;
  userId?: string | null;
  actorName?: string | null;
  action: string;
  entity: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}) {
  await insertRow("audit_logs", {
    tenant_id: input.tenantId,
    user_id: input.userId ?? null,
    actor_name: input.actorName ?? null,
    action: input.action,
    entity: input.entity,
    entity_id: input.entityId ?? null,
    metadata: (input.metadata ?? {}) as never,
  }).catch(() => undefined);
}

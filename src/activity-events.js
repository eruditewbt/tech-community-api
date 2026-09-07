"use strict";

const { insertActivity } = require("./db");
const { enabled, insert } = require("./connectwbt-store");

async function emitActivity({
  ownerUid,
  eventType,
  entityType,
  entityId,
  summary,
  payload = {},
}) {
  const record = {
    event_type: eventType,
    owner_uid: ownerUid || "",
    page: "authenticated-workspace",
    label: summary || eventType,
    payload: {
      actor_type: "user",
      visibility: "owner",
      entity_type: entityType || "",
      entity_id: entityId || null,
      ...payload,
    },
  };
  if (enabled()) {
    try {
      return await insert("activities", {
        ...record,
        created_at: new Date().toISOString(),
      });
    } catch (_) {
      // Local persistence remains the compatibility fallback during migration.
    }
  }
  return insertActivity(record);
}

module.exports = { emitActivity };

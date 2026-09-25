import { createHmac, randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";

import { migrate } from "drizzle-orm/node-postgres/migrator";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { buildApp } from "../src/app.js";
import { createDatabase } from "../src/db/client.js";

const databaseUrl = process.env.TEST_DATABASE_URL;
const signingSecret = "integration-test-secret";

describe.runIf(Boolean(databaseUrl))("lead workflow with PostgreSQL", () => {
  if (databaseUrl && !new URL(databaseUrl).pathname.endsWith("_test")) {
    throw new Error(
      "TEST_DATABASE_URL must point to a dedicated *_test database",
    );
  }

  const connectionString =
    databaseUrl ?? "postgres://localhost/lead_intake_test";
  const database = createDatabase(connectionString);
  const app = buildApp(
    {},
    {
      config: {
        databaseUrl: connectionString,
        port: 3001,
        webhookSigningSecret: signingSecret,
      },
      database,
    },
  );

  async function deliver(payload: object) {
    const body = JSON.stringify(payload);
    const signature = createHmac("sha256", signingSecret)
      .update(body)
      .digest("hex");

    return app.inject({
      method: "POST",
      url: "/webhook/meta-lead",
      headers: {
        "content-type": "application/json",
        "x-hub-signature-256": `sha256=${signature}`,
      },
      payload: body,
    });
  }

  beforeAll(async () => {
    await migrate(database.db, {
      migrationsFolder: fileURLToPath(new URL("../drizzle", import.meta.url)),
    });
    await app.ready();
  });

  beforeEach(async () => {
    await database.pool.query("TRUNCATE lead_activities, leads CASCADE");
  });

  afterAll(async () => {
    await app.close();
    await database.pool.end();
  });

  it("creates, enriches, lists, and audits a lead without duplicating retries", async () => {
    const metaLeadId = `test-${randomUUID()}`;
    const notification = {
      object: "page",
      entry: [
        {
          id: "page-1",
          changes: [
            {
              field: "leadgen",
              value: { leadgen_id: metaLeadId, form_id: "form-1" },
            },
          ],
        },
      ],
    };
    const created = await deliver(notification);
    expect(created.statusCode).toBe(200);
    expect(created.json().data[0].action).toBe("created");
    const id: string = created.json().data[0].lead.id;

    const enrichment = {
      leadgen_id: metaLeadId,
      campaign_name: "Autumn outreach",
      field_data: [
        { name: "full_name", values: ["Avery Stone"] },
        { name: "email", values: ["avery@example.com"] },
      ],
    };
    expect((await deliver(enrichment)).json().data[0].action).toBe("updated");
    expect((await deliver(enrichment)).json().data[0].action).toBe("unchanged");

    const list = await app.inject({
      method: "GET",
      url: "/leads?search=Avery&campaign=Autumn%20outreach",
    });
    expect(list.statusCode).toBe(200);
    expect(list.json().pagination.total).toBe(1);
    expect(list.json().data[0]).toMatchObject({ id, fullName: "Avery Stone" });

    const detail = await app.inject({ method: "GET", url: `/leads/${id}` });
    expect(detail.statusCode).toBe(200);
    expect(
      detail
        .json()
        .activities.map((activity: { type: string }) => activity.type),
    ).toEqual(["lead_updated", "lead_created"]);
    expect(detail.json().activities[0].changes.email).toEqual({
      from: null,
      to: "avery@example.com",
    });
  });

  it("records one status change and rejects invalid or missing leads", async () => {
    const created = await deliver({ leadgen_id: `test-${randomUUID()}` });
    const id: string = created.json().data[0].lead.id;

    const changed = await app.inject({
      method: "PATCH",
      url: `/leads/${id}/status`,
      payload: { status: "qualified" },
    });
    expect(changed.json()).toMatchObject({
      changed: true,
      lead: { status: "qualified" },
    });

    const unchanged = await app.inject({
      method: "PATCH",
      url: `/leads/${id}/status`,
      payload: { status: "qualified" },
    });
    expect(unchanged.json().changed).toBe(false);

    const detail = await app.inject({ method: "GET", url: `/leads/${id}` });
    expect(detail.json().activities).toHaveLength(2);
    expect(detail.json().activities[0]).toMatchObject({
      type: "status_changed",
      changes: { status: { from: "new", to: "qualified" } },
    });
    expect(
      (await app.inject({ method: "GET", url: `/leads/${randomUUID()}` }))
        .statusCode,
    ).toBe(404);
    expect(
      (
        await app.inject({
          method: "PATCH",
          url: `/leads/${id}/status`,
          payload: { status: "invalid" },
        })
      ).statusCode,
    ).toBe(400);
  });

  it("serializes concurrent deliveries for the same Meta lead", async () => {
    const payload = {
      leadgen_id: `test-${randomUUID()}`,
      full_name: "Jordan Lee",
    };
    const responses = await Promise.all([deliver(payload), deliver(payload)]);
    expect(responses.map((response) => response.statusCode)).toEqual([
      200, 200,
    ]);
    expect(
      responses.map((response) => response.json().data[0].action).sort(),
    ).toEqual(["created", "unchanged"]);

    const id: string = responses[0].json().data[0].lead.id;
    const detail = await app.inject({ method: "GET", url: `/leads/${id}` });
    expect(
      detail
        .json()
        .activities.map((activity: { type: string }) => activity.type),
    ).toEqual(["lead_created"]);
    const list = await app.inject({ method: "GET", url: "/leads" });
    expect(list.json().pagination.total).toBe(1);
  });
});

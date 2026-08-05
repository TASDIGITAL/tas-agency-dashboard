// VERSION MARKER: v38-pipeline-custom-domain-20260709
// Single-file Cloudflare Worker — TAS Agency Performance Dashboard
//
// Bundles the dashboard HTML + Airtable proxy in one file.
//
// Required env vars (set in Worker → Settings → Variables and Secrets):
//   AIRTABLE_PAT      - Personal Access Token (mark as Secret/Encrypted)
//   AIRTABLE_BASE_ID  - Base ID, e.g. app6EwM4FrmsQ1UDO (plaintext is fine)
//
// Routes:
//   GET /api/data  → live JSON from Airtable (cached 10 min at edge)
//   GET /*         → serves the dashboard HTML

const DEFAULT_BASE_ID = "app6EwM4FrmsQ1UDO";
const CLIENTS_TBL = "tblh5WoxGQZJPiesP";
const CHURN_TBL = "tblVhTVfwVlG6va6K";

const CLIENT_FIELDS = [
  "fldkinqnN4Kx4xqDR", "fld3r7ptm18dqwHef", "fld92vjpDt9h9WFLh", "fld684Y1dXLZx7IDB",
  "fldqDfiTiEi6Ms5HB", "fld0Rf9o4zVj3i2IW", "fldWJTkpMerCvGuDx", "fldtyDwMZCCz8Itr8",
  "fldr6jJSGpPzZarN4", "fldnqgLeCkcOQ0Ki6", "fldjv4XAXvCQpoEwM", "fldrgwhwSRQjcKNNx",
  "flduRHhVX7f4ivvDR", "fldaqeQ62Rb9Ve7l4", "fldRqyXAgwX2hdyMm", "fldOesk4T2NJpHSgn",
  "fldFlrVgnXN8Y38yl", "fldzE0lGtepDKZgj4", "fldJdvijOeRbrhhjN", "fldKmZg38UlJEwjhI",
  "fldnEGrKUWFEIA8Gy", "fldMirANV1q7bPNia", "flddzaoCDc8h6axdz", "fldQ2PtIYZUfb8tlT",
  "fldJvh3fIkKqOHKu6", "fldodEdeU90dSrjpq", "fldx43ntoK5uLFZl1", "fldPewJmG4jUwavcu",
];
const CHURN_FIELDS = [
  "fldkjydTWYCuknSRz", "flduWCMzkTsFtlN5I", "fld9NcGFHPnYTkO9c", "fldwnGMcu1a6U8IIv",
  "flddWj2oFpYtPKVWI", "fldxRBmyyFFtw0slR", "fldjHQmUi1Uzwh9vk", "fldd3dTJuv8fgW3bA",
  "fldCRmmfDTrsFhnO0", "fldyZgGJqRSHjOPKH",
];

async function fetchAllRecords(baseId, tableId, fieldIds, pat, filterFormula) {
  const all = [];
  let offset = null;
  let safety = 30;
  do {
    const url = new URL(`https://api.airtable.com/v0/${baseId}/${tableId}`);
    url.searchParams.set("pageSize", "100");
    url.searchParams.set("returnFieldsByFieldId", "true");
    fieldIds.forEach((id) => url.searchParams.append("fields[]", id));
    if (filterFormula) url.searchParams.set("filterByFormula", filterFormula);
    if (offset) url.searchParams.set("offset", offset);

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${pat}`, "Content-Type": "application/json" },
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Airtable ${tableId} returned ${res.status}: ${text.slice(0, 200)}`);
    }
    const data = await res.json();
    all.push(...(data.records || []));
    offset = data.offset || null;
    safety--;
  } while (offset && safety > 0);
  return all;
}

function projectClient(r) {
  const f = r.fields;
  const name = (v) => (v && v.name) || (Array.isArray(v) && v[0] && v[0].name) || null;
  const names = (v) => (Array.isArray(v) ? v.map((x) => x.name).filter(Boolean) : []);
  const linkNames = (v) => (Array.isArray(v) ? v.map((x) => x.name || x).filter(Boolean) : []);
  const numOrNull = (v) => {
    if (v === null || v === undefined || v === "" || v === "No Dates") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  return {
    id: r.id,
    brand: f.fldkinqnN4Kx4xqDR || "(unnamed)",
    onHold: f.fld92vjpDt9h9WFLh === true,
    phase: name(f.fld684Y1dXLZx7IDB),
    services: names(f.fldqDfiTiEi6Ms5HB),
    upsell: names(f.fld0Rf9o4zVj3i2IW),
    retention: {
      meta: numOrNull(f.fldWJTkpMerCvGuDx),
      cs: numOrNull(f.fldtyDwMZCCz8Itr8),
      email: numOrNull(f.fldr6jJSGpPzZarN4),
      tiktok: numOrNull(f.fldnqgLeCkcOQ0Ki6),
    },
    results: names(f.fldjv4XAXvCQpoEwM),
    temperature: names(f.fldrgwhwSRQjcKNNx),
    niche: name(f.flduRHhVX7f4ivvDR),
    country: name(f.fldaqeQ62Rb9Ve7l4),
    testimonial: name(f.fldRqyXAgwX2hdyMm),
    caseStudy: name(f.fldOesk4T2NJpHSgn),
    signed: f.fldFlrVgnXN8Y38yl === true,
    team: {
      adsCsm: linkNames(f.fldzE0lGtepDKZgj4),
      emailCsm: linkNames(f.fldJdvijOeRbrhhjN),
      emailStrategist: linkNames(f.fldKmZg38UlJEwjhI),
      metaMgr: linkNames(f.fldnEGrKUWFEIA8Gy),
      googleMgr: linkNames(f.fldMirANV1q7bPNia),
      creative: linkNames(f.flddzaoCDc8h6axdz),
      designer: linkNames(f.fldQ2PtIYZUfb8tlT),
      videoEditor: linkNames(f.fldJvh3fIkKqOHKu6),
    },
    starts: {
      meta: f.fldodEdeU90dSrjpq || null,
      cs: f.fldx43ntoK5uLFZl1 || null,
      email: f.fldPewJmG4jUwavcu || null,
    },
  };
}

function projectChurn(r) {
  const f = r.fields;
  const name = (v) => (v && v.name) || (Array.isArray(v) && v[0] && v[0].name) || null;
  const names = (v) => (Array.isArray(v) ? v.map((x) => x.name).filter(Boolean) : []);
  const firstNum = (v) => (Array.isArray(v) && v[0] != null ? Number(v[0]) : null);
  return {
    id: r.id,
    addedAt: f.fldkjydTWYCuknSRz || null,
    client: names(f.flduWCMzkTsFtlN5I)[0] || null,
    services: names(f.fld9NcGFHPnYTkO9c),
    primaryReason: name(f.fldwnGMcu1a6U8IIv),
    secondaryReason: name(f.flddWj2oFpYtPKVWI),
    whoResponsible: name(f.fldxRBmyyFFtw0slR),
    phase: (Array.isArray(f.fldjHQmUi1Uzwh9vk) ? f.fldjHQmUi1Uzwh9vk[0] : null),
    metaMonths: firstNum(f.fldd3dTJuv8fgW3bA),
    csMonths: firstNum(f.fldCRmmfDTrsFhnO0),
    potentialRevive: f.fldyZgGJqRSHjOPKH === true,
  };
}

async function handleData(request, env) {
  const PAT = env.AIRTABLE_PAT;
  const BASE = env.AIRTABLE_BASE_ID || DEFAULT_BASE_ID;
  if (!PAT) {
    return new Response(
      JSON.stringify({ error: "AIRTABLE_PAT environment variable not set. Go to Worker → Settings → Variables and Secrets and add it as a Secret." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const url = new URL(request.url);
  const force = url.searchParams.get("refresh") === "1";
  const cacheKey = new Request(url.toString(), { method: "GET" });
  const cache = caches.default;

  if (!force) {
    const hit = await cache.match(cacheKey);
    if (hit) return hit;
  }

  try {
    const [clientsRaw, churnRaw] = await Promise.all([
      fetchAllRecords(BASE, CLIENTS_TBL, CLIENT_FIELDS, PAT, "{Active}=TRUE()"),
      fetchAllRecords(BASE, CHURN_TBL, CHURN_FIELDS, PAT, null),
    ]);

    const payload = {
      generatedAt: new Date().toISOString(),
      counts: { activeClients: clientsRaw.length, churn: churnRaw.length },
      clients: clientsRaw.map(projectClient),
      churn: churnRaw.map(projectChurn),
    };

    const response = new Response(JSON.stringify(payload), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=600",
        "Access-Control-Allow-Origin": "*",
      },
    });
    await cache.put(cacheKey, response.clone());
    return response;
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e.message || e) }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }
}

// === Creative Pipeline functions ===

const PIPELINE_BASE_ID = "app6EwM4FrmsQ1UDO";
const PIPELINE_CLIENTS_TBL = "tblh5WoxGQZJPiesP";
const PIPELINE_TEAM_TBL = "tbluNTnWSduQoVaWT";

// Multi-base client groups: ONE Airtable client record can map to MULTIPLE Airtable bases.
// Keyed by the Creative Base ID set on the Clients table. When a client's base ID appears
// here, the worker fans it out into N virtual sub-clients (one per base), each with the
// same team assignments but a distinct brand suffix.
const MULTI_BASE_GROUPS = {
  "appayUDNwZ9CR0o9m": [
    { baseId: "appayUDNwZ9CR0o9m", suffix: "" },
    { baseId: "apph5ye18T3GP1JPX", suffix: " (M)" },
    { baseId: "apprNKez5QYeVy4J7", suffix: " (LF)" },
  ],
};

const PIPELINE_CLIENT_FIELDS = [
  "fldkinqnN4Kx4xqDR", // Brand Name
  "fldqDfiTiEi6Ms5HB", // Services
  "fldfbAz1wkEqAbs0h", // Creative Base ID
  "fldzE0lGtepDKZgj4", // Advertising CSM (multipleRecordLinks → Team)
  "flddzaoCDc8h6axdz", // Creative Strategist (multipleRecordLinks → Team)
  "fldIeq1h6b2LOS9yj", // Backup Creative Strategist (multipleRecordLinks → Team)
  "fldQ2PtIYZUfb8tlT", // Designer (multipleRecordLinks → Team)
  "fldJvh3fIkKqOHKu6", // Video Editor (multipleRecordLinks → Team)
  "fldnEGrKUWFEIA8Gy", // Social Media Campaign Manager (Meta/TikTok) → Team
  "fldMirANV1q7bPNia", // Google Campaign Manager → Team
];

async function fetchTeamMap(pat) {
  // Returns: { recordId: { name, concepts, veConcepts, veVideos } }
  const url = new URL(`https://api.airtable.com/v0/${PIPELINE_BASE_ID}/${PIPELINE_TEAM_TBL}`);
  url.searchParams.set("pageSize", "100");
  url.searchParams.set("returnFieldsByFieldId", "true");
  url.searchParams.append("fields[]", "fldCYaeghWNozgPsn"); // Name
  url.searchParams.append("fields[]", "fldtL0oxUyTj2YE9f"); // Assigned Concepts (CS)
  url.searchParams.append("fields[]", "fld6ytI9ioghzcuvd"); // VE Assigned Concepts
  url.searchParams.append("fields[]", "fldCOoRMBGQhdCfNs"); // VE Assigned Videos
  const map = {};
  let offset = null;
  let safety = 10;
  do {
    if (offset) url.searchParams.set("offset", offset); else url.searchParams.delete("offset");
    const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${pat}` } });
    if (!res.ok) break;
    const data = await res.json();
    for (const r of data.records || []) {
      const f = r.fields || {};
      map[r.id] = {
        name: f.fldCYaeghWNozgPsn || null,
        concepts: Number(f.fldtL0oxUyTj2YE9f) || 0,
        veConcepts: Number(f.fld6ytI9ioghzcuvd) || 0,
        veVideos: Number(f.fldCOoRMBGQhdCfNs) || 0,
      };
    }
    offset = data.offset || null;
    safety--;
  } while (offset && safety > 0);
  return map;
}

async function fetchActiveClientsWithBase(env) {
  const [teamMap, records] = await Promise.all([
    fetchTeamMap(env.AIRTABLE_PAT),
    fetchAllRecords(PIPELINE_BASE_ID, PIPELINE_CLIENTS_TBL, PIPELINE_CLIENT_FIELDS, env.AIRTABLE_PAT,
      "AND({Active}=TRUE(), NOT({Creative Base ID}=''))"),
  ]);
  const mapped = records.map((r) => {
    const f = r.fields;
    const services = (f.fldqDfiTiEi6Ms5HB || []).map((s) => (typeof s === "string" ? s : s.name || s));
    const resolveOne = (entry) => {
      if (typeof entry === "string") {
        const t = teamMap[entry];
        return t ? (t.name || entry) : entry;
      }
      if (entry && entry.name) return entry.name;
      return null;
    };
    const resolveAll = (linkArr) => {
      if (!Array.isArray(linkArr)) return [];
      return linkArr.map(resolveOne).filter(Boolean);
    };
    // Merge primary + backup creative strategists, deduped
    const csList = [
      ...resolveAll(f.flddzaoCDc8h6axdz),
      ...resolveAll(f.fldIeq1h6b2LOS9yj),
    ].filter((name, i, arr) => arr.indexOf(name) === i);
    // Merge Social Media CM + Google CM into mediaBuyers
    const mediaBuyers = [
      ...resolveAll(f.fldnEGrKUWFEIA8Gy),
      ...resolveAll(f.fldMirANV1q7bPNia),
    ].filter((name, i, arr) => arr.indexOf(name) === i);
    return {
      brand: f.fldkinqnN4Kx4xqDR || "(unnamed)",
      services,
      baseId: f.fldfbAz1wkEqAbs0h,
      csm: resolveAll(f.fldzE0lGtepDKZgj4)[0] || null,
      creativeStrategists: csList,
      designers: resolveAll(f.fldQ2PtIYZUfb8tlT),
      videoEditors: resolveAll(f.fldJvh3fIkKqOHKu6),
      mediaBuyers: mediaBuyers,
    };
  }).filter((c) => c.baseId && c.baseId.startsWith("app"));

  // Fan out multi-base groups: one Airtable client record → multiple virtual sub-clients,
  // one per base. Each sub-client inherits all team assignments from the parent record.
  // groupId is set explicitly so grouping works without relying on brand-name prefix matching.
  const expanded = [];
  for (const c of mapped) {
    const group = MULTI_BASE_GROUPS[c.baseId];
    if (group && group.length > 1) {
      const groupId = "grp-" + c.baseId;
      const groupLabel = (c.brand || "").trim();
      for (const sub of group) {
        expanded.push({
          ...c,
          brand: c.brand + sub.suffix,
          baseId: sub.baseId,
          groupId,
          groupLabel,
        });
      }
    } else {
      expanded.push(c);
    }
  }
  return { clients: expanded, teamMap };
}

// Full active-client roster (no Creative Base ID requirement) — used by the
// /active-clients coverage page so a client missing its base link (the Santa Mood
// bug: Active=true but Creative Base ID empty) shows up as a flagged gap instead
// of silently disappearing from every other endpoint.
const PIPELINE_ROSTER_FIELDS = [...PIPELINE_CLIENT_FIELDS, "fld92vjpDt9h9WFLh"]; // + On Hold / Closing

async function fetchAllActiveClientsRoster(env) {
  const [teamMap, records] = await Promise.all([
    fetchTeamMap(env.AIRTABLE_PAT),
    fetchAllRecords(PIPELINE_BASE_ID, PIPELINE_CLIENTS_TBL, PIPELINE_ROSTER_FIELDS, env.AIRTABLE_PAT,
      "{Active}=TRUE()"),
  ]);
  return records.map((r) => {
    const f = r.fields;
    const resolveOne = (entry) => {
      if (typeof entry === "string") {
        const t = teamMap[entry];
        return t ? (t.name || entry) : entry;
      }
      if (entry && entry.name) return entry.name;
      return null;
    };
    const resolveAll = (linkArr) => {
      if (!Array.isArray(linkArr)) return [];
      return linkArr.map(resolveOne).filter(Boolean);
    };
    const csList = [
      ...resolveAll(f.flddzaoCDc8h6axdz),
      ...resolveAll(f.fldIeq1h6b2LOS9yj),
    ].filter((name, i, arr) => arr.indexOf(name) === i);
    const mediaBuyers = [
      ...resolveAll(f.fldnEGrKUWFEIA8Gy),
      ...resolveAll(f.fldMirANV1q7bPNia),
    ].filter((name, i, arr) => arr.indexOf(name) === i);
    return {
      brand: f.fldkinqnN4Kx4xqDR || "(unnamed)",
      baseId: f.fldfbAz1wkEqAbs0h || null,
      onHold: !!f.fld92vjpDt9h9WFLh,
      creativeStrategists: csList,
      mediaBuyers: mediaBuyers,
    };
  });
}

// Hardcoded structures (one-time discovery via list_tables_for_base) — eliminates
// per-request /meta calls so we stay under Cloudflare's 50 subrequests/invocation limit.
// "newer" = unified "Creative Sheet (Internal & Interface)" table with Internal + Client Status
// "older" = split "(Internal) Creative Design" (team workflow) + "Creative Sheet" (client approval)
const BASE_STRUCTURES = {
  // Newer (unified)
  "appc2MwssYa6S5ggD": { structure: "newer", tableIds: ["tblhU5yVNhVDwykUt"] }, // Mindra
  "appfLnp5PNKDNqPUf": { structure: "newer", tableIds: ["tblhU5yVNhVDwykUt"] }, // 3am Latte
  "appofKdssYyS9iBaS": { structure: "newer", tableIds: ["tblhU5yVNhVDwykUt"] }, // Clean Green
  "app6TWeAtCBq53Jip": { structure: "newer", tableIds: ["tblhU5yVNhVDwykUt"] }, // Oh Sheet
  "app1fEGMI5uHhjCcu": { structure: "newer", tableIds: ["tblhU5yVNhVDwykUt"] }, // Pongfinity
  "app1gTPkgdENaOvax": { structure: "newer", tableIds: ["tblhU5yVNhVDwykUt"] }, // MacKinnon Watches
  "apptTtMw1Y9iCdLaF": { structure: "older", tableIds: ["tblhU5yVNhVDwykUt", "tblGC0TxnHI7lKaNQ"] }, // Subsoccer (corrected — has older schema)
  "appllDG4OmkK2Hdnn": { structure: "newer", tableIds: ["tblhU5yVNhVDwykUt"] }, // Gratsi
  "appeg00FJoTw4XETo": { structure: "newer", tableIds: ["tblhU5yVNhVDwykUt"] }, // LetterSchool
  "appGKEHmFtoWmxZQy": { structure: "newer", tableIds: ["tblhU5yVNhVDwykUt"] }, // The Sample Select
  "app1E0TJdfqpzWtRN": { structure: "newer", tableIds: ["tblhU5yVNhVDwykUt"] }, // Panther In The Room - PalmEase
  "appDEAC0DoBSOiEyH": { structure: "newer", tableIds: ["tblhU5yVNhVDwykUt"] }, // Niagara Sleep Solution
  "appFNyicr82i2ROQw": { structure: "newer", tableIds: ["tblhU5yVNhVDwykUt"] }, // SOS Performance Gear
  "app2gFVJaiGTgLtiM": { structure: "older", tableIds: ["tblhU5yVNhVDwykUt", "tblGC0TxnHI7lKaNQ"] }, // Mattress Central (corrected — has older schema)
  "appHtn9N8Si2C4peK": { structure: "newer", tableIds: ["tblhU5yVNhVDwykUt"] }, // Zmedskin
  "applQdA4FOBWqEHcS": { structure: "newer", tableIds: ["tblhU5yVNhVDwykUt"] }, // Shadana Yoga
  "appVSXwwoYt0jF8xi": { structure: "newer", tableIds: ["tblhU5yVNhVDwykUt"] }, // Kiln Frog
  "appjimE8RAjvCc1gF": { structure: "newer", tableIds: ["tblhU5yVNhVDwykUt"] }, // Santa Mood — Creative Base ID was empty on the Clients record, excluding it from the active-clients query entirely; linked base found and structure verified 2026-08-03
  "appWhSYilpyREuhaL": { structure: "newer", tableIds: ["tblhU5yVNhVDwykUt"] }, // Bellalab — same missing-Creative-Base-ID gap as Santa Mood, found + linked 2026-08-04
  "appG4TkT8hvhv700X": { structure: "newer", tableIds: ["tblhU5yVNhVDwykUt"] }, // Pablo Quintanilla — same missing-Creative-Base-ID gap as Santa Mood, found + linked 2026-08-04
  "appn1XCgInQ4Iqqrv": { structure: "newer", tableIds: ["tblhU5yVNhVDwykUt"] }, // Shiny Smile (Invisawear) — base is named "Shiny Smile Veneers" (website matches: shinysmileveneers.com), same missing-Creative-Base-ID gap, found + linked 2026-08-04
  "appHSy3UVlswU9Msi": { structure: "newer", tableIds: ["tblPGhr8PMjfbhYxB"] }, // TAS Digital Ads — TAS's own internal ads base (table is named "(Internal & External) Creative Design" but has the same Internal/Client Status fields); replaces the old link to the Social Media content-calendar base, which had no matching table structure, per Talal 2026-08-04
  "appZDc1R13SjqNa1Y": { structure: "newer", tableIds: ["tblhU5yVNhVDwykUt"] }, // NuttyHero Inc. — same missing-Creative-Base-ID gap as Santa Mood/Bellalab, found + linked 2026-08-04
  // Older (split) — order: [internal, sheet]
  "appcjs5nWjghBiJp4": { structure: "older", tableIds: ["tblk7btBQK70SqVun", "tblJP6OdqaUuHCLnK"] }, // Ergonomist
  "appPhQV5SSIn4gqxe": { structure: "older", tableIds: ["tblhU5yVNhVDwykUt", "tblGC0TxnHI7lKaNQ"] }, // Le Pratique du Motard
  "appayUDNwZ9CR0o9m": { structure: "older", tableIds: ["tbltzKSl3uN415bJq", "tblShFdXDUAyQh1CN"] }, // FIXD
  "apph5ye18T3GP1JPX": { structure: "older", tableIds: ["tbltzKSl3uN415bJq", "tblShFdXDUAyQh1CN"] }, // Fixd (M)
  "apprNKez5QYeVy4J7": { structure: "older", tableIds: ["tbltzKSl3uN415bJq", "tblShFdXDUAyQh1CN"] }, // Fixd (LF)
  "appgn2YTL9VT3IAck": { structure: "older", tableIds: ["tblobLm7FAMCkQMhD", "tblNTGHJf0z692Ca0"] }, // QGS — same stale-table-ID bug as Comfylabs; old IDs no longer exist in this base
  "appiNNpOvxcRfbZDw": { structure: "newer", tableIds: ["tblhU5yVNhVDwykUt"] }, // Comfylabs — base was migrated to the unified Creative Sheet (Internal & Interface) table; old split tables no longer exist, causing this client to silently return 0 items
  "app6YjwC8LdIMquAl": { structure: "newer", tableIds: ["tblhU5yVNhVDwykUt"] }, // Cabin K9 — same stale-structure bug as Comfylabs/QGS: base has the unified table now, old "older" mapping caused Airtable API 422s (no Status field on the unified table)
};

// Detect base structure: hardcoded map first, fallback to live /meta call only if unknown.
async function detectBaseStructure(baseId, pat) {
  const cached = BASE_STRUCTURES[baseId];
  if (cached) return cached;
  const res = await fetch(`https://api.airtable.com/v0/meta/bases/${baseId}/tables`, {
    headers: { Authorization: `Bearer ${pat}` },
  });
  if (!res.ok) return null;
  const data = await res.json();
  const tables = data.tables || [];
  const unified = tables.find((t) => t.name === "Creative Sheet (Internal & Interface)" || t.name === "Creative Design (Internal & Interface)");
  if (unified) return { structure: "newer", tableIds: [unified.id] };
  const olderInternal = tables.find((t) => t.name === "(Internal) Creative Design");
  const olderSheet = tables.find((t) => t.name === "Creative Sheet");
  if (olderInternal) {
    const tableIds = [olderInternal.id];
    if (olderSheet) tableIds.push(olderSheet.id);
    return { structure: "older", tableIds };
  }
  return null;
}

// Some clients don't have their own Airtable base — their creative lives inside another
// client's base, tagged via the "(Internal) Product" linked-record field. Keyed by
// baseId -> { brand: { mode: "include"|"exclude", match: substring to test against the
// linked (Internal) Product record names } }. Kiln Academy shares Kiln Frog's base this
// way (same website, same team) — per Talal 2026-08-04.
const SHARED_BASE_PRODUCT_FILTERS = {
  "appVSXwwoYt0jF8xi": {
    "Kiln Academy": { mode: "include", match: "Kiln Academy" },
    "Kiln Frog": { mode: "exclude", match: "Kiln Academy" },
  },
};

function productFilterFormula(brand, baseId) {
  const cfg = SHARED_BASE_PRODUCT_FILTERS[baseId] && SHARED_BASE_PRODUCT_FILTERS[baseId][brand];
  if (!cfg) return null;
  const cond = `FIND("${cfg.match}", ARRAYJOIN({(Internal) Product})) > 0`;
  return cfg.mode === "exclude" ? `NOT(${cond})` : cond;
}

async function fetchTableRecords(baseId, tableId, pat, filterFormula = null) {
  // Single request per table — pagination is too expensive under Cloudflare's 50
  // subrequest budget. Server-side filter narrows results so 100 matches typically
  // contain everything we need (Launched/empty items dropped).
  const url = new URL(`https://api.airtable.com/v0/${baseId}/${tableId}`);
  url.searchParams.set("pageSize", "100");
  if (filterFormula) url.searchParams.set("filterByFormula", filterFormula);
  const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${pat}` } });
  if (!res.ok) throw new Error(`API ${res.status}`);
  const data = await res.json();
  return data.records || [];
}

function projectItem(r, sourceLabel, tableId) {
  const f = r.fields;
  // Schema-agnostic status detection (handles mislabeled bases too):
  // Prefer NEWER fields if present. Else fall back to plain "Status",
  // routing to internal or client based on sourceLabel.
  let internal = null;
  let clientStatus = null;
  if ("Internal Status" in f || "Client Status" in f) {
    internal = f["Internal Status"] || null;
    clientStatus = f["Client Status"] || null;
  } else if ("Status" in f) {
    if (sourceLabel === "sheet") {
      clientStatus = f["Status"];
    } else {
      // "internal" or "unified" (newer base that turned out to lack split fields)
      internal = f["Status"];
    }
  }
  let batch = f["Batch"] || f["Batch (from Concepts)"] || null;
  if (Array.isArray(batch)) batch = batch[0] || null;
  const assignee = f["Assignee"];
  let assigneeName = null;
  if (assignee) {
    if (typeof assignee === "object") assigneeName = assignee.name || assignee.email || null;
    else assigneeName = String(assignee);
  }
  return {
    id: r.id,
    tableId,
    name: f["Name"] || f["Name + Angle + Offer"] || "(unnamed)",
    internalStatus: internal,
    clientStatus,
    batch,
    priority: f["Priority"] || null,
    lastModified: f["Last Modified"] || r._lastModifiedTime || null,
    created: f["Created"] || r._createdTime || null,
    assignee: assigneeName,
    type: (() => {
      let t = f["Type"];
      if (Array.isArray(t)) t = t[0] || null;
      if (t && typeof t === "object" && t.name) t = t.name;
      return t || null;
    })(),
    source: sourceLabel,
  };
}

// === Concepts & UGC ===
// Concepts table is tblRlcp1ibmS7U7HG in all bases.
// UGC table is tblRsVqiqUaZRcQYd in all bases.
const CONCEPTS_TBL = "tblRlcp1ibmS7U7HG";
const UGC_TBL = "tblRsVqiqUaZRcQYd";

// Priority Signals: daily-scanned Slack + Fathom signals about creative
// prioritization requests / creative issues / creative PM notes. Populated by a
// scheduled background job (an n8n workflow, not this worker) — this just reads +
// displays them, and lets someone tick "Reviewed" from the dashboard.
const PRIORITY_SIGNALS_TBL = "tblyBJ7dPBRR6ysbE";

function projectSignal(r) {
  const f = r.fields;
  return {
    id: r.id,
    summary: f["Summary"] || "",
    date: f["Date"] || null,
    source: f["Source"] || null,
    signalType: f["Signal Type"] || null,
    whoSaidIt: f["Who Said It"] || null,
    regarding: f["Said To / Regarding"] || null,
    client: f["Client / Brand"] || null,
    quote: f["Quote"] || null,
    sourceLink: f["Source Link"] || null,
    reviewed: !!f["Reviewed"],
  };
}

async function handlePrioritySignals(request, env) {
  if (!env.AIRTABLE_PAT) {
    return new Response(JSON.stringify({ error: "AIRTABLE_PAT not set" }),
      { status: 500, headers: { "Content-Type": "application/json" } });
  }
  const url = new URL(request.url);
  const force = url.searchParams.get("refresh") === "1";
  const cacheKey = new Request(url.toString(), { method: "GET" });
  const cache = caches.default;
  if (!force) {
    const hit = await cache.match(cacheKey);
    if (hit) return hit;
  }
  try {
    const records = await fetchTableRecords(PIPELINE_BASE_ID, PRIORITY_SIGNALS_TBL, env.AIRTABLE_PAT);
    const signals = records.map(projectSignal).sort((a, b) => {
      const da = a.date ? new Date(a.date).getTime() : 0;
      const db = b.date ? new Date(b.date).getTime() : 0;
      return db - da;
    });
    const payload = {
      generatedAt: new Date().toISOString(),
      count: signals.length,
      signals,
    };
    const response = new Response(JSON.stringify(payload), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=60",
        "Access-Control-Allow-Origin": "*",
      },
    });
    await cache.put(cacheKey, response.clone());
    return response;
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e.message || e) }),
      { status: 502, headers: { "Content-Type": "application/json" } });
  }
}

// POST /priority-signals/api/review  { id, reviewed }
// Lets the dashboard tick a signal off as reviewed/handled without leaving the page.
async function handleMarkSignalReviewed(request, env) {
  if (!env.AIRTABLE_PAT) {
    return new Response(JSON.stringify({ error: "AIRTABLE_PAT not set" }),
      { status: 500, headers: { "Content-Type": "application/json" } });
  }
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "POST only" }),
      { status: 405, headers: { "Content-Type": "application/json" } });
  }
  try {
    const body = await request.json();
    const id = body && body.id;
    if (!id) {
      return new Response(JSON.stringify({ error: "missing id" }),
        { status: 400, headers: { "Content-Type": "application/json" } });
    }
    const res = await fetch(`https://api.airtable.com/v0/${PIPELINE_BASE_ID}/${PRIORITY_SIGNALS_TBL}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${env.AIRTABLE_PAT}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ records: [{ id, fields: { "Reviewed": !!body.reviewed } }] }),
    });
    if (!res.ok) {
      const text = await res.text();
      return new Response(JSON.stringify({ error: `Airtable ${res.status}: ${text.slice(0, 200)}` }),
        { status: 502, headers: { "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify({ ok: true }),
      { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e.message || e) }),
      { status: 502, headers: { "Content-Type": "application/json" } });
  }
}

// GET /active-clients/api — full active-client roster cross-checked against the
// creative pipeline: which clients have a Creative Base ID linked, whether their
// base actually resolves (structure detection succeeds), and live pending-item
// counts. Split into Creative + Ads vs Creative Only based on whether a media
// buyer (Social Media CM / Google CM) is assigned. Flags clients with a team
// assigned but no linked base — the same gap that hid Santa Mood from every
// other page on this dashboard.
async function handleActiveClients(request, env) {
  if (!env.AIRTABLE_PAT) {
    return new Response(JSON.stringify({ error: "AIRTABLE_PAT not set" }),
      { status: 500, headers: { "Content-Type": "application/json" } });
  }
  const url = new URL(request.url);
  const force = url.searchParams.get("refresh") === "1";
  const cacheKey = new Request(url.toString(), { method: "GET" });
  const cache = caches.default;
  if (!force) {
    const hit = await cache.match(cacheKey);
    if (hit) return hit;
  }
  try {
    const roster = await fetchAllActiveClientsRoster(env);
    const withBase = roster.filter((c) => c.baseId);
    const liveResults = await Promise.all(
      withBase.map((c) => fetchPendingItemsForClient(c, env.AIRTABLE_PAT))
    );
    const liveByBrand = {};
    liveResults.forEach((r) => { liveByBrand[r.brand] = r; });

    const clients = roster.map((c) => {
      const adsManaged = Array.isArray(c.mediaBuyers) && c.mediaBuyers.length > 0;
      const hasTeam = adsManaged || (Array.isArray(c.creativeStrategists) && c.creativeStrategists.length > 0);
      const live = c.baseId ? liveByBrand[c.brand] : null;
      return {
        brand: c.brand,
        baseId: c.baseId,
        hasBase: !!c.baseId,
        onHold: c.onHold,
        adsManaged,
        creativeStrategists: c.creativeStrategists || [],
        mediaBuyers: c.mediaBuyers || [],
        pendingCount: live && !live.error ? live.items.length : null,
        adsToLaunchCount: live && !live.error ? (live.adsToLaunch || []).length : null,
        error: c.baseId ? (live ? live.error || null : null) : "No Creative Base ID linked",
        needsAttention: !c.baseId && hasTeam,
      };
    });

    // Only show clients relevant to creative strategy or ads. A client with no media
    // buyer and no Creative Strategist isn't tracked by this pipeline at all (e.g.
    // email-marketing-only clients) — per Talal 2026-08-04, don't show them here.
    const relevant = clients.filter((c) => c.adsManaged || c.creativeStrategists.length > 0);

    relevant.sort((a, b) => {
      if (a.needsAttention !== b.needsAttention) return a.needsAttention ? -1 : 1;
      return a.brand.localeCompare(b.brand);
    });

    const payload = {
      generatedAt: new Date().toISOString(),
      total: relevant.length,
      needsAttentionCount: relevant.filter((c) => c.needsAttention).length,
      clients: relevant,
    };
    const response = new Response(JSON.stringify(payload), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=60",
        "Access-Control-Allow-Origin": "*",
      },
    });
    await cache.put(cacheKey, response.clone());
    return response;
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e.message || e) }),
      { status: 502, headers: { "Content-Type": "application/json" } });
  }
}

function projectConcept(r) {
  const f = r.fields;
  const status = f["Approval Status"] || f["Status"] || null;
  return {
    id: r.id,
    tableId: CONCEPTS_TBL,
    name: f["Name"] || "(unnamed concept)",
    status,
    productionStatus: f["Production Status"] || null,
    batch: Array.isArray(f["Batch"]) ? f["Batch"][0] : (f["Batch"] || null),
    lastModified: f["Last Modified"] || r._lastModifiedTime || null,
    created: f["Created"] || r._createdTime || null,
  };
}

function isConceptPendingClient(item) {
  const s = (item.status || "").toLowerCase();
  if (!s) return false;
  // Skip terminal client-approval states
  if (s.includes("approved")) return false;
  return true;
}

function projectUgc(r) {
  const f = r.fields;
  const clientStatus = f["Creator Approval by Client"] || f["Status"] || null;
  return {
    id: r.id,
    tableId: UGC_TBL,
    name: f["Creator name (Filled by UGC Manager)"] || f["Creator name"] || "(unnamed creator)",
    status: clientStatus,
    internalStatus: f["Internal Creator's Status"] || null,
    platform: f["Platform"] || null,
    lastModified: f["Last Modified"] || r._lastModifiedTime || null,
    created: f["Date of Management"] || r._createdTime || null,
  };
}

function isUgcPendingClient(item) {
  // Only include creators whose status explicitly says they're awaiting client approval.
  // Excludes everything else — including in-progress states like "Do Shipment",
  // "Videos Delivered", "Approved", "Denied", etc.
  const s = (item.status || "").toLowerCase().trim();
  if (!s) return false;
  return s.includes("pending") || s.includes("awaiting approval") || s.includes("for approval");
}

async function fetchClientDetail(baseId, pat) {
  // Returns { items, concepts, ugc, errors[] }
  const errors = [];
  const meta = BASE_STRUCTURES[baseId];
  const tasks = [];

  // Creative items (existing logic, hardcoded)
  if (meta) {
    meta.tableIds.forEach((tableId, idx) => {
      const sourceLabel = meta.structure === "newer" ? "unified" : (idx === 0 ? "internal" : "sheet");
      tasks.push(
        fetchTableRecords(baseId, tableId, pat)
          .then((records) => records.map((r) => projectItem(r, sourceLabel, tableId)))
          .catch((e) => { errors.push("items: " + e.message); return []; })
      );
    });
  } else {
    tasks.push(Promise.resolve([]));
  }

  // Concepts
  tasks.push(
    fetchTableRecords(baseId, CONCEPTS_TBL, pat)
      .then((records) => records.map(projectConcept))
      .catch((e) => { errors.push("concepts: " + e.message); return []; })
  );

  // UGC
  tasks.push(
    fetchTableRecords(baseId, UGC_TBL, pat)
      .then((records) => records.map(projectUgc))
      .catch((e) => { errors.push("ugc: " + e.message); return []; })
  );

  const results = await Promise.all(tasks);
  const creativeGroups = results.slice(0, meta ? meta.tableIds.length : 1);
  const conceptsRaw = results[results.length - 2];
  const ugcRaw = results[results.length - 1];

  const items = creativeGroups.flat().filter(isPending);
  const concepts = conceptsRaw.filter(isConceptPendingClient);
  const ugc = ugcRaw.filter(isUgcPendingClient);

  return { items, concepts, ugc, errors };
}

// Aggregate light fetchers (one request per base, counts only)
async function fetchAllConceptsLight(env) {
  const { clients } = await fetchActiveClientsWithBase(env);
  const results = await Promise.all(clients.map(async (c) => {
    try {
      const records = await fetchTableRecords(c.baseId, CONCEPTS_TBL, env.AIRTABLE_PAT);
      const pending = records.map(projectConcept).filter(isConceptPendingClient);
      return { baseId: c.baseId, brand: c.brand, count: pending.length };
    } catch (e) {
      return { baseId: c.baseId, brand: c.brand, count: 0, error: e.message };
    }
  }));
  return results;
}

async function fetchAllUgcLight(env) {
  const { clients } = await fetchActiveClientsWithBase(env);
  const results = await Promise.all(clients.map(async (c) => {
    try {
      const records = await fetchTableRecords(c.baseId, UGC_TBL, env.AIRTABLE_PAT);
      const pending = records.map(projectUgc).filter(isUgcPendingClient);
      return { baseId: c.baseId, brand: c.brand, count: pending.length };
    } catch (e) {
      return { baseId: c.baseId, brand: c.brand, count: 0, error: e.message };
    }
  }));
  return results;
}

async function handleConceptsAggregate(request, env) {
  if (!env.AIRTABLE_PAT) {
    return new Response(JSON.stringify({ error: "AIRTABLE_PAT not set" }),
      { status: 500, headers: { "Content-Type": "application/json" } });
  }
  const url = new URL(request.url);
  const force = url.searchParams.get("refresh") === "1";
  const cacheKey = new Request(url.toString(), { method: "GET" });
  const cache = caches.default;
  if (!force) {
    const hit = await cache.match(cacheKey);
    if (hit) return hit;
  }
  try {
    const data = await fetchAllConceptsLight(env);
    const response = new Response(JSON.stringify({ generatedAt: new Date().toISOString(), clients: data }), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=600",
        "Access-Control-Allow-Origin": "*",
      },
    });
    await cache.put(cacheKey, response.clone());
    return response;
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e.message || e) }),
      { status: 502, headers: { "Content-Type": "application/json" } });
  }
}

async function handleUgcAggregate(request, env) {
  if (!env.AIRTABLE_PAT) {
    return new Response(JSON.stringify({ error: "AIRTABLE_PAT not set" }),
      { status: 500, headers: { "Content-Type": "application/json" } });
  }
  const url = new URL(request.url);
  const force = url.searchParams.get("refresh") === "1";
  const cacheKey = new Request(url.toString(), { method: "GET" });
  const cache = caches.default;
  if (!force) {
    const hit = await cache.match(cacheKey);
    if (hit) return hit;
  }
  try {
    const data = await fetchAllUgcLight(env);
    const response = new Response(JSON.stringify({ generatedAt: new Date().toISOString(), clients: data }), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=600",
        "Access-Control-Allow-Origin": "*",
      },
    });
    await cache.put(cacheKey, response.clone());
    return response;
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e.message || e) }),
      { status: 502, headers: { "Content-Type": "application/json" } });
  }
}

async function handleClientDetail(request, env) {
  if (!env.AIRTABLE_PAT) {
    return new Response(JSON.stringify({ error: "AIRTABLE_PAT not set" }),
      { status: 500, headers: { "Content-Type": "application/json" } });
  }
  const url = new URL(request.url);
  const baseId = url.searchParams.get("baseId");
  if (!baseId || !baseId.startsWith("app")) {
    return new Response(JSON.stringify({ error: "missing baseId" }),
      { status: 400, headers: { "Content-Type": "application/json" } });
  }
  const force = url.searchParams.get("refresh") === "1";
  const cacheKey = new Request(url.toString(), { method: "GET" });
  const cache = caches.default;
  if (!force) {
    const hit = await cache.match(cacheKey);
    if (hit) return hit;
  }
  try {
    const detail = await fetchClientDetail(baseId, env.AIRTABLE_PAT);
    const response = new Response(JSON.stringify({ generatedAt: new Date().toISOString(), ...detail }), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=600",
        "Access-Control-Allow-Origin": "*",
      },
    });
    await cache.put(cacheKey, response.clone());
    return response;
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e.message || e) }),
      { status: 502, headers: { "Content-Type": "application/json" } });
  }
}

function isPending(item) {
  const internal = (item.internalStatus || "");
  const client = (item.clientStatus || "");
  if (!internal && !client) return false;
  // An item is DONE if every status set is terminal.
  const internalDone = !internal || internal === "Approved" || internal === "Launched";
  const clientDone = !client || client === "Approved" || client === "Launched";
  return !(internalDone && clientDone);
}

// === Ads to Launch: client approved (or pending launch) but not yet Launched ===
function isAdToLaunch(item) {
  const internal = (item.internalStatus || "").toLowerCase().trim();
  const client = (item.clientStatus || "").toLowerCase().trim();
  // Client must have approved
  const clientApproved = client === "approved" || client.includes("approved");
  if (!clientApproved) return false;
  // Internal hasn't shipped it yet
  const launchedInternal = internal.includes("launched") || internal.includes("live");
  const launchedClient = client.includes("launched") || client.includes("live");
  if (launchedInternal || launchedClient) return false;
  return true;
}

async function fetchPendingItemsForClient(client, pat) {
  try {
    const meta = await detectBaseStructure(client.baseId, pat);
    if (!meta) {
      return {
        brand: client.brand,
        baseId: client.baseId,
        csm: client.csm,
        creativeStrategists: client.creativeStrategists || [],
        designers: client.designers || [],
        videoEditors: client.videoEditors || [],
        items: [],
        error: "No standard creative table found",
      };
    }

    // Newer: one table. Older: two tables (internal + sheet).
    // Per-structure server-side filter (kept under 50 subrequest budget).
    const fetches = meta.tableIds.map((tableId, idx) => {
      const sourceLabel = meta.structure === "newer"
        ? "unified"
        : (idx === 0 ? "internal" : "sheet");
      let filterFormula = null;
      if (meta.structure === "newer") {
        filterFormula = "NOT(AND({Internal Status} = 'Launched', {Client Status} = 'Launched'))";
        const productCond = productFilterFormula(client.brand, client.baseId);
        if (productCond) {
          filterFormula = `AND(${filterFormula}, ${productCond})`;
        }
      } else {
        filterFormula = "AND({Status} != BLANK(), {Status} != 'Launched')";
      }
      return fetchTableRecords(client.baseId, tableId, pat, filterFormula).then((records) =>
        records.map((r) => projectItem(r, sourceLabel, tableId))
      );
    });

    const groups = await Promise.all(fetches);
    const allItems = groups.flat();
    const pending = allItems.filter(isPending);
    // Ads to Launch only applies to clients whose ads WE manage (a media buyer is
    // assigned). Self-launching clients (e.g. Pongfinity, Clean Green) don't update
    // statuses reliably — showing their launch queue just confuses CSMs/strategists.
    const adsManaged = Array.isArray(client.mediaBuyers) && client.mediaBuyers.length > 0;
    const adsToLaunch = adsManaged ? allItems.filter(isAdToLaunch) : [];

    return {
      brand: client.brand,
      baseId: client.baseId,
      groupId: client.groupId || null,
      groupLabel: client.groupLabel || null,
      csm: client.csm,
      creativeStrategists: client.creativeStrategists || [],
      designers: client.designers || [],
      videoEditors: client.videoEditors || [],
      mediaBuyers: client.mediaBuyers || [],
      adsManaged: adsManaged,
      structure: meta.structure,
      items: pending,
      adsToLaunch: adsToLaunch,
    };
  } catch (e) {
    return {
      brand: client.brand,
      baseId: client.baseId,
      groupId: client.groupId || null,
      groupLabel: client.groupLabel || null,
      csm: client.csm,
      creativeStrategists: client.creativeStrategists || [],
      designers: client.designers || [],
      videoEditors: client.videoEditors || [],
      mediaBuyers: client.mediaBuyers || [],
      adsManaged: Array.isArray(client.mediaBuyers) && client.mediaBuyers.length > 0,
      items: [],
      adsToLaunch: [],
      error: String(e.message || e),
    };
  }
}

async function handlePipeline(request, env) {
  if (!env.AIRTABLE_PAT) {
    return new Response(JSON.stringify({ error: "AIRTABLE_PAT not set" }),
      { status: 500, headers: { "Content-Type": "application/json" } });
  }
  const url = new URL(request.url);
  const force = url.searchParams.get("refresh") === "1";
  const cacheKey = new Request(url.toString(), { method: "GET" });
  const cache = caches.default;
  if (!force) {
    const hit = await cache.match(cacheKey);
    if (hit) return hit;
  }
  try {
    const { clients, teamMap } = await fetchActiveClientsWithBase(env);
    const results = await Promise.all(clients.map((c) => fetchPendingItemsForClient(c, env.AIRTABLE_PAT)));
    results.sort((a, b) => (b.items?.length || 0) - (a.items?.length || 0));
    // Build teamStats keyed by name → { concepts, veConcepts, veVideos }
    const teamStats = {};
    for (const t of Object.values(teamMap)) {
      if (t && t.name) teamStats[t.name] = { concepts: t.concepts, veConcepts: t.veConcepts, veVideos: t.veVideos };
    }
    const payload = {
      generatedAt: new Date().toISOString(),
      clientCount: clients.length,
      clients: results,
      teamStats: teamStats,
    };
    const response = new Response(JSON.stringify(payload), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=600",
        "Access-Control-Allow-Origin": "*",
      },
    });
    await cache.put(cacheKey, response.clone());
    return response;
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e.message || e) }),
      { status: 502, headers: { "Content-Type": "application/json" } });
  }
}

// === Launch Digest: simplified "Ads to Launch" summary for a Growth Strategist ===
// GET /api/launch-digest?person=indransh
// Reuses the exact same client-matching logic and Ads-to-Launch filtering
// (isAdToLaunch / fetchPendingItemsForClient) as the pipeline dashboard, so counts here
// always agree with what the dashboard shows that person. Built for the daily n8n → Slack digest.
//
// NOTE: the dashboard's PEOPLE array + personMatches() live inside PIPELINE_HTML's client-side
// <script> (browser-only), not in this server scope, so they're duplicated here in minimal form
// for the growth-strategist role only. Keep in sync with PIPELINE_HTML's PEOPLE if that changes.
const GROWTH_STRATEGISTS = [
  { slug: "indransh", display: "Indransh", group: "growth_strategist", field: "mediaBuyers", match: ["indransh"] },
  { slug: "lucas",    display: "Lucas",    group: "growth_strategist", field: "mediaBuyers", match: ["lucas"] },
];

function growthStrategistMatches(client, personDef) {
  const value = client[personDef.field];
  if (!value) return false;
  const candidates = Array.isArray(value) ? value : [value];
  const nameMatches = candidates.some((name) =>
    personDef.match.some((m) => String(name).toLowerCase().includes(m))
  );
  if (!nameMatches) return false;
  // Growth Strategist: only match clients where we're doing creatives
  const csList = client.creativeStrategists || [];
  if (csList.length === 0) return false;
  return true;
}

function classifyItemFormat(item) {
  const t = String(item.type || "").toLowerCase().trim();
  if (t.includes("video")) return "video";
  if (t.includes("static") || t.includes("image") || t.includes("carousel") || t.includes("design")) return "static";
  return "other";
}

async function handleLaunchDigest(request, env) {
  if (!env.AIRTABLE_PAT) {
    return new Response(JSON.stringify({ error: "AIRTABLE_PAT not set" }),
      { status: 500, headers: { "Content-Type": "application/json" } });
  }
  const url = new URL(request.url);
  const personSlug = (url.searchParams.get("person") || "").toLowerCase().trim();
  const personDef = GROWTH_STRATEGISTS.find((p) => p.slug === personSlug);
  if (!personDef) {
    return new Response(JSON.stringify({ error: "missing/unknown ?person= (e.g. ?person=indransh)" }),
      { status: 400, headers: { "Content-Type": "application/json" } });
  }
  const force = url.searchParams.get("refresh") === "1";
  const cacheKey = new Request(url.toString(), { method: "GET" });
  const cache = caches.default;
  if (!force) {
    const hit = await cache.match(cacheKey);
    if (hit) return hit;
  }
  try {
    const { clients } = await fetchActiveClientsWithBase(env);
    const matching = clients.filter((c) => growthStrategistMatches(c, personDef));
    const results = await Promise.all(matching.map((c) => fetchPendingItemsForClient(c, env.AIRTABLE_PAT)));

    const clientSummaries = [];
    const totals = { video: 0, static: 0, other: 0 };
    for (const r of results) {
      const items = r.adsToLaunch || [];
      if (items.length === 0) continue;
      const counts = { video: 0, static: 0, other: 0 };
      for (const item of items) counts[classifyItemFormat(item)]++;
      totals.video += counts.video;
      totals.static += counts.static;
      totals.other += counts.other;
      clientSummaries.push({ brand: r.brand, ...counts, total: items.length });
    }
    clientSummaries.sort((a, b) => b.total - a.total);

    const payload = {
      generatedAt: new Date().toISOString(),
      person: personDef.display,
      totalClients: clientSummaries.length,
      totalCreatives: totals.video + totals.static + totals.other,
      totals,
      clients: clientSummaries,
    };
    const response = new Response(JSON.stringify(payload), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=600",
        "Access-Control-Allow-Origin": "*",
      },
    });
    await cache.put(cacheKey, response.clone());
    return response;
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e.message || e) }),
      { status: 502, headers: { "Content-Type": "application/json" } });
  }
}


const PIPELINE_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>TAS Digital — Creative Pipeline</title>
<style>
  :root {
    color-scheme: light;
    /* TAS Digital brand palette */
    --brand-blue: #2821B5;
    --brand-blue-soft: #D4D4ED;
    --brand-blue-light: #E1E0F9;
    --brand-blue-dark: #181839;
    --brand-purple: #8321C8;
    --brand-purple-soft: #E1C4F5;
    --brand-purple-light: #F0E1FA;
    --brand-sage: #66A396;
    --brand-sage-soft: #C6DDD8;
    --brand-sage-light: #ECF4F2;
    --brand-rose: #A63446;
    --brand-rose-soft: #EEC8CD;
    --brand-rose-light: #F6E3E6;
    --ink: #06060E;
    --ink-soft: #4A5263;
    --ink-faint: #8F8F8F;
    --line: #E3E3E3;
    --line-soft: #F1F1F1;
    --bg: #FAFAFA;
    --card: #FFFFFF;
    --shadow: 0 1px 3px rgba(6,6,14,.04), 0 4px 16px rgba(6,6,14,.05);
    --shadow-lg: 0 4px 12px rgba(40,33,181,.06), 0 12px 32px rgba(40,33,181,.08);
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: var(--bg); color: var(--ink);
    font-family: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", system-ui, sans-serif;
    font-size: 14px; line-height: 1.55; }
  .wrap { max-width: 980px; margin: 0 auto; padding: 28px 24px 60px; }

  /* === Top nav === */
  nav.topbar { display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 28px; padding-bottom: 16px; border-bottom: 1px solid var(--line); }
  .brand-mark { display: flex; align-items: center; gap: 10px;
    text-decoration: none; }
  .brand-mark .logo {
    height: 30px; width: auto; display: block; flex-shrink: 0;
    border: 0; outline: 0; padding: 0; margin: 0;
    vertical-align: middle; pointer-events: none;
  }
  .brand-mark .label { font-size: 11px; font-weight: 600; letter-spacing: .14em;
    text-transform: uppercase; color: var(--brand-blue); }
  .crumb { display: flex; gap: 8px; align-items: center; color: var(--ink-soft); font-size: 13px;
    margin-top: 4px; }
  .crumb a { color: var(--brand-blue); text-decoration: none; font-weight: 500; cursor: pointer; }
  .crumb a:hover { text-decoration: underline; }
  .crumb .sep { color: var(--ink-faint); }
  .topbar-right { display: flex; gap: 10px; align-items: center; }
  .topbar-right .ts { font-size: 11px; color: var(--ink-faint); font-variant-numeric: tabular-nums; }
  .side-link { font-size: 12px; font-weight: 600; color: var(--brand-blue); text-decoration: none; }
  .side-link:hover { text-decoration: underline; }
  button.refresh {
    background: var(--brand-blue); color: white; border: none;
    padding: 8px 14px; border-radius: 8px; font-size: 12px; font-weight: 600;
    cursor: pointer; transition: all .15s ease;
    letter-spacing: .02em;
  }
  button.refresh:hover { background: var(--brand-blue-dark); }
  button.refresh:disabled { opacity: 0.5; cursor: wait; }

  h1 { font-size: 24px; font-weight: 700; margin: 0 0 4px; letter-spacing: -.02em; color: var(--ink); }
  .sub { color: var(--ink-soft); font-size: 13px; margin-bottom: 26px; }

  /* === Landing: grouped cards === */
  .group-section { margin-bottom: 32px; }
  .group-header {
    font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .14em;
    color: var(--ink-faint); margin: 0 0 14px;
    padding-bottom: 8px; border-bottom: 1px solid var(--line);
  }
  .csm-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }
  @media (max-width: 600px) { .csm-grid { grid-template-columns: 1fr; } }
  .csm-card {
    background: var(--card); border: 1px solid var(--line); border-radius: 14px;
    padding: 22px; box-shadow: var(--shadow); cursor: pointer;
    transition: all .18s ease; position: relative; overflow: hidden;
  }
  .csm-card::before {
    content: ''; position: absolute; top: 0; left: 0; width: 4px; height: 100%;
    background: linear-gradient(180deg, var(--brand-blue) 0%, var(--brand-purple) 100%);
    opacity: 0; transition: opacity .18s ease;
  }
  .csm-card-cs::before {
    background: linear-gradient(180deg, var(--brand-purple) 0%, var(--brand-rose) 100%);
  }
  .csm-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-lg); }
  .csm-card:hover::before { opacity: 1; }
  .csm-card-cs .count-item .num { color: var(--brand-purple); }
  .csm-card .name { font-size: 19px; font-weight: 700; margin: 0 0 4px; color: var(--ink); letter-spacing: -.01em; }
  .csm-card .role { color: var(--ink-soft); font-size: 12px; margin-bottom: 16px;
    text-transform: uppercase; letter-spacing: .08em; font-weight: 500; }
  .csm-card .counts { display: flex; gap: 24px; align-items: baseline; }
  .csm-card .count-item { display: flex; align-items: baseline; gap: 5px; }
  .csm-card .count-item .num { font-size: 24px; font-weight: 700; line-height: 1; color: var(--brand-blue); }
  .csm-card .count-item .label { color: var(--ink-faint); font-size: 11px; text-transform: uppercase; letter-spacing: .06em; }
  .csm-card .count-item.urgent .num { color: var(--brand-rose); }

  /* 6-bucket breakdown grid on home cards */
  .csm-card .breakdown {
    display: grid; grid-template-columns: repeat(2, 1fr);
    gap: 8px 14px; margin-top: 4px;
  }
  .csm-card .breakdown .chip {
    display: flex; align-items: baseline; gap: 6px;
    font-size: 12px; color: var(--ink-soft);
  }
  .csm-card .breakdown .chip .icon { font-size: 13px; }
  .csm-card .breakdown .chip .n {
    font-weight: 700; font-size: 16px; color: var(--ink); font-variant-numeric: tabular-nums;
    min-width: 18px; text-align: right;
  }
  .csm-card .breakdown .chip.zero { opacity: 0.4; }
  .csm-card .breakdown .chip.concepts            .n { color: #B87600; }
  .csm-card .breakdown .chip.ugc                 .n { color: #4A5BA9; }
  .csm-card .breakdown .chip.video               .n { color: #2821B5; }
  .csm-card .breakdown .chip.design              .n { color: #8321C8; }
  .csm-card .breakdown .chip.awaiting_internal   .n { color: #0E9F70; }
  .csm-card .breakdown .chip.awaiting_client   .n { color: #0369A1; }
  .csm-card .breakdown .chip.internal_revisions  .n { color: #C97200; }
  .csm-card .breakdown .chip.client_revisions  .n { color: #A63446; }
  .csm-card .breakdown .chip.ads_to_launch     .n { color: #0891B2; }

  /* === CSM page === */
  .summary-strip {
    display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px;
    margin-bottom: 24px;
  }
  @media (max-width: 700px) { .summary-strip { grid-template-columns: repeat(2, 1fr); } }
  .summary-card {
    background: var(--card); border: 1px solid var(--line); border-radius: 10px;
    padding: 14px 16px; box-shadow: var(--shadow);
    border-top: 3px solid var(--ink-faint);
  }
  .summary-card .label { font-size: 11px; color: var(--ink-faint); text-transform: uppercase;
    letter-spacing: .06em; font-weight: 600; }
  .summary-card .value { font-size: 24px; font-weight: 700; margin-top: 4px; color: var(--ink); }
  .summary-card.bucket-design { border-top-color: var(--brand-purple); }
  .summary-card.bucket-design .label { color: var(--brand-purple); }
  .summary-card.bucket-video { border-top-color: var(--brand-blue); }
  .summary-card.bucket-video .label { color: var(--brand-blue); }
  .summary-card.bucket-awaiting { border-top-color: var(--brand-sage); }
  .summary-card.bucket-awaiting .label { color: var(--brand-sage); }
  .summary-card.bucket-revisions { border-top-color: var(--brand-rose); }
  .summary-card.bucket-revisions .label { color: var(--brand-rose); }
  .summary-card.bucket-concepts { border-top-color: #B87600; }
  .summary-card.bucket-concepts .label { color: #B87600; }
  .summary-card.bucket-ugc { border-top-color: #4A5BA9; }
  .summary-card.bucket-ugc .label { color: #4A5BA9; }
  .summary-card.bucket-awaiting_internal { border-top-color: #0E9F70; }
  .summary-card.bucket-awaiting_internal .label { color: #0E9F70; }
  .summary-card.bucket-awaiting_client { border-top-color: #0369A1; }
  .summary-card.bucket-awaiting_client .label { color: #0369A1; }
  .summary-card.bucket-internal_revisions { border-top-color: #C97200; }
  .summary-card.bucket-internal_revisions .label { color: #C97200; }
  .summary-card.bucket-client_revisions { border-top-color: #A63446; }
  .summary-card.bucket-client_revisions .label { color: #A63446; }
  .summary-card.bucket-ads_to_launch { border-top-color: #0891B2; }
  .summary-card.bucket-ads_to_launch .label { color: #0891B2; }
  .summary-card.bucket-sent_for_editing { border-top-color: #0369A1; }
  .summary-card.bucket-sent_for_editing .label { color: #0369A1; }
  .summary-card.bucket-in_progress { border-top-color: #2821B5; }
  .summary-card.bucket-in_progress .label { color: #2821B5; }
  .summary-card.bucket-needs_revisions { border-top-color: #C97200; }
  .summary-card.bucket-needs_revisions .label { color: #C97200; }
  .summary-card.bucket-awaiting_strategist { border-top-color: #0E9F70; }
  .summary-card.bucket-awaiting_strategist .label { color: #0E9F70; }
  .csm-card .breakdown .chip.sent_for_editing    .n { color: #0369A1; }
  .csm-card .breakdown .chip.in_progress         .n { color: #2821B5; }
  .csm-card .breakdown .chip.needs_revisions     .n { color: #C97200; }
  .csm-card .breakdown .chip.awaiting_strategist .n { color: #0E9F70; }
  .bucket-section.sent_for_editing h2 { color: #0369A1; }
  .bucket-section.sent_for_editing h2 .count { background: #0369A1; }
  .bucket-section.in_progress h2 { color: #2821B5; }
  .bucket-section.in_progress h2 .count { background: #2821B5; }
  .bucket-section.needs_revisions h2 { color: #C97200; }
  .bucket-section.needs_revisions h2 .count { background: #C97200; }
  .bucket-section.awaiting_strategist h2 { color: #0E9F70; }
  .bucket-section.awaiting_strategist h2 .count { background: #0E9F70; }

  /* Bucket section colors for client view */
  .bucket-section.video h2 { color: #2821B5; }
  .bucket-section.video h2 .count { background: #2821B5; }
  .bucket-section.design h2 { color: #8321C8; }
  .bucket-section.design h2 .count { background: #8321C8; }
  .bucket-section.awaiting_internal h2 { color: #0E9F70; }
  .bucket-section.awaiting_internal h2 .count { background: #0E9F70; }
  .bucket-section.awaiting_client h2 { color: #0369A1; }
  .bucket-section.awaiting_client h2 .count { background: #0369A1; }
  .bucket-section.internal_revisions h2 { color: #C97200; }
  .bucket-section.internal_revisions h2 .count { background: #C97200; }
  .bucket-section.client_revisions h2 { color: #A63446; }
  .bucket-section.client_revisions h2 .count { background: #A63446; }

  .section-heading {
    font-size: 11px; text-transform: uppercase; letter-spacing: .1em;
    color: var(--ink-faint); margin: 8px 0 12px; font-weight: 600;
  }
  .clients-list { display: flex; flex-direction: column; gap: 8px; }
  .client-row {
    background: var(--card); border: 1px solid var(--line); border-radius: 10px;
    padding: 14px 18px; box-shadow: var(--shadow); cursor: pointer;
    display: flex; justify-content: space-between; align-items: center;
    transition: all .15s ease;
  }
  .client-row:hover { border-color: var(--brand-blue); box-shadow: var(--shadow-lg); transform: translateX(2px); }
  .client-row .brand { font-size: 15px; font-weight: 600; color: var(--ink); }
  .client-row .brand-sub { font-size: 11px; color: var(--ink-faint); margin-top: 2px;
    text-transform: uppercase; letter-spacing: .04em; font-weight: 500; }
  .client-row .row-counts { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; justify-content: flex-end; max-width: 60%; }
  .client-row .pill-count {
    font-size: 12px; color: var(--ink-soft); font-variant-numeric: tabular-nums;
    display: flex; align-items: center; gap: 4px; font-weight: 500;
  }
  .client-row .pill-count.zero { opacity: .3; }
  .client-row .pill-count.urgent { color: var(--brand-rose); font-weight: 700; }
  .client-row .arrow { font-size: 18px; color: var(--ink-faint); margin-left: 6px; }
  .client-row.sub-row { background: var(--bg); }
  .client-row.sub-row .brand { color: var(--ink-soft); font-size: 14px; font-weight: 500; }
  .group-badge {
    display: inline-block; font-size: 10px; font-weight: 700; letter-spacing: .06em;
    text-transform: uppercase; color: var(--brand-blue); background: var(--brand-blue-light);
    padding: 2px 7px; border-radius: 999px; margin-left: 8px; vertical-align: middle;
  }
  .group-block {
    border: 2px solid var(--brand-blue-light); border-radius: 12px;
    overflow: hidden; margin-bottom: 8px;
    box-shadow: var(--shadow);
  }
  .group-block .client-row { border: none; border-radius: 0; margin-bottom: 0; box-shadow: none; }
  .group-block .client-row + .client-row { border-top: 1px solid var(--line); }
  .group-header-row {
    display: flex; align-items: center; justify-content: space-between;
    padding: 12px 16px; background: linear-gradient(135deg, var(--brand-blue-light) 0%, #ECEBFA 100%);
    border-bottom: 1px solid var(--brand-blue-soft);
  }
  .group-header-label { display: flex; align-items: center; gap: 0; }
  .group-name { font-size: 16px; font-weight: 800; color: var(--brand-blue); letter-spacing: .04em; }
  .group-total-pill {
    margin-left: 10px; font-size: 11px; font-weight: 700;
    background: var(--brand-blue); color: white; padding: 3px 10px; border-radius: 999px;
  }
  .group-totals .pill-count { opacity: 0.85; }
  .client-row.empty { opacity: .55; cursor: default; }
  .client-row.empty:hover { transform: none; border-color: var(--line); box-shadow: var(--shadow); }

  /* === Video Editors overview (homepage) === */
  .ve-overview { margin-top: 8px; }
  .ve-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 14px; }
  .ve-card {
    background: white; border: 1px solid var(--line); border-radius: 14px;
    padding: 16px 18px; box-shadow: var(--shadow); cursor: pointer;
    transition: transform .12s ease, border-color .12s ease;
  }
  .ve-card:hover { transform: translateY(-2px); border-color: var(--brand-blue-soft); }
  .ve-card .ve-name { font-size: 16px; font-weight: 800; margin-bottom: 12px; }
  .ve-stat { margin-bottom: 10px; }
  .ve-stat:last-child { margin-bottom: 0; }
  .ve-stat .ve-stat-top {
    display: flex; justify-content: space-between; align-items: baseline;
    font-size: 12px; margin-bottom: 4px;
  }
  .ve-stat .ve-stat-label { color: var(--ink-faint); font-weight: 600; text-transform: uppercase; letter-spacing: .05em; font-size: 10px; }
  .ve-stat .ve-stat-val { font-weight: 800; font-size: 15px; font-variant-numeric: tabular-nums; }
  .ve-bar { height: 6px; border-radius: 999px; background: var(--brand-blue-light); overflow: hidden; }
  .ve-bar > span { display: block; height: 100%; border-radius: 999px; }
  .ve-bar.clients > span { background: #0E9F70; }
  .ve-bar.concepts > span { background: var(--brand-purple, #8321C8); }
  .ve-bar.videos > span { background: var(--brand-blue); }

  /* === Client page === */
  .bucket-section { margin-bottom: 26px; }
  .bucket-section h2 {
    font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em;
    margin: 0 0 12px; display: flex; align-items: center; gap: 8px;
  }
  .bucket-section h2 .count {
    background: var(--ink); color: white; padding: 3px 10px; border-radius: 999px;
    font-size: 11px; font-weight: 600;
  }
  .bucket-section.design h2 { color: var(--brand-purple); }
  .bucket-section.design h2 .count { background: var(--brand-purple); }
  .bucket-section.video h2 { color: var(--brand-blue); }
  .bucket-section.video h2 .count { background: var(--brand-blue); }
  .bucket-section.awaiting h2 { color: var(--brand-sage); }
  .bucket-section.awaiting h2 .count { background: var(--brand-sage); }
  .bucket-section.revisions h2 { color: var(--brand-rose); }
  .bucket-section.revisions h2 .count { background: var(--brand-rose); }

  .items-grid {
    display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 10px;
  }
  .item-card {
    background: var(--card); border: 1px solid var(--line); border-radius: 10px;
    padding: 14px 16px; box-shadow: var(--shadow);
    display: flex; flex-direction: column; gap: 8px;
    min-width: 0;
  }
  .item-card .item-main { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; }
  .item-card .item-status { flex-direction: column; }
  .item-card .item-dates {
    display: flex; justify-content: space-between; align-items: center;
    font-size: 10px; color: var(--ink-faint); letter-spacing: .04em;
    text-transform: uppercase; font-weight: 500; padding-top: 4px;
    border-top: 1px dashed var(--line);
  }
  .item-card .item-dates .date-label { color: var(--ink-faint); }
  .item-card .item-dates .date-val { color: var(--ink-soft); font-variant-numeric: tabular-nums; }
  .item-card .item-dates .sent-date { background: var(--brand-blue-light); border-radius: 6px; padding: 2px 7px; }
  .item-card .item-dates .sent-date .date-label { color: var(--brand-blue); font-weight: 700; }
  .item-card .item-dates .sent-date .date-val { color: var(--brand-blue); font-weight: 700; }
  .cap-note { margin-top: 10px; font-size: 12px; color: var(--ink-faint); font-style: italic; }
  .concept-card, .ugc-card {
    background: var(--card); border: 1px solid var(--line); border-radius: 10px;
    padding: 14px 16px; box-shadow: var(--shadow);
    display: flex; flex-direction: column; gap: 6px;
  }
  .concept-card .name, .ugc-card .name {
    font-weight: 600; color: var(--ink); font-size: 14px;
  }
  .concept-card .meta, .ugc-card .meta {
    font-size: 11px; color: var(--ink-faint); text-transform: uppercase;
    letter-spacing: .04em; font-weight: 500;
  }
  .bucket-section.concepts h2 { color: #B87600; }
  .bucket-section.concepts h2 .count { background: #B87600; }
  .bucket-section.ugc h2 { color: #4A5BA9; }
  .bucket-section.ugc h2 .count { background: #4A5BA9; }
  .item-main { min-width: 0; }
  .item-name { font-weight: 600; color: var(--ink); font-size: 14px; }
  .item-meta { font-size: 11px; color: var(--ink-faint); margin-top: 2px;
    text-transform: uppercase; letter-spacing: .04em; font-weight: 500; }
  .item-status { display: flex; flex-direction: column; gap: 5px; min-width: 0; }
  .status-row { display: flex; align-items: center; gap: 8px; }
  .status-label {
    font-size: 9px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase;
    color: var(--ink-faint); min-width: 50px; text-align: right;
  }
  .status-label.int { color: var(--brand-blue); }
  .status-label.ext { color: var(--brand-rose); }

  .pill { display: inline-block; font-size: 11px; padding: 3px 9px; border-radius: 999px;
    font-weight: 600; white-space: nowrap; letter-spacing: .01em; }
  .pill.muted    { background: var(--line); color: var(--ink-soft); }
  .pill.purple   { background: var(--brand-purple-light); color: var(--brand-purple); }
  .pill.blue     { background: var(--brand-blue-light); color: var(--brand-blue); }
  .pill.sage     { background: var(--brand-sage-light); color: var(--brand-sage); }
  .pill.rose     { background: var(--brand-rose-light); color: var(--brand-rose); }
  .pill.good     { background: #DCEEDF; color: #2F7D3D; }

  .days { font-size: 12px; color: var(--ink-soft); font-variant-numeric: tabular-nums;
    text-align: right; min-width: 36px; }
  .days.urgent { color: var(--brand-rose); font-weight: 700; }
  .days.warn { color: #B8841A; font-weight: 600; }

  .empty-state {
    background: var(--card); border: 1px dashed var(--line); border-radius: 12px;
    padding: 40px; text-align: center; color: var(--ink-faint); font-size: 14px;
  }
  .empty-state .emoji { font-size: 32px; margin-bottom: 10px; display: block; }

  /* === Airtable links === */
  .airtable-link {
    display: inline-flex; align-items: center; gap: 6px;
    background: var(--brand-blue); color: white !important;
    padding: 7px 13px; border-radius: 8px;
    font-size: 12px; font-weight: 600; text-decoration: none;
    letter-spacing: .02em; transition: background .15s ease;
    margin-left: 12px; vertical-align: middle;
  }
  .airtable-link:hover { background: var(--brand-blue-dark); }
  .airtable-link .arrow { font-size: 11px; }
  .item-name a {
    color: var(--ink); text-decoration: none;
    border-bottom: 1px solid transparent; transition: border-color .12s ease;
  }
  .item-name a:hover { border-bottom-color: var(--brand-blue); color: var(--brand-blue); }

  .loading { text-align: center; padding: 80px 20px; color: var(--ink-faint); }
  .err { color: var(--brand-rose); padding: 14px 18px; background: var(--brand-rose-light);
    border-radius: 10px; margin-bottom: 14px; font-size: 13px; }

  footer { margin-top: 40px; padding-top: 18px; border-top: 1px solid var(--line);
    color: var(--ink-faint); font-size: 11px; text-align: center;
    text-transform: uppercase; letter-spacing: .08em; }
</style>
</head>
<body>
<div class="wrap">

  <nav class="topbar">
    <div>
      <div class="brand-mark">
        <svg class="logo" viewBox="0 0 470 100" xmlns="http://www.w3.org/2000/svg" aria-label="TAS Digital" role="img">
          <defs>
            <linearGradient id="tasG" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="#2821B5"/>
              <stop offset="100%" stop-color="#8321C8"/>
            </linearGradient>
          </defs>
          <g fill="none" stroke="url(#tasG)">
            <circle cx="50" cy="50" r="44" stroke-width="6"/>
            <circle cx="50" cy="50" r="30" stroke-width="5"/>
            <ellipse cx="50" cy="50" rx="12" ry="18" stroke-width="4"/>
          </g>
          <text x="120" y="65" font-family="-apple-system,BlinkMacSystemFont,'Inter','Segoe UI',system-ui,sans-serif" font-size="42" font-weight="300" letter-spacing="6" fill="url(#tasG)">TAS DIGITAL</text>
        </svg>
        <span class="label">· Creative Pipeline</span>
      </div>
      <div class="crumb" id="crumb">
        <a onclick="goHome()">Home</a>
      </div>
    </div>
    <div class="topbar-right">
      <a class="side-link" href="/active-clients">Active Clients</a>
      <a class="side-link" href="/priority-signals">Priority Signals</a>
      <span class="ts" id="ts">Loading…</span>
      <button class="refresh" id="refresh-btn" onclick="loadData(true)">↻ Refresh</button>
    </div>
  </nav>

  <div id="root"><div class="loading">Loading…</div></div>

  <footer>Live data · Each client's creative base · Refreshes at the edge every 10 min</footer>
</div>

<script>
let DATA = null;

// People who can check in.
// CSMs match against the single client.csm string.
// Strategists match against ANY name in client.creativeStrategists array (handles primary + backup + shared).
const PEOPLE = [
  // === Client Success Managers ===
  { slug: "victoria", display: "Victoria", role: "Advertising CSM",     group: "csm", field: "csm",                  match: ["victoria"] },
  { slug: "tamires",  display: "Tammy",    role: "Advertising CSM",     group: "csm", field: "csm",                  match: ["tamires", "tami"] },
  { slug: "patrick",  display: "Patrick",  role: "Email CSM",           group: "csm", field: "csm",                  match: ["patrick"] },
  // === Growth Strategist (media buyer for clients where we do creatives) ===
  { slug: "indransh", display: "Indransh", role: "Growth Strategist",   group: "growth_strategist", field: "mediaBuyers", match: ["indransh"], alwaysShow: false },
  { slug: "lucas",    display: "Lucas",    role: "Growth Strategist",   group: "growth_strategist", field: "mediaBuyers", match: ["lucas"],    alwaysShow: false },
  // === Creative Strategists ===
  { slug: "rajan",    display: "Rajan",    role: "Creative Strategist", group: "cs",  field: "creativeStrategists",  match: ["rajan"],   alwaysShow: false },
  { slug: "zainab",   display: "Zainab",   role: "Creative Strategist", group: "cs",  field: "creativeStrategists",  match: ["zainab"],  alwaysShow: false },
  { slug: "aziz",     display: "Aziz",     role: "Creative Strategist", group: "cs",  field: "creativeStrategists",  match: ["abdelaziz", "aziz"], alwaysShow: false },
  // === Video Editors === (matched via item.assignee)
  { slug: "muhammad-faiz", display: "Muhammad Faiz", role: "Video Editor", group: "video_editor", field: "videoEditors", match: ["faiz"],          alwaysShow: false },
  { slug: "med",           display: "Med",           role: "Video Editor", group: "video_editor", field: "videoEditors", match: ["med"],           alwaysShow: false },
  { slug: "feriel",        display: "Feriel",        role: "Video Editor", group: "video_editor", field: "videoEditors", match: ["feriel"],        alwaysShow: false },
  { slug: "nadish",        display: "Nadish",        role: "Video Editor", group: "video_editor", field: "videoEditors", match: ["nadish"],        alwaysShow: false },
  // === Designers === (matched via item.assignee)
  { slug: "nayyab",  display: "Nayyab", role: "Designer", group: "designer", field: "designers", match: ["nayyab"],  alwaysShow: false },
  { slug: "lana",    display: "Lana",   role: "Designer", group: "designer", field: "designers", match: ["lana"],    alwaysShow: false },
  { slug: "rahim",   display: "Rahim",  role: "Designer", group: "designer", field: "designers", match: ["rahim"],   alwaysShow: false },
];

const GROUP_LABELS = {
  csm: "Client Success Managers",
  cs:  "Creative Strategists",
  growth_strategist: "Growth Strategists",
  video_editor: "Video Editors",
  designer: "Designers",
};

function personMatches(client, personDef) {
  // All roles match against a client-level field that's either a string or array of names
  const value = client[personDef.field];
  if (!value) return false;
  const candidates = Array.isArray(value) ? value : [value];
  const nameMatches = candidates.some((name) =>
    personDef.match.some((m) => String(name).toLowerCase().includes(m))
  );
  if (!nameMatches) return false;
  // Growth Strategist: only match clients where we're doing creatives
  // (i.e. at least one Creative Strategist is assigned)
  if (personDef.group === "growth_strategist") {
    const csList = client.creativeStrategists || [];
    if (csList.length === 0) return false;
  }
  return true;
}

// Editors/designers use a custom 6-bucket model. Growth Strategist sees only ads_to_launch. Others use the 9-bucket default.
function bucketsForPerson(client, personDef) {
  if (personDef && (personDef.group === "video_editor" || personDef.group === "designer")) {
    return computeBucketsForRole(client, personDef);
  }
  if (personDef && personDef.group === "growth_strategist") {
    return { ads_to_launch: (client.adsToLaunch || []).length };
  }
  return computeBuckets(client);
}

// Growth Strategist sees ONLY ads-to-launch. Others see pending items + ads-to-launch for CSM.
function itemsForPerson(client, personDef) {
  const base = client.items || [];
  const launchTagged = (client.adsToLaunch || []).map((i) => ({ ...i, _adsToLaunch: true }));
  if (personDef && personDef.group === "growth_strategist") {
    return launchTagged;
  }
  if (personDef && personDef.group === "csm") {
    return [...base, ...launchTagged];
  }
  return base;
}

function daysSince(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
}

// === "Sent" date per bucket ===
// A record is CREATED the moment it's sent to the editor/designer, so for
// sent-to-production buckets the sent date IS the created date.
// For Awaiting Client, the last modification is (almost always) the status flip
// to "Pending for Approval" — used as the sent-to-client date.
function sentDateFor(item, bucket) {
  if (bucket === "video" || bucket === "design" || bucket === "sent_for_editing") return item.created || null;
  if (bucket === "awaiting_client") return item.lastModified || null;
  return null;
}
function sentLabelFor(bucket) {
  return bucket === "awaiting_client" ? "Sent to client" : "Sent";
}

// === Bucketing logic ===
// Priority order:
// 1. Revisions Needed / Denied  → 🔄 Needs Revision (team must take action)
// 2. Revisions Submitted / Ad Submitted / Pending → ⏳ Awaiting Feedback (someone must review)
// 3. Sent to Designer / Static Design → 📐 In Design
// 4. Sent to Video Editor / Video Editing → 🎬 In Video Editing
// Editor/Designer name match strings — used to recognize statuses like "Sent to Med"
const EDITOR_MATCH_STRINGS = ["muhammad faiz", "faiz", "nadish", "feriel", " med ", " med."];
const DESIGNER_MATCH_STRINGS = ["nayyab", "nayya", "lana", "rahim"];
function statusMentionsEditor(status) {
  const s = " " + String(status).toLowerCase() + " ";
  return EDITOR_MATCH_STRINGS.some((m) => s.includes(m));
}
function statusMentionsDesigner(status) {
  const s = String(status).toLowerCase();
  return DESIGNER_MATCH_STRINGS.some((m) => s.includes(m));
}

// === Multi-base client grouping (EXPLICIT) ===
// Only clients with a groupId (set during fan-out) are grouped together.
// Everything else gets a unique synthetic key so it renders as its own row.
function groupClients(clients) {
  const groups = new Map();
  for (const c of clients) {
    const key = c.groupId || ("solo-" + c.baseId);
    if (!groups.has(key)) {
      const displayName = c.groupId
        ? (c.groupLabel || c.brand || "(unnamed)")
        : (c.brand || "(unnamed)");
      groups.set(key, { key, displayName, clients: [], isExplicitGroup: !!c.groupId });
    }
    groups.get(key).clients.push(c);
  }
  return Array.from(groups.values());
}
function countUniqueGroups(clients) {
  const keys = new Set();
  for (const c of clients) keys.add(c.groupId || ("solo-" + c.baseId));
  return keys.size;
}
function groupParentLabel(displayName) {
  return displayName.toUpperCase();
}

function bucketOf(item) {
  // Items tagged as ads-to-launch by itemsForPerson bypass normal bucketing
  if (item && item._adsToLaunch) return "ads_to_launch";
  const internal = (item.internalStatus || "").toLowerCase().trim();
  const client = (item.clientStatus || "").toLowerCase().trim();

  // === CLIENT-side checks first — ONLY if clientStatus is actually set ===
  if (client) {
    // Client flagged: needs revisions / denied
    if (client.includes("denied")) return "client_revisions";
    if (client.includes("revisions needed") || (client.includes("revision") && !client.includes("submitted"))) return "client_revisions";
    // Client is reviewing (pending approval, ad submitted, revisions submitted back to client)
    if (client.includes("pending") || client.includes("ad submitted") || client.includes("revisions submitted") || client.includes("submitted")) return "awaiting_client";
    // (Approved / Launched are filtered out by isPending — won't get here)
  }

  // === INTERNAL-side checks — only fire if no client bucket matched above ===
  if (internal) {
    // Work actively in progress (or on hold) with the editor/designer — split by type.
    // Checked BEFORE editor-name / "video editing" matching so "Video Editing in
    // Progress..." lands here rather than in the Sent bucket.
    if (internal.includes("in progress") || internal.includes("on hold")) {
      if (internal.includes("static") || internal.includes("design")) return "design_in_progress";
      if (internal.includes("video") || internal.includes("editing")) return "video_in_progress";
      const t = String(item.type || "").toLowerCase();
      if (t.includes("static") || t.includes("image") || t.includes("carousel") || t.includes("design")) return "design_in_progress";
      return "video_in_progress";
    }
    // "Sent to <person>" — match against known editor/designer names
    if (statusMentionsEditor(internal)) return "video";
    if (statusMentionsDesigner(internal)) return "design";
    // Team flagged revisions (NOT submitted — submitted means done & awaiting review)
    if (internal.includes("revision") && !internal.includes("submitted")) return "internal_revisions";
    // Internal "Revisions Submitted" → team finished revisions, awaiting team review
    if (internal.includes("revisions submitted")) return "awaiting_internal";
    // Other awaiting-internal states (Ad Submitted internally, QA, Strategist review)
    if (internal.includes("ad submitted") || internal.includes("submitted") || internal.includes("review") || internal.includes("qa") || internal.includes("strategist")) return "awaiting_internal";
    // Sent for production
    if (internal.includes("designer") || internal.includes("static design")) return "design";
    if (internal.includes("video editor") || internal.includes("video editing") || internal.includes("editor")) return "video";
  }

  return "other";
}

// 10 bucket definitions in display order (used everywhere)
const BUCKETS = [
  { id: "concepts",            label: "Concepts",            icon: "💡", color: "#B87600" },
  { id: "ugc",                 label: "Creators",            icon: "🎭", color: "#4A5BA9" },
  { id: "video",               label: "Sent to Editor",      icon: "🎬", color: "#2821B5" },
  { id: "design",              label: "Sent to Designer",    icon: "📐", color: "#8321C8" },
  { id: "video_in_progress",   label: "Videos in Progress",  icon: "✂️", color: "#1D4ED8" },
  { id: "design_in_progress",  label: "Designs in Progress", icon: "🎨", color: "#9D3BD3" },
  { id: "awaiting_internal",   label: "Awaiting Internal",   icon: "👀", color: "#0E9F70" },
  { id: "awaiting_client",     label: "Awaiting Client",     icon: "📤", color: "#0369A1" },
  { id: "internal_revisions",  label: "Internal Revisions",  icon: "🛠",  color: "#C97200" },
  { id: "client_revisions",    label: "Client Revisions",    icon: "🔄", color: "#A63446" },
];

// CSMs get the 8 base buckets PLUS Ads to Launch
const CSM_BUCKETS = [
  ...BUCKETS,
  { id: "ads_to_launch",       label: "Ads to Launch",       icon: "🚀", color: "#0891B2" },
];

// Growth Strategist sees ONLY ads to launch
const GROWTH_STRATEGIST_BUCKETS = [
  { id: "ads_to_launch",       label: "Ads to Launch",       icon: "🚀", color: "#0891B2" },
];

// Long labels for big summary cards
const BUCKET_LONG = {
  concepts:            "💡 Concepts Pending",
  ugc:                 "🎭 Creators Pending",
  video:               "🎬 Sent to Video Editor",
  design:              "📐 Sent to Designer",
  video_in_progress:   "✂️ Videos in Progress",
  design_in_progress:  "🎨 Designs in Progress",
  awaiting_internal:   "👀 Awaiting Internal Feedback",
  awaiting_client:     "📤 Awaiting Client Feedback",
  internal_revisions:  "🛠 Internal Revisions",
  client_revisions:    "🔄 Client Revisions",
  ads_to_launch:       "🚀 Ads to Launch",
};
const CSM_BUCKET_LONG = { ...BUCKET_LONG };
const GROWTH_STRATEGIST_BUCKET_LONG = { ads_to_launch: "🚀 Ads to Launch" };

// === Role-specific bucket configurations ===
// Video editors: only see video work. Designers: only see static/design work.
const VIDEO_EDITOR_BUCKETS = [
  { id: "sent_for_editing",   label: "Sent for Editing",      icon: "📤", color: "#0369A1" },
  { id: "in_progress",        label: "Videos in Progress",    icon: "🎬", color: "#2821B5" },
  { id: "needs_revisions",    label: "Needs Revisions",       icon: "🛠", color: "#C97200" },
  { id: "awaiting_strategist",label: "Awaiting Strategist",   icon: "👀", color: "#0E9F70" },
  { id: "awaiting_client",    label: "Awaiting Client",       icon: "📨", color: "#0369A1" },
  { id: "client_revisions",   label: "Client Revisions",      icon: "🔄", color: "#A63446" },
];
const VIDEO_EDITOR_BUCKET_LONG = {
  sent_for_editing:    "📤 Sent for Editing",
  in_progress:         "🎬 Videos in Progress",
  needs_revisions:     "🛠 Needs Revisions",
  awaiting_strategist: "👀 Awaiting Creative Strategist",
  awaiting_client:     "📨 Awaiting Client Review",
  client_revisions:    "🔄 Client Revisions",
};
const DESIGNER_BUCKETS = [
  { id: "sent_for_editing",   label: "Sent for Design",       icon: "📤", color: "#0369A1" },
  { id: "in_progress",        label: "Designs in Progress",   icon: "📐", color: "#8321C8" },
  { id: "needs_revisions",    label: "Needs Revisions",       icon: "🛠", color: "#C97200" },
  { id: "awaiting_strategist",label: "Awaiting Strategist",   icon: "👀", color: "#0E9F70" },
  { id: "awaiting_client",    label: "Awaiting Client",       icon: "📨", color: "#0369A1" },
  { id: "client_revisions",   label: "Client Revisions",      icon: "🔄", color: "#A63446" },
];
const DESIGNER_BUCKET_LONG = {
  sent_for_editing:    "📤 Sent for Design",
  in_progress:         "📐 Designs in Progress",
  needs_revisions:     "🛠 Needs Revisions",
  awaiting_strategist: "👀 Awaiting Creative Strategist",
  awaiting_client:     "📨 Awaiting Client Review",
  client_revisions:    "🔄 Client Revisions",
};

function getBucketsForGroup(group) {
  if (group === "video_editor") return VIDEO_EDITOR_BUCKETS;
  if (group === "designer") return DESIGNER_BUCKETS;
  if (group === "growth_strategist") return GROWTH_STRATEGIST_BUCKETS;
  if (group === "csm") return CSM_BUCKETS;
  return BUCKETS;
}
function getBucketLongForGroup(group) {
  if (group === "video_editor") return VIDEO_EDITOR_BUCKET_LONG;
  if (group === "designer") return DESIGNER_BUCKET_LONG;
  if (group === "growth_strategist") return GROWTH_STRATEGIST_BUCKET_LONG;
  if (group === "csm") return CSM_BUCKET_LONG;
  return BUCKET_LONG;
}

// Custom bucketing for editors/designers: splits "sent" from "in progress",
// merges "awaiting internal" into "awaiting strategist".
function bucketOfForCreativeRole(item) {
  const internal = (item.internalStatus || "").toLowerCase().trim();
  const client = (item.clientStatus || "").toLowerCase().trim();

  if (client) {
    if (client.includes("denied")) return "client_revisions";
    if (client.includes("revisions needed") || (client.includes("revision") && !client.includes("submitted"))) return "client_revisions";
    if (client.includes("pending") || client.includes("ad submitted") || client.includes("revisions submitted") || client.includes("submitted")) return "awaiting_client";
  }
  if (internal) {
    if (internal.includes("revision") && !internal.includes("submitted")) return "needs_revisions";
    if (internal.includes("revisions submitted") || internal.includes("ad submitted") || internal.includes("submitted") || internal.includes("review") || internal.includes("qa") || internal.includes("strategist")) return "awaiting_strategist";
    if (internal.includes("in progress") || internal.includes("editing in progress") || internal.includes("design in progress") || internal.includes("on hold")) return "in_progress";
    // "Sent to <person>" — match against known editor names
    if (statusMentionsEditor(internal)) return "sent_for_editing";
    if (statusMentionsDesigner(internal)) return "sent_for_editing";
    if (internal.includes("sent to video") || internal.includes("sent to editor") || internal.includes("video editor") || internal.includes("video editing") || internal.includes("editor")) return "sent_for_editing";
    if (internal.includes("sent to designer") || internal.includes("designer") || internal.includes("static design")) return "sent_for_editing";
  }
  return "other";
}

// Filter items by type for editor/designer views.
// Video editor: items where type contains "video" (or unknown type — show for safety).
// Designer: items where type contains "static" or "image" (or unknown).
function itemMatchesRole(item, group) {
  if (group !== "video_editor" && group !== "designer") return true;
  const t = String(item.type || "").toLowerCase().trim();
  // If type is missing, fall back to internal status to guess
  const internal = (item.internalStatus || "").toLowerCase();
  const isVideo = t.includes("video") || (!t && (internal.includes("video") || internal.includes("editor")));
  const isStatic = t.includes("static") || t.includes("image") || t.includes("carousel") || t.includes("design") || (!t && (internal.includes("designer") || internal.includes("static")));
  if (group === "video_editor") return isVideo || (!t && !isStatic);
  if (group === "designer") return isStatic || (!t && !isVideo);
  return true;
}

function computeBucketsForRole(client, personDef) {
  const group = personDef ? personDef.group : null;
  if (group !== "video_editor" && group !== "designer") {
    return computeBuckets(client);
  }
  const items = (client.items || [])
    .filter((i) => itemMatchesRole(i, group))
    .map((i) => ({ ...i, bucket: bucketOfForCreativeRole(i) }));
  return {
    sent_for_editing:    items.filter((i) => i.bucket === "sent_for_editing").length,
    in_progress:         items.filter((i) => i.bucket === "in_progress").length,
    needs_revisions:     items.filter((i) => i.bucket === "needs_revisions").length,
    awaiting_strategist: items.filter((i) => i.bucket === "awaiting_strategist").length,
    awaiting_client:     items.filter((i) => i.bucket === "awaiting_client").length,
    client_revisions:    items.filter((i) => i.bucket === "client_revisions").length,
  };
}

function bucketTotalForRole(b) {
  return Object.values(b).reduce((s, v) => s + v, 0);
}

function computeBuckets(client) {
  // Returns counts object with all bucket counts for a single client
  const items = (client.items || []).map((i) => ({ ...i, bucket: bucketOf(i) }));
  return {
    concepts:           client.conceptCount || 0,
    ugc:                client.ugcCount || 0,
    video:              items.filter((i) => i.bucket === "video").length,
    design:             items.filter((i) => i.bucket === "design").length,
    video_in_progress:  items.filter((i) => i.bucket === "video_in_progress").length,
    design_in_progress: items.filter((i) => i.bucket === "design_in_progress").length,
    awaiting_internal:  items.filter((i) => i.bucket === "awaiting_internal").length,
    awaiting_client:    items.filter((i) => i.bucket === "awaiting_client").length,
    internal_revisions: items.filter((i) => i.bucket === "internal_revisions").length,
    client_revisions:   items.filter((i) => i.bucket === "client_revisions").length,
    ads_to_launch:      (client.adsToLaunch || []).length,
  };
}

function sumBuckets(a, b) {
  const out = {};
  for (const k of Object.keys(a)) out[k] = (a[k] || 0) + (b[k] || 0);
  return out;
}

function bucketTotal(c) {
  return Object.values(c).reduce((s, v) => s + v, 0);
}

function statusPill(status, kind) {
  if (!status) return "";
  const s = String(status);
  let cls = "muted";
  // Designer-side
  if (s.includes("Sent to Designer") || s.includes("Static Design")) cls = "purple";
  // Video-side
  else if (s.includes("Sent to Video") || s.includes("Video Editing")) cls = "blue";
  // Awaiting feedback
  else if (s.includes("Revisions Submitted") || s.includes("Revision Submitted") || s.includes("Ad Submitted") || s.includes("Pending")) cls = "sage";
  // Revisions Needed / Denied → urgent
  else if (s.includes("Revisions Needed") || s.includes("Images Revisions") || s.includes("Videos Revisions") || s.includes("Denied")) cls = "rose";
  // Approved / Launched
  else if (s.includes("Approved") || s.includes("Launched")) cls = "good";
  return \`<span class="pill \${cls}">\${s}</span>\`;
}

async function loadData(force = false) {
  const btn = document.getElementById("refresh-btn");
  btn.disabled = true;
  document.getElementById("ts").textContent = force ? "Refreshing…" : "Loading…";
  try {
    const q = force ? "?refresh=1" : "";
    const [mainRes, conceptsRes, ugcRes] = await Promise.all([
      fetch("/pipeline/api" + q, { cache: "no-store" }),
      fetch("/pipeline/concepts/api" + q, { cache: "no-store" }).catch(() => null),
      fetch("/pipeline/ugc/api" + q, { cache: "no-store" }).catch(() => null),
    ]);
    if (!mainRes.ok) {
      const err = await mainRes.json().catch(() => ({}));
      throw new Error(err.error || \`HTTP \${mainRes.status}\`);
    }
    DATA = await mainRes.json();
    // Merge concept + UGC counts by baseId
    const conceptsByBase = {};
    if (conceptsRes && conceptsRes.ok) {
      const cData = await conceptsRes.json();
      for (const c of (cData.clients || [])) conceptsByBase[c.baseId] = c.count || 0;
    }
    const ugcByBase = {};
    if (ugcRes && ugcRes.ok) {
      const uData = await ugcRes.json();
      for (const u of (uData.clients || [])) ugcByBase[u.baseId] = u.count || 0;
    }
    for (const client of (DATA.clients || [])) {
      client.conceptCount = conceptsByBase[client.baseId] || 0;
      client.ugcCount = ugcByBase[client.baseId] || 0;
    }
    route();
    const ts = new Date(DATA.generatedAt);
    document.getElementById("ts").textContent = \`Updated \${ts.toLocaleTimeString()}\`;
  } catch (e) {
    document.getElementById("root").innerHTML = \`<div class="err">Could not load: \${e.message}</div>\`;
    document.getElementById("ts").textContent = "Error";
  } finally {
    btn.disabled = false;
  }
}

function route() {
  if (!DATA) return;
  const hash = (location.hash || "").slice(1);
  if (!hash) return renderLanding();
  const [csmSlug, clientSlug] = hash.split("/");
  if (clientSlug) return renderClient(csmSlug, decodeURIComponent(clientSlug));
  return renderCsm(csmSlug);
}
function goHome() { location.hash = ""; }
function goCsm(s) { location.hash = s; }
function goClient(csm, client) { location.hash = \`\${csm}/\${encodeURIComponent(client)}\`; }
function toggleGroup(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.display = (el.style.display === "none" ? "block" : "none");
}
window.addEventListener("hashchange", route);

function renderLanding() {
  document.getElementById("crumb").innerHTML = \`<a onclick="goHome()">Home</a>\`;
  const root = document.getElementById("root");

  // Compute bucket stats + monthly-concept lookup for every person
  const teamStats = DATA.teamStats || {};
  // Helper: find monthly assignment for a person by matching their display name to teamStats keys
  function lookupMonthlyForPerson(p) {
    const matchKey = (p.match || [p.slug])[0];
    for (const teamName of Object.keys(teamStats)) {
      const norm = String(teamName).toLowerCase();
      if (norm.includes(matchKey.toLowerCase()) || norm.includes(p.display.toLowerCase())) {
        return teamStats[teamName];
      }
    }
    return null;
  }
  const peopleStats = PEOPLE.map((p) => {
    const clients = (DATA.clients || []).filter((c) => personMatches(c, p));
    // Initialize agg with the appropriate bucket schema for this person's role
    const roleBuckets = getBucketsForGroup(p.group);
    let agg = {};
    for (const rb of roleBuckets) agg[rb.id] = 0;
    for (const c of clients) agg = sumBuckets(agg, bucketsForPerson(c, p));
    const monthly = lookupMonthlyForPerson(p);
    let monthlyLabel = "";
    if (monthly) {
      if (p.group === "cs" && monthly.concepts) monthlyLabel = monthly.concepts + " concepts/mo";
      else if (p.group === "video_editor") {
        const parts = [];
        if (monthly.veConcepts) parts.push(monthly.veConcepts + " concepts/mo");
        if (monthly.veVideos)   parts.push(monthly.veVideos   + " videos/mo");
        monthlyLabel = parts.join(" · ");
      }
    }
    return {
      ...p,
      clientCount: clients.length,
      buckets: agg,
      total: bucketTotal(agg),
      monthlyLabel,
    };
  }).filter((p) => p.clientCount > 0 || p.alwaysShow);

  // Group by role
  const groups = {};
  for (const p of peopleStats) {
    if (!groups[p.group]) groups[p.group] = [];
    groups[p.group].push(p);
  }

  const renderGroup = (key) => {
    const list = groups[key] || [];
    if (!list.length) return "";
    return \`
      <div class="group-section">
        <h2 class="group-header">\${GROUP_LABELS[key]}</h2>
        <div class="csm-grid">
          \${list.map((p) => \`
            <div class="csm-card csm-card-\${p.group}" onclick="goCsm('\${p.slug}')">
              <div class="name">\${p.display}</div>
              <div class="role">\${p.role} · \${p.clientCount} client\${p.clientCount === 1 ? "" : "s"} · \${p.total} total assets\${p.monthlyLabel ? " · " + p.monthlyLabel : ""}</div>
              <div class="breakdown">
                \${getBucketsForGroup(p.group).map((b) => {
                  const n = p.buckets[b.id] || 0;
                  return \`<div class="chip \${b.id} \${n === 0 ? "zero" : ""}"><span class="icon">\${b.icon}</span><span class="n">\${n}</span><span>\${b.label}</span></div>\`;
                }).join("")}
              </div>
            </div>
          \`).join("")}
        </div>
      </div>
    \`;
  };

  // === Video Editors overview: clients / total concepts / total videos per editor ===
  // Concepts & videos come from the Team table rollups (same source as the Airtable
  // dashboard); client counts from live pipeline assignments (multi-base groups = 1).
  const veOverview = (() => {
    const editors = PEOPLE.filter((p) => p.group === "video_editor").map((p) => {
      const clients = (DATA.clients || []).filter((c) => personMatches(c, p));
      const stats = lookupMonthlyForPerson(p) || {};
      return {
        slug: p.slug,
        display: p.display,
        clients: countUniqueGroups(clients),
        concepts: stats.veConcepts || 0,
        videos: stats.veVideos || 0,
      };
    }).filter((v) => v.clients > 0 || v.concepts > 0 || v.videos > 0);
    if (!editors.length) return "";
    const max = {
      clients: Math.max(...editors.map((v) => v.clients), 1),
      concepts: Math.max(...editors.map((v) => v.concepts), 1),
      videos: Math.max(...editors.map((v) => v.videos), 1),
    };
    const statRow = (label, val, key) => \`
      <div class="ve-stat">
        <div class="ve-stat-top"><span class="ve-stat-label">\${label}</span><span class="ve-stat-val">\${val}</span></div>
        <div class="ve-bar \${key}"><span style="width:\${Math.round((val / max[key]) * 100)}%"></span></div>
      </div>
    \`;
    return \`
      <div class="group-section ve-overview">
        <h2 class="group-header">🎥 Video Editors — Totals</h2>
        <div class="ve-grid">
          \${editors.map((v) => \`
            <div class="ve-card" onclick="goCsm('\${v.slug}')">
              <div class="ve-name">\${v.display}</div>
              \${statRow("Clients", v.clients, "clients")}
              \${statRow("Total Concepts", v.concepts, "concepts")}
              \${statRow("Total Videos", v.videos, "videos")}
            </div>
          \`).join("")}
        </div>
      </div>
    \`;
  })();

  root.innerHTML = \`
    <h1>Who's checking in?</h1>
    <div class="sub">Click your name to see your clients and what needs attention.</div>
    \${renderGroup("csm")}
    \${renderGroup("cs")}
    \${renderGroup("growth_strategist")}
    \${renderGroup("video_editor")}
    \${renderGroup("designer")}
    \${veOverview}
  \`;
}

function renderCsm(personSlug) {
  const personDef = PEOPLE.find((p) => p.slug === personSlug);
  if (!personDef) return renderLanding();
  document.getElementById("crumb").innerHTML = \`
    <a onclick="goHome()">Home</a>
    <span class="sep">/</span>
    <span>\${personDef.display}</span>
  \`;
  const root = document.getElementById("root");
  const clients = (DATA.clients || []).filter((c) => personMatches(c, personDef));
  const allItems = clients.flatMap((c) => itemsForPerson(c, personDef).map((i) => ({ ...i, brand: c.brand, bucket: bucketOf(i) })));
  const roleBuckets = getBucketsForGroup(personDef.group);
  const roleBucketLong = getBucketLongForGroup(personDef.group);
  let counts = {};
  for (const rb of roleBuckets) counts[rb.id] = 0;
  for (const c of clients) counts = sumBuckets(counts, bucketsForPerson(c, personDef));
  const totalPending = bucketTotal(counts);
  root.innerHTML = \`
    <h1>\${personDef.display}'s Pipeline</h1>
    <div class="sub">\${personDef.role} · \${countUniqueGroups(clients)} active client\${countUniqueGroups(clients) === 1 ? "" : "s"} · \${totalPending} pending across all categories</div>
    <div class="summary-strip">
      \${roleBuckets.map((b) => \`
        <div class="summary-card bucket-\${b.id}">
          <div class="label">\${roleBucketLong[b.id]}</div>
          <div class="value">\${counts[b.id]}</div>
        </div>
      \`).join("")}
    </div>
    <div class="section-heading">Click a client to see what's pending</div>
    <div class="clients-list">
      \${groupClients(clients).map((g) => {
        // Sum buckets across all sub-bases in this group
        let groupB = {};
        for (const rb of getBucketsForGroup(personDef.group)) groupB[rb.id] = 0;
        for (const c of g.clients) groupB = sumBuckets(groupB, bucketsForPerson(c, personDef));
        const total = bucketTotal(groupB);
        const isEmpty = total === 0;
        const isMulti = g.isExplicitGroup === true && g.clients.length > 1;
        const groupId = "group-" + g.key.replace(/[^a-z0-9]/g, "-");
        if (!isMulti) {
          // Single-base group: render as normal client row
          const c = g.clients[0];
          return \`
            <div class="client-row \${isEmpty ? "empty" : ""}" \${isEmpty ? "" : \`onclick="goClient('\${personDef.slug}', '\${c.brand.replace(/'/g, "\\\\'")}')"\`}>
              <div>
                <div class="brand">\${c.brand}</div>
                <div class="brand-sub">\${total} pending</div>
              </div>
              <div class="row-counts">
                \${getBucketsForGroup(personDef.group).map((bd) => {
                  const n = groupB[bd.id] || 0;
                  return \`<span class="pill-count \${n === 0 ? "zero" : ""}" title="\${bd.label}">\${bd.icon} \${n}</span>\`;
                }).join("")}
                \${isEmpty ? "" : \`<span class="arrow">→</span>\`}
              </div>
            </div>
          \`;
        }
        // Multi-base group: header (NOT clickable, shown as a summary) + always-visible sub-rows.
        const header = \`
          <div class="group-header-row">
            <div class="group-header-label">
              <span class="group-name">\${groupParentLabel(g.displayName)}</span>
              <span class="group-badge">\${g.clients.length} bases</span>
            </div>
            <div class="row-counts group-totals">
              \${getBucketsForGroup(personDef.group).map((bd) => {
                const n = groupB[bd.id] || 0;
                return \`<span class="pill-count \${n === 0 ? "zero" : ""}" title="\${bd.label}">\${bd.icon} \${n}</span>\`;
              }).join("")}
              <span class="group-total-pill">\${total} total assets</span>
            </div>
          </div>
        \`;
        const subs = g.clients.map((c) => {
          const cb = bucketsForPerson(c, personDef);
          const ct = bucketTotal(cb);
          return \`
            <div class="client-row sub-row \${ct === 0 ? "empty" : ""}" \${ct === 0 ? "" : \`onclick="goClient('\${personDef.slug}', '\${c.brand.replace(/'/g, "\\\\'")}')"\`}>
              <div>
                <div class="brand">↳ \${c.brand}</div>
                <div class="brand-sub">\${ct} pending</div>
              </div>
              <div class="row-counts">
                \${getBucketsForGroup(personDef.group).map((bd) => {
                  const n = cb[bd.id] || 0;
                  return \`<span class="pill-count \${n === 0 ? "zero" : ""}" title="\${bd.label}">\${bd.icon} \${n}</span>\`;
                }).join("")}
                \${ct === 0 ? "" : \`<span class="arrow">→</span>\`}
              </div>
            </div>
          \`;
        }).join("");
        return \`<div class="group-block">\${header}\${subs}</div>\`;
      }).join("")}
    </div>
    \${clients.length === 0 ? \`<div class="empty-state"><span class="emoji">🌴</span>No active clients matched to \${personDef.display}.</div>\` : ""}
  \`;
}

function renderClient(personSlug, brandName) {
  const personDef = PEOPLE.find((p) => p.slug === personSlug);
  const client = (DATA.clients || []).find((c) => c.brand === brandName);
  if (!client) {
    document.getElementById("crumb").innerHTML = \`<a onclick="goHome()">Home</a>\`;
    document.getElementById("root").innerHTML = \`<div class="err">Client "\${brandName}" not found.</div>\`;
    return;
  }
  document.getElementById("crumb").innerHTML = \`
    <a onclick="goHome()">Home</a>
    <span class="sep">/</span>
    <a onclick="goCsm('\${personSlug}')">\${personDef ? personDef.display : "Back"}</a>
    <span class="sep">/</span>
    <span>\${client.brand}</span>
  \`;
  const isCreativeRole = personDef && (personDef.group === "video_editor" || personDef.group === "designer");
  let items, byBucket;
  if (isCreativeRole) {
    items = itemsForPerson(client, personDef)
      .filter((i) => itemMatchesRole(i, personDef.group))
      .map((i) => {
        const bucket = bucketOfForCreativeRole(i);
        const sent = sentDateFor(i, bucket);
        return { ...i, bucket, sent, days: daysSince(sent || i.lastModified) };
      });
    byBucket = {
      sent_for_editing:    items.filter((i) => i.bucket === "sent_for_editing"),
      in_progress:         items.filter((i) => i.bucket === "in_progress"),
      needs_revisions:     items.filter((i) => i.bucket === "needs_revisions"),
      awaiting_strategist: items.filter((i) => i.bucket === "awaiting_strategist"),
      awaiting_client:     items.filter((i) => i.bucket === "awaiting_client"),
      client_revisions:    items.filter((i) => i.bucket === "client_revisions"),
    };
  } else {
    items = itemsForPerson(client, personDef).map((i) => {
      const bucket = bucketOf(i);
      const sent = sentDateFor(i, bucket);
      return { ...i, bucket, sent, days: daysSince(sent || i.lastModified) };
    });
    byBucket = {
      video:              items.filter((i) => i.bucket === "video"),
      design:             items.filter((i) => i.bucket === "design"),
      video_in_progress:  items.filter((i) => i.bucket === "video_in_progress"),
      design_in_progress: items.filter((i) => i.bucket === "design_in_progress"),
      awaiting_internal:  items.filter((i) => i.bucket === "awaiting_internal"),
      awaiting_client:    items.filter((i) => i.bucket === "awaiting_client"),
      internal_revisions: items.filter((i) => i.bucket === "internal_revisions"),
      client_revisions:   items.filter((i) => i.bucket === "client_revisions"),
      ads_to_launch:      items.filter((i) => i.bucket === "ads_to_launch"),
    };
  }
  const baseUrl = client.baseId ? \`https://airtable.com/\${client.baseId}\` : null;
  document.getElementById("root").innerHTML = \`
    <h1>\${client.brand}\${baseUrl ? \`<a class="airtable-link" href="\${baseUrl}" target="_blank" rel="noopener">Open base in Airtable <span class="arrow">↗</span></a>\` : ""}</h1>
    <div class="sub">\${items.length} pending item\${items.length === 1 ? "" : "s"}\${client.csm ? \` · CSM: \${client.csm.replace(/^[^\\w]+/, "").trim()}\` : ""}</div>
    \${isCreativeRole ? "" : \`<div id="concepts-section"><div class="loading-inline">Loading concepts &amp; creators…</div></div><div id="ugc-section"></div>\`}
    \${isCreativeRole ? \`
      \${renderBucketSection("sent_for_editing", personDef.group === "video_editor" ? "📤 Sent for Editing" : "📤 Sent for Design", byBucket.sent_for_editing, client.baseId)}
      \${renderBucketSection("in_progress", personDef.group === "video_editor" ? "🎬 Videos in Progress" : "📐 Designs in Progress", byBucket.in_progress, client.baseId)}
      \${renderBucketSection("needs_revisions", "🛠 Needs Revisions", byBucket.needs_revisions, client.baseId)}
      \${renderBucketSection("awaiting_strategist", "👀 Awaiting Creative Strategist", byBucket.awaiting_strategist, client.baseId)}
      \${renderBucketSection("awaiting_client", "📨 Awaiting Client Review", byBucket.awaiting_client, client.baseId)}
      \${renderBucketSection("client_revisions", "🔄 Client Revisions", byBucket.client_revisions, client.baseId)}
    \` : \`
      \${renderBucketSection("video", "🎬 Sent to Video Editor", byBucket.video, client.baseId)}
      \${renderBucketSection("design", "📐 Sent to Designer", byBucket.design, client.baseId)}
      \${renderBucketSection("video_in_progress", "✂️ Videos in Progress", byBucket.video_in_progress, client.baseId)}
      \${renderBucketSection("design_in_progress", "🎨 Designs in Progress", byBucket.design_in_progress, client.baseId)}
      \${renderBucketSection("awaiting_internal", "👀 Awaiting Internal Feedback", byBucket.awaiting_internal, client.baseId)}
      \${renderBucketSection("awaiting_client", "📤 Awaiting Client Feedback", byBucket.awaiting_client, client.baseId)}
      \${renderBucketSection("internal_revisions", "🛠 Internal Revisions", byBucket.internal_revisions, client.baseId)}
      \${renderBucketSection("client_revisions", "🔄 Client Revisions", byBucket.client_revisions, client.baseId)}
      \${renderBucketSection("ads_to_launch", "🚀 Ads to Launch", byBucket.ads_to_launch, client.baseId, 15)}
    \`}
  \`;
  // Lazy-load concepts + UGC for this client (skip for editors/designers — not their concern)
  const skipConcepts = personDef && personDef.field === "assignee";
  if (skipConcepts) {
    const t = document.getElementById("concepts-section"); if (t) t.innerHTML = "";
  }
  if (client.baseId && !skipConcepts) {
    fetch(\`/pipeline/client/api?baseId=\${encodeURIComponent(client.baseId)}\`)
      .then((r) => r.json())
      .then((detail) => {
        const target = document.getElementById("concepts-section");
        if (!target) return;
        const conceptsHTML = renderConceptsSection(detail.concepts || [], client.baseId);
        const ugcHTML = renderUgcSection(detail.ugc || [], client.baseId);
        target.innerHTML = conceptsHTML || "";
        const ugcTarget = document.getElementById("ugc-section");
        if (ugcTarget) ugcTarget.innerHTML = ugcHTML || "";
      })
      .catch((e) => {
        const target = document.getElementById("concepts-section");
        if (target) target.innerHTML = "";
      });
  }
}

function fmtDate(s) {
  if (!s) return "—";
  try { const d = new Date(s); return d.toLocaleDateString(undefined, { month: "short", day: "numeric" }); }
  catch (e) { return "—"; }
}

function renderBucketSection(bucket, title, items, baseId, cap) {
  if (!items.length) return "";
  let sorted = [...items].sort((a, b) => (b.days || 0) - (a.days || 0));
  // Capped sections (e.g. Ads to Launch): the count is what matters — the media
  // buyer works from their own table. Show up to \`cap\` items, label the rest "+".
  const capped = cap && sorted.length > cap;
  const countLabel = capped ? cap + "+" : String(items.length);
  if (capped) sorted = sorted.slice(0, cap);
  return \`
    <div class="bucket-section \${bucket}">
      <h2>\${title} <span class="count">\${countLabel}</span></h2>
      <div class="items-grid">
      \${sorted.map((i) => {
        const recordUrl = (baseId && i.id && i.tableId) ? \`https://airtable.com/\${baseId}/\${i.tableId}/\${i.id}\` : null;
        const nameHTML = recordUrl
          ? \`<a href="\${recordUrl}" target="_blank" rel="noopener">\${i.name || "(unnamed)"}</a>\`
          : (i.name || "(unnamed)");
        const internalRow = i.internalStatus
          ? \`<div class="status-row"><span class="status-label int">Internal</span>\${statusPill(i.internalStatus, "internal")}</div>\` : "";
        const externalRow = i.clientStatus
          ? \`<div class="status-row"><span class="status-label ext">External</span>\${statusPill(i.clientStatus, "client")}</div>\` : "";
        const daysHTML = \`<span class="days \${i.days != null && i.days > 14 ? "urgent" : i.days != null && i.days > 7 ? "warn" : ""}">\${i.days != null ? i.days + "d" : "—"}</span>\`;
        return \`
          <div class="item-card">
            <div class="item-main">
              <div>
                <div class="item-name">\${nameHTML}</div>
                <div class="item-meta">\${i.batch ? \`Batch \${i.batch} · \` : ""}\${i.assignee ? \`Assigned to \${i.assignee}\` : "Unassigned"}</div>
              </div>
              \${daysHTML}
            </div>
            <div class="item-status">
              \${internalRow}
              \${externalRow}
            </div>
            <div class="item-dates">
              \${i.sent ? \`<span class="sent-date"><span class="date-label">\${sentLabelFor(bucket)}</span> <span class="date-val">\${fmtDate(i.sent)}</span></span>\` : ""}
              <span><span class="date-label">Created</span> <span class="date-val">\${fmtDate(i.created)}</span></span>
              <span><span class="date-label">Modified</span> <span class="date-val">\${fmtDate(i.lastModified)}</span></span>
            </div>
          </div>
        \`;
      }).join("")}
      </div>
      \${capped ? \`<div class="cap-note">Showing \${cap} of \${items.length} — the full list lives in the client's Airtable base.</div>\` : ""}
    </div>
  \`;
}

function renderConceptsSection(concepts, baseId) {
  if (!concepts.length) return "";
  const sorted = [...concepts].sort((a, b) => {
    const da = a.lastModified ? new Date(a.lastModified).getTime() : 0;
    const db = b.lastModified ? new Date(b.lastModified).getTime() : 0;
    return db - da;
  });
  return \`
    <div class="bucket-section concepts">
      <h2>💡 Concepts Pending Approval <span class="count">\${concepts.length}</span></h2>
      <div class="items-grid">
      \${sorted.map((c) => {
        const recordUrl = (baseId && c.id) ? \`https://airtable.com/\${baseId}/\${c.tableId}/\${c.id}\` : null;
        const nameHTML = recordUrl ? \`<a href="\${recordUrl}" target="_blank" rel="noopener">\${c.name}</a>\` : c.name;
        return \`
          <div class="concept-card">
            <div class="name">\${nameHTML}</div>
            <div class="meta">\${c.batch ? \`Batch \${c.batch} · \` : ""}\${c.status || "Pending"}\${c.productionStatus ? \` · \${c.productionStatus}\` : ""}</div>
            <div class="item-dates">
              <span><span class="date-label">Created</span> <span class="date-val">\${fmtDate(c.created)}</span></span>
              <span><span class="date-label">Modified</span> <span class="date-val">\${fmtDate(c.lastModified)}</span></span>
            </div>
          </div>
        \`;
      }).join("")}
      </div>
    </div>
  \`;
}

function renderUgcSection(ugc, baseId) {
  if (!ugc.length) return "";
  const sorted = [...ugc].sort((a, b) => {
    const da = a.lastModified ? new Date(a.lastModified).getTime() : 0;
    const db = b.lastModified ? new Date(b.lastModified).getTime() : 0;
    return db - da;
  });
  return \`
    <div class="bucket-section ugc">
      <h2>🎭 Creators Pending Approval <span class="count">\${ugc.length}</span></h2>
      <div class="items-grid">
      \${sorted.map((u) => {
        const recordUrl = (baseId && u.id) ? \`https://airtable.com/\${baseId}/\${u.tableId}/\${u.id}\` : null;
        const nameHTML = recordUrl ? \`<a href="\${recordUrl}" target="_blank" rel="noopener">\${u.name}</a>\` : u.name;
        return \`
          <div class="ugc-card">
            <div class="name">\${nameHTML}</div>
            <div class="meta">\${u.platform ? \`\${u.platform} · \` : ""}\${u.status || "Pending"}\${u.internalStatus ? \` · Internal: \${u.internalStatus}\` : ""}</div>
            <div class="item-dates">
              <span><span class="date-label">Sourced</span> <span class="date-val">\${fmtDate(u.created)}</span></span>
              <span><span class="date-label">Modified</span> <span class="date-val">\${fmtDate(u.lastModified)}</span></span>
            </div>
          </div>
        \`;
      }).join("")}
      </div>
    </div>
  \`;
}

loadData();
</script>
</body>
</html>
`;

const HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>TAS Digital — Agency Performance</title>
<meta name="description" content="Live agency performance dashboard for the TAS Digital team." />
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.5.0/dist/chart.umd.js"></script>
<style>
  :root {
    color-scheme: light;
    --bg: #f7f4ee;
    --card: #ffffff;
    --ink: #1a1f2e;
    --ink-soft: #4a5263;
    --ink-faint: #8a92a3;
    --line: #e8e3d8;
    --line-soft: #f0ece2;
    --accent: #2f6e63;
    --accent-soft: #d2e3df;
    --good: #2f7d3d;
    --bad: #b3382c;
    --warn: #b8841a;
    --info: #3b6ea5;
    --rose: #b3486a;
    --shadow: 0 1px 3px rgba(20,25,35,.04), 0 4px 16px rgba(20,25,35,.04);
  }
  * { box-sizing: border-box; }
  html, body {
    margin: 0; padding: 0; background: var(--bg); color: var(--ink);
    font-family: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", system-ui, sans-serif;
    font-size: 14px; line-height: 1.55;
  }
  .wrap { max-width: 1280px; margin: 0 auto; padding: 28px 24px 60px; }

  header { display: flex; align-items: flex-end; justify-content: space-between;
    flex-wrap: wrap; gap: 14px; margin-bottom: 26px; padding-bottom: 18px; border-bottom: 1px solid var(--line); }
  .h-left .eyebrow { font-size: 11px; text-transform: uppercase; letter-spacing: .14em;
    color: var(--accent); font-weight: 600; }
  .h-left h1 { font-size: 24px; font-weight: 600; margin: 6px 0 4px; letter-spacing: -.01em; }
  .h-left .sub { color: var(--ink-soft); font-size: 13px; }
  .h-right { display: flex; gap: 10px; align-items: center; }
  .h-right .ts { font-size: 12px; color: var(--ink-faint); font-variant-numeric: tabular-nums; }
  button.refresh {
    background: var(--accent); color: white; border: none;
    padding: 8px 14px; border-radius: 8px; font-size: 13px; font-weight: 500;
    cursor: pointer; transition: all .15s ease;
  }
  button.refresh:hover { background: #245249; }
  button.refresh:disabled { opacity: 0.5; cursor: wait; }

  .section { margin-top: 32px; }
  .section h2 {
    font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .1em;
    color: var(--ink-faint); margin: 0 0 14px;
  }

  .card { background: var(--card); border: 1px solid var(--line); border-radius: 14px;
    padding: 18px 20px; box-shadow: var(--shadow); }

  .grid { display: grid; gap: 16px; }
  .kpis { grid-template-columns: repeat(4, 1fr); }
  .two-col { grid-template-columns: 1fr 1fr; }
  .three-col { grid-template-columns: repeat(3, 1fr); }
  @media (max-width: 900px) {
    .kpis { grid-template-columns: repeat(2, 1fr); }
    .two-col, .three-col { grid-template-columns: 1fr; }
  }

  .kpi-label { font-size: 11px; text-transform: uppercase; color: var(--ink-faint);
    letter-spacing: .08em; font-weight: 600; }
  .kpi-value { font-size: 28px; font-weight: 600; margin-top: 8px; letter-spacing: -.01em; }
  .kpi-sub { margin-top: 6px; font-size: 12px; color: var(--ink-soft); }

  .chart-wrap { position: relative; height: 280px; margin-top: 8px; }
  .chart-wrap.short { height: 230px; }

  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { text-align: left; font-weight: 600; color: var(--ink-faint); font-size: 11px;
    text-transform: uppercase; letter-spacing: .06em; padding: 10px 12px; border-bottom: 1px solid var(--line); }
  td { padding: 10px 12px; border-bottom: 1px solid var(--line-soft); vertical-align: top; }
  td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; }
  td.center, th.center { text-align: center; }
  tr:last-child td { border-bottom: none; }
  tr:hover td { background: #fbf9f4; }

  .pill { display: inline-block; font-size: 11px; padding: 3px 9px; border-radius: 999px;
    background: var(--accent-soft); color: var(--accent); font-weight: 500; margin: 1px; }
  .pill.bad { background: #f4dad6; color: var(--bad); }
  .pill.warn { background: #f5e7c5; color: var(--warn); }
  .pill.good { background: #d6ecda; color: var(--good); }
  .pill.info { background: #d8e4f0; color: var(--info); }
  .pill.muted { background: #ece8e0; color: var(--ink-soft); }

  .badge { display: inline-block; font-size: 11px; padding: 3px 8px; border-radius: 6px;
    background: #e8eef2; color: var(--info); font-weight: 500; }

  .loading { text-align: center; padding: 80px 20px; color: var(--ink-faint); }
  .err { color: var(--bad); padding: 16px; background: #fbf2ef; border-radius: 10px; }

  .legend { display: flex; flex-wrap: wrap; gap: 14px; margin-top: 12px; font-size: 12px; color: var(--ink-soft); }
  .legend span { display: inline-flex; align-items: center; gap: 6px; }
  .legend .dot { width: 10px; height: 10px; border-radius: 50%; }

  .opportunity-cell { font-size: 12px; color: var(--ink-soft); }
  .opportunity-cell .what { color: var(--ink); font-weight: 500; }

  footer { margin-top: 40px; padding-top: 18px; border-top: 1px solid var(--line);
    color: var(--ink-faint); font-size: 11px; text-align: center; }

  .toggle-row { display: flex; gap: 6px; margin-bottom: 12px; }
  .toggle-row button { background: var(--card); border: 1px solid var(--line); padding: 6px 12px;
    font-size: 12px; border-radius: 8px; cursor: pointer; color: var(--ink-soft); }
  .toggle-row button.active { background: var(--accent); color: white; border-color: var(--accent); }
</style>
</head>
<body>
<div class="wrap">

  <header>
    <div class="h-left">
      <div class="eyebrow">TAS Digital · Team Dashboard</div>
      <h1>Agency Performance</h1>
      <div class="sub">Live view of clients, retention, churn, services and team workload. Refreshes every 10 minutes.</div>
    </div>
    <div class="h-right">
      <span class="ts" id="ts">Loading…</span>
      <button class="refresh" id="refresh-btn" onclick="loadData(true)">↻ Refresh</button>
    </div>
  </header>

  <div id="root"><div class="loading">Loading live data from Airtable…</div></div>

  <footer>
    Built for the TAS Digital team · Data sourced from the Clients Management Interface base ·
    Refresh button forces a re-fetch (otherwise cached at the edge for 10 minutes).
  </footer>
</div>

<script>
const COLORS = {
  primary: "#2f6e63", primarySoft: "#9bc6bf", warm: "#c98a3f", warmSoft: "#e6c89c",
  blue: "#3b6ea5", rose: "#b3486a", good: "#2f7d3d", bad: "#b3382c", warn: "#b8841a",
};
const PALETTE = ["#2f6e63","#3b6ea5","#c98a3f","#b3486a","#5e7d8a","#7a5b8e","#8a7242","#487a5d","#a05a4a","#4f6f99","#9b8048","#6b8e7e"];

let DATA = null;
let CHARTS = [];

function destroyCharts() {
  CHARTS.forEach((c) => { try { c.destroy(); } catch (_) {} });
  CHARTS = [];
}

async function loadData(force = false) {
  const btn = document.getElementById("refresh-btn");
  btn.disabled = true;
  document.getElementById("ts").textContent = force ? "Refreshing…" : "Loading…";
  try {
    const url = force ? "/api/data?refresh=1" : "/api/data";
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || \`HTTP \${res.status}\`);
    }
    DATA = await res.json();
    destroyCharts();
    render(DATA);
    const ts = new Date(DATA.generatedAt);
    document.getElementById("ts").textContent = \`Updated \${ts.toLocaleString()}\`;
  } catch (e) {
    document.getElementById("root").innerHTML =
      \`<div class="card err">Could not load data: \${e.message}.<br><br>
       Make sure the AIRTABLE_PAT environment variable is set in your Cloudflare Pages project settings.</div>\`;
    document.getElementById("ts").textContent = "Error";
  } finally {
    btn.disabled = false;
  }
}

// === Helpers ===
function countBy(items, keyFn) {
  const m = new Map();
  for (const it of items) {
    const ks = keyFn(it);
    const list = Array.isArray(ks) ? ks : [ks];
    for (const k of list) {
      if (k == null || k === "") continue;
      m.set(k, (m.get(k) || 0) + 1);
    }
  }
  return Array.from(m.entries()).map(([key, value]) => ({ key, value }));
}
function sortDesc(arr) { return [...arr].sort((a, b) => b.value - a.value); }
function maxRetention(c) {
  const vals = [c.retention.meta, c.retention.cs, c.retention.email, c.retention.tiktok].filter((v) => v != null);
  return vals.length ? Math.max(...vals) : null;
}
function temperaturePill(t) {
  if (!t || !t.length) return '<span class="pill muted">—</span>';
  const v = t[0];
  if (v === "Doing Great") return '<span class="pill good">' + v + '</span>';
  if (v === "Good") return '<span class="pill">' + v + '</span>';
  if (v === "Not so good") return '<span class="pill warn">' + v + '</span>';
  if (v === "Bad") return '<span class="pill bad">' + v + '</span>';
  return '<span class="pill muted">' + v + '</span>';
}
function phasePill(p) {
  if (!p) return '<span class="pill muted">—</span>';
  if (p.startsWith("Scaling")) return '<span class="pill good">Scaling</span>';
  if (p.startsWith("Testing")) return '<span class="pill warn">Testing</span>';
  return '<span class="pill muted">' + p.split(" ")[0] + '</span>';
}

// === Render ===
function render(data) {
  const root = document.getElementById("root");
  const clients = data.clients || [];
  const churn = data.churn || [];

  // ============ KPIs ============
  const scaling = clients.filter((c) => c.phase && c.phase.startsWith("Scaling")).length;
  const testing = clients.filter((c) => c.phase && c.phase.startsWith("Testing")).length;
  const onHold = clients.filter((c) => c.onHold).length;
  const doingGreat = clients.filter((c) => c.temperature && c.temperature[0] === "Doing Great").length;
  const notSoGood = clients.filter((c) => c.temperature && (c.temperature[0] === "Not so good" || c.temperature[0] === "Bad")).length;
  const avgRetention = (() => {
    const vs = clients.map(maxRetention).filter((v) => v != null);
    return vs.length ? (vs.reduce((s, x) => s + x, 0) / vs.length).toFixed(1) : "—";
  })();
  const churnYTD = churn.filter((c) => c.addedAt && c.addedAt.startsWith(String(new Date().getFullYear()))).length;

  // ============ Retention/churn slices ============
  const churnReasons = sortDesc(countBy(churn, (c) => c.primaryReason || "Not specified"));
  const churnByService = sortDesc(countBy(churn, (c) => c.services));
  const churnWho = sortDesc(countBy(churn, (c) => c.whoResponsible || "Not specified"));

  // Churn by month — last 12 months
  const churnByMonthMap = new Map();
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const k = d.toISOString().slice(0, 7);
    churnByMonthMap.set(k, 0);
  }
  churn.forEach((c) => {
    const k = c.addedAt && c.addedAt.slice(0, 7);
    if (k && churnByMonthMap.has(k)) churnByMonthMap.set(k, churnByMonthMap.get(k) + 1);
  });

  // ============ Service mix ============
  const serviceCounts = sortDesc(countBy(clients, (c) => c.services));
  // Upsell opportunities: which services have biggest gap = (active clients) − (clients buying it)
  const totalActive = clients.length;
  const opportunities = serviceCounts
    .filter((s) => totalActive - s.value >= 3)
    .map((s) => ({ ...s, missing: totalActive - s.value }));

  // Cross-sell candidates: clients who buy CS but NOT Meta Ads
  const csButNoMeta = clients.filter((c) =>
    c.services.includes("Creative Strategy") &&
    !c.services.some((s) => s.includes("Meta"))
  );
  const csButNoEmail = clients.filter((c) =>
    c.services.includes("Creative Strategy") &&
    !c.services.some((s) => s.includes("Email"))
  );

  // ============ Team workload ============
  function workloadFor(roleKey) {
    const m = new Map();
    clients.forEach((c) => {
      (c.team[roleKey] || []).forEach((name) => {
        if (!m.has(name)) m.set(name, []);
        m.get(name).push(c.brand);
      });
    });
    return Array.from(m.entries())
      .map(([name, brands]) => ({ name, count: brands.length, brands }))
      .sort((a, b) => b.count - a.count);
  }
  const wl = {
    adsCsm: workloadFor("adsCsm"),
    emailCsm: workloadFor("emailCsm"),
    creative: workloadFor("creative"),
    metaMgr: workloadFor("metaMgr"),
    googleMgr: workloadFor("googleMgr"),
    designer: workloadFor("designer"),
    videoEditor: workloadFor("videoEditor"),
  };

  // ============ HTML ============
  root.innerHTML = \`

    <!-- KPIs -->
    <div class="grid kpis">
      <div class="card">
        <div class="kpi-label">Active Clients</div>
        <div class="kpi-value">\${clients.length}</div>
        <div class="kpi-sub">\${scaling} scaling · \${testing} testing · \${onHold} on hold</div>
      </div>
      <div class="card">
        <div class="kpi-label">Client Health</div>
        <div class="kpi-value">\${doingGreat}</div>
        <div class="kpi-sub">doing great · <span style="color: var(--bad);">\${notSoGood} not so good / bad</span></div>
      </div>
      <div class="card">
        <div class="kpi-label">Avg. Retention (max service / client)</div>
        <div class="kpi-value">\${avgRetention} mo</div>
        <div class="kpi-sub">longest single-service tenure averaged across active clients</div>
      </div>
      <div class="card">
        <div class="kpi-label">Churns this year</div>
        <div class="kpi-value">\${churnYTD}</div>
        <div class="kpi-sub">\${churn.length} total historical churns</div>
      </div>
    </div>

    <!-- ============================ -->
    <!-- 1. CLIENT ROSTER -->
    <!-- ============================ -->
    <div class="section">
      <h2>1 · Active Client Roster</h2>
      <div class="card" style="padding: 0; overflow: auto;">
        <table>
          <thead>
            <tr>
              <th>Brand</th>
              <th>Phase</th>
              <th>Services</th>
              <th class="num">Max retention (mo)</th>
              <th>Health</th>
              <th>Results</th>
              <th>Niche</th>
              <th class="center">Signed</th>
            </tr>
          </thead>
          <tbody>
            \${[...clients].sort((a, b) => (maxRetention(b) || 0) - (maxRetention(a) || 0)).map((c) => \`
              <tr>
                <td><b>\${c.brand}</b>\${c.onHold ? ' <span class="pill warn">On Hold</span>' : ''}</td>
                <td>\${phasePill(c.phase)}</td>
                <td>\${c.services.map((s) => \`<span class="pill muted">\${s}</span>\`).join("")}</td>
                <td class="num">\${maxRetention(c) ?? "—"}</td>
                <td>\${temperaturePill(c.temperature)}</td>
                <td>\${(c.results || []).map((r) => \`<span class="pill \${r === "Doing Great" ? "good" : r === "Good" ? "" : r === "Not so good" ? "warn" : "muted"}">\${r}</span>\`).join("")}</td>
                <td>\${c.niche || "—"}</td>
                <td class="center">\${c.signed ? "✓" : ""}</td>
              </tr>
            \`).join("")}
          </tbody>
        </table>
      </div>
    </div>

    <!-- ============================ -->
    <!-- 2. RETENTION & CHURN -->
    <!-- ============================ -->
    <div class="section">
      <h2>2 · Retention &amp; Churn</h2>

      <div class="grid two-col">
        <div class="card">
          <div class="kpi-label">Top Churn Reasons (all-time)</div>
          <div class="chart-wrap"><canvas id="ch-reason"></canvas></div>
        </div>
        <div class="card">
          <div class="kpi-label">Churn by Service (all-time)</div>
          <div class="chart-wrap"><canvas id="ch-svc"></canvas></div>
        </div>
      </div>

      <div class="grid two-col" style="margin-top: 16px;">
        <div class="card">
          <div class="kpi-label">Monthly Churn — Last 12 Months</div>
          <div class="chart-wrap short"><canvas id="ch-month"></canvas></div>
        </div>
        <div class="card">
          <div class="kpi-label">Who Was Responsible</div>
          <table style="margin-top: 8px;">
            <thead><tr><th>Owner</th><th class="num">Churns</th><th class="num">Share</th></tr></thead>
            <tbody>
              \${(() => {
                const tot = churnWho.reduce((s, x) => s + x.value, 0) || 1;
                return churnWho.map((w) => \`
                  <tr><td>\${w.key}</td><td class="num">\${w.value}</td><td class="num">\${Math.round(w.value / tot * 100)}%</td></tr>
                \`).join("");
              })()}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- ============================ -->
    <!-- 3. SERVICE MIX & CROSS-SELL -->
    <!-- ============================ -->
    <div class="section">
      <h2>3 · Service Mix &amp; Cross-Sell Opportunities</h2>

      <div class="grid two-col">
        <div class="card">
          <div class="kpi-label">Service Penetration · Active Clients</div>
          <div class="chart-wrap"><canvas id="svc-pen"></canvas></div>
        </div>
        <div class="card">
          <div class="kpi-label">Cross-Sell Map</div>
          <table style="margin-top: 8px;">
            <thead>
              <tr><th>Pattern</th><th class="num">Clients</th><th>Why it matters</th></tr>
            </thead>
            <tbody>
              <tr>
                <td><b>Creative Strategy but no Meta Ads</b></td>
                <td class="num">\${csButNoMeta.length}</td>
                <td class="opportunity-cell"><span class="what">Strongest upsell:</span> they already trust us with creative — Meta Ads is the natural next step.</td>
              </tr>
              <tr>
                <td><b>Creative Strategy but no Email</b></td>
                <td class="num">\${csButNoEmail.length}</td>
                <td class="opportunity-cell"><span class="what">Email Marketing add-on</span> — once the brand is producing creative, email needs to recycle that content.</td>
              </tr>
              \${opportunities.slice(0, 5).map((o) => \`
                <tr>
                  <td>\${o.key}</td>
                  <td class="num">\${o.value}/\${totalActive}</td>
                  <td class="opportunity-cell">\${o.missing} active clients don't have this service yet.</td>
                </tr>
              \`).join("")}
            </tbody>
          </table>
        </div>
      </div>

      \${csButNoMeta.length > 0 ? \`
      <div class="card" style="margin-top: 16px;">
        <div class="kpi-label">Cross-Sell Targets · Creative Strategy clients without Meta Ads</div>
        <table style="margin-top: 8px;">
          <thead><tr><th>Brand</th><th>Phase</th><th>Current Services</th><th>Health</th></tr></thead>
          <tbody>
            \${csButNoMeta.map((c) => \`
              <tr>
                <td><b>\${c.brand}</b></td>
                <td>\${phasePill(c.phase)}</td>
                <td>\${c.services.map((s) => \`<span class="pill muted">\${s}</span>\`).join("")}</td>
                <td>\${temperaturePill(c.temperature)}</td>
              </tr>
            \`).join("")}
          </tbody>
        </table>
      </div>
      \` : ""}
    </div>

    <!-- ============================ -->
    <!-- 4. TEAM WORKLOAD -->
    <!-- ============================ -->
    <div class="section">
      <h2>4 · Team Workload (active clients per person)</h2>

      <div class="grid three-col">
        \${[
          ["Advertising CSMs", wl.adsCsm],
          ["Creative Strategists", wl.creative],
          ["Meta Campaign Managers", wl.metaMgr],
          ["Email CSMs", wl.emailCsm],
          ["Google Campaign Managers", wl.googleMgr],
          ["Designers", wl.designer],
          ["Video Editors", wl.videoEditor],
        ].filter(([_, arr]) => arr.length > 0).map(([title, arr]) => \`
          <div class="card">
            <div class="kpi-label">\${title}</div>
            <table style="margin-top: 8px;">
              <thead><tr><th>Person</th><th class="num">Active</th></tr></thead>
              <tbody>
                \${arr.map((p) => \`
                  <tr>
                    <td title="\${p.brands.join(", ")}">\${p.name}</td>
                    <td class="num">\${p.count}</td>
                  </tr>
                \`).join("")}
              </tbody>
            </table>
          </div>
        \`).join("")}
      </div>
    </div>

  \`;

  // Charts (deferred to next tick so DOM exists)
  setTimeout(() => {
    hbar("ch-reason", churnReasons.map((x) => x.key), churnReasons.map((x) => x.value), COLORS.bad);
    hbar("ch-svc", churnByService.map((x) => x.key), churnByService.map((x) => x.value), COLORS.rose);
    hbar("svc-pen", serviceCounts.map((x) => x.key), serviceCounts.map((x) => x.value), COLORS.primary);
    monthBar("ch-month", Array.from(churnByMonthMap.keys()), Array.from(churnByMonthMap.values()));
  }, 0);
}

function hbar(id, labels, data, color) {
  const ctx = document.getElementById(id);
  if (!ctx) return;
  const chart = new Chart(ctx, {
    type: "bar",
    data: { labels, datasets: [{ data, backgroundColor: color, borderRadius: 4 }] },
    options: {
      indexAxis: "y", responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { font: { size: 11 }, stepSize: 1 }, grid: { color: "#eee" } },
        y: { ticks: { font: { size: 11 } }, grid: { display: false } },
      },
    },
  });
  CHARTS.push(chart);
}

function monthBar(id, labels, data) {
  const ctx = document.getElementById(id);
  if (!ctx) return;
  const chart = new Chart(ctx, {
    type: "bar",
    data: { labels, datasets: [{ data, backgroundColor: COLORS.bad, borderRadius: 4 }] },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => \`\${c.parsed.y} churns\` } } },
      scales: {
        y: { ticks: { font: { size: 11 }, stepSize: 2 }, grid: { color: "#eee" } },
        x: { ticks: { font: { size: 10 } }, grid: { display: false } },
      },
    },
  });
  CHARTS.push(chart);
}

loadData();
</script>
</body>
</html>
`;

const PRIORITY_SIGNALS_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>TAS Digital — Priority Signals</title>
<style>
  :root {
    color-scheme: light;
    --brand-blue: #2821B5;
    --brand-blue-light: #E1E0F9;
    --brand-blue-dark: #181839;
    --brand-purple: #8321C8;
    --brand-purple-light: #F0E1FA;
    --brand-rose: #A63446;
    --brand-rose-light: #F6E3E6;
    --ink: #06060E;
    --ink-soft: #4A5263;
    --ink-faint: #8F8F8F;
    --line: #E3E3E3;
    --line-soft: #F1F1F1;
    --bg: #FAFAFA;
    --card: #FFFFFF;
    --shadow: 0 1px 3px rgba(6,6,14,.04), 0 4px 16px rgba(6,6,14,.05);
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: var(--bg); color: var(--ink);
    font-family: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", system-ui, sans-serif;
    font-size: 14px; line-height: 1.55; }
  .wrap { max-width: 980px; margin: 0 auto; padding: 28px 24px 60px; }
  nav.topbar { display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 28px; padding-bottom: 16px; border-bottom: 1px solid var(--line); }
  .brand-mark { display: flex; align-items: center; gap: 10px; text-decoration: none; }
  .brand-mark .logo { height: 30px; width: auto; display: block; flex-shrink: 0; pointer-events: none; }
  .brand-mark .label { font-size: 11px; font-weight: 600; letter-spacing: .14em;
    text-transform: uppercase; color: var(--brand-blue); }
  .crumb { display: flex; gap: 8px; align-items: center; color: var(--ink-soft); font-size: 13px; margin-top: 4px; }
  .crumb a { color: var(--brand-blue); text-decoration: none; font-weight: 500; cursor: pointer; }
  .crumb a:hover { text-decoration: underline; }
  .crumb .sep { color: var(--ink-faint); }
  .topbar-right { display: flex; gap: 10px; align-items: center; }
  .topbar-right .ts { font-size: 11px; color: var(--ink-faint); font-variant-numeric: tabular-nums; }
  .side-link { font-size: 12px; font-weight: 600; color: var(--brand-blue); text-decoration: none; }
  .side-link:hover { text-decoration: underline; }
  button.refresh { background: var(--brand-blue); color: white; border: none;
    padding: 8px 14px; border-radius: 8px; font-size: 12px; font-weight: 600;
    cursor: pointer; transition: all .15s ease; letter-spacing: .02em; }
  button.refresh:hover { background: var(--brand-blue-dark); }
  button.refresh:disabled { opacity: 0.5; cursor: wait; }
  h1 { font-size: 24px; font-weight: 700; margin: 0 0 4px; letter-spacing: -.02em; }
  .sub { color: var(--ink-soft); font-size: 13px; margin-bottom: 22px; }

  .filters { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 20px; }
  .filters select, .filters input[type="text"] {
    border: 1px solid var(--line); border-radius: 8px; padding: 7px 10px; font-size: 13px;
    background: var(--card); color: var(--ink); font-family: inherit;
  }
  .filters input[type="text"] { flex: 1; min-width: 160px; }
  label.chk { display: flex; align-items: center; gap: 6px; font-size: 13px; color: var(--ink-soft); }

  .signal-card { background: var(--card); border: 1px solid var(--line); border-radius: 12px;
    padding: 16px 18px; margin-bottom: 12px; box-shadow: var(--shadow); position: relative; }
  .signal-card.is-reviewed { opacity: 0.55; }
  .signal-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 8px; }
  .signal-summary { font-size: 14.5px; font-weight: 600; color: var(--ink); margin: 0; flex: 1; }
  .badges { display: flex; gap: 6px; flex-shrink: 0; flex-wrap: wrap; justify-content: flex-end; }
  .badge { font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em;
    padding: 3px 8px; border-radius: 6px; white-space: nowrap; }
  .badge-Prioritization-Request { background: #FCE9D9; color: #A85D1B; }
  .badge-Creative-Issue { background: var(--brand-rose-light); color: var(--brand-rose); }
  .badge-PM-Note { background: var(--line-soft); color: var(--ink-soft); }
  .badge-source { background: var(--brand-blue-light); color: var(--brand-blue); }
  .signal-meta { display: flex; flex-wrap: wrap; gap: 4px 14px; font-size: 12px; color: var(--ink-soft); margin-bottom: 8px; }
  .signal-meta b { color: var(--ink); font-weight: 600; }
  .signal-quote { font-size: 12.5px; color: var(--ink-soft); font-style: italic; border-left: 2px solid var(--line);
    padding-left: 10px; margin: 8px 0; }
  .signal-bottom { display: flex; justify-content: space-between; align-items: center; margin-top: 8px; }
  .signal-bottom a { font-size: 12px; color: var(--brand-blue); text-decoration: none; font-weight: 500; }
  .signal-bottom a:hover { text-decoration: underline; }
  .review-toggle { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--ink-soft); cursor: pointer; }

  .empty, .loading { text-align: center; color: var(--ink-faint); padding: 60px 20px; font-size: 13px; }
  .count-line { font-size: 12px; color: var(--ink-faint); margin-bottom: 14px; }
  footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid var(--line);
    color: var(--ink-faint); font-size: 11px; text-align: center; text-transform: uppercase; letter-spacing: .08em; }
</style>
</head>
<body>
<div class="wrap">
  <nav class="topbar">
    <div>
      <div class="brand-mark">
        <svg class="logo" viewBox="0 0 470 100" xmlns="http://www.w3.org/2000/svg" aria-label="TAS Digital" role="img">
          <defs>
            <linearGradient id="tasG" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="#2821B5"/>
              <stop offset="100%" stop-color="#8321C8"/>
            </linearGradient>
          </defs>
          <g fill="none" stroke="url(#tasG)">
            <circle cx="50" cy="50" r="44" stroke-width="6"/>
            <circle cx="50" cy="50" r="30" stroke-width="5"/>
            <ellipse cx="50" cy="50" rx="12" ry="18" stroke-width="4"/>
          </g>
          <text x="120" y="65" font-family="-apple-system,BlinkMacSystemFont,'Inter','Segoe UI',system-ui,sans-serif" font-size="42" font-weight="300" letter-spacing="6" fill="url(#tasG)">TAS DIGITAL</text>
        </svg>
        <span class="label">· Priority Signals</span>
      </div>
      <div class="crumb">
        <a href="/">Home</a>
        <span class="sep">·</span>
        <a href="/">Creative Pipeline</a>
      </div>
    </div>
    <div class="topbar-right">
      <a class="side-link" href="/active-clients">Active Clients</a>
      <span class="ts" id="ts">Loading…</span>
      <button class="refresh" id="refresh-btn" onclick="loadData(true)">↻ Refresh</button>
    </div>
  </nav>

  <h1>Priority Signals</h1>
  <div class="sub">Daily-scanned prioritization requests, creative issues, and PM notes pulled from Slack + Fathom meetings — so CSMs can see when a competing priority got set and push back if needed.</div>

  <div class="filters">
    <input type="text" id="search" placeholder="Search client, summary, or person…" oninput="render()" />
    <select id="filterType" onchange="render()">
      <option value="">All types</option>
      <option value="Prioritization Request">Prioritization Request</option>
      <option value="Creative Issue">Creative Issue</option>
      <option value="PM Note">PM Note</option>
    </select>
    <select id="filterSource" onchange="render()">
      <option value="">All sources</option>
      <option value="Fathom">Fathom</option>
      <option value="Slack">Slack</option>
    </select>
    <label class="chk"><input type="checkbox" id="hideReviewed" checked onchange="render()" /> Hide reviewed</label>
  </div>

  <div id="root"><div class="loading">Loading…</div></div>

  <footer>Populated daily by n8n from Fathom (admin) + Slack · Tick "Reviewed" once handled</footer>
</div>
<script>
let ALL = [];

async function loadData(force) {
  const btn = document.getElementById('refresh-btn');
  btn.disabled = true;
  btn.textContent = '↻ Loading…';
  try {
    const res = await fetch('/priority-signals/api' + (force ? '?refresh=1' : ''));
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    ALL = data.signals || [];
    document.getElementById('ts').textContent = 'Updated ' + new Date(data.generatedAt).toLocaleString();
    render();
  } catch (e) {
    document.getElementById('root').innerHTML = '<div class="empty">Failed to load: ' + (e.message || e) + '</div>';
  } finally {
    btn.disabled = false;
    btn.textContent = '↻ Refresh';
  }
}

function badgeClass(type) {
  return 'badge badge-' + String(type || '').replace(/[^A-Za-z]/g, '-');
}

function render() {
  const q = (document.getElementById('search').value || '').toLowerCase().trim();
  const typeFilter = document.getElementById('filterType').value;
  const sourceFilter = document.getElementById('filterSource').value;
  const hideReviewed = document.getElementById('hideReviewed').checked;

  let rows = ALL.filter(s => {
    if (hideReviewed && s.reviewed) return false;
    if (typeFilter && s.signalType !== typeFilter) return false;
    if (sourceFilter && s.source !== sourceFilter) return false;
    if (q) {
      const hay = [s.summary, s.client, s.whoSaidIt, s.regarding, s.quote].filter(Boolean).join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const root = document.getElementById('root');
  if (rows.length === 0) {
    root.innerHTML = '<div class="empty">No signals match these filters.</div>';
    return;
  }

  root.innerHTML = '<div class="count-line">' + rows.length + ' of ' + ALL.length + ' signals</div>' +
    rows.map(s => {
      const dateStr = s.date ? new Date(s.date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '';
      return '<div class="signal-card' + (s.reviewed ? ' is-reviewed' : '') + '" data-id="' + s.id + '">' +
        '<div class="signal-top">' +
          '<p class="signal-summary">' + esc(s.summary) + '</p>' +
          '<div class="badges">' +
            '<span class="badge ' + badgeClass(s.signalType) + '">' + esc(s.signalType || '') + '</span>' +
            '<span class="badge badge-source">' + esc(s.source || '') + '</span>' +
          '</div>' +
        '</div>' +
        '<div class="signal-meta">' +
          (s.client ? '<span><b>' + esc(s.client) + '</b></span>' : '') +
          (s.whoSaidIt ? '<span>' + esc(s.whoSaidIt) + (s.regarding ? ' → ' + esc(s.regarding) : '') + '</span>' : '') +
          (dateStr ? '<span>' + dateStr + '</span>' : '') +
        '</div>' +
        (s.quote ? '<div class="signal-quote">"' + esc(s.quote) + '"</div>' : '') +
        '<div class="signal-bottom">' +
          (s.sourceLink ? '<a href="' + esc(s.sourceLink) + '" target="_blank" rel="noopener">Open source ↗</a>' : '<span></span>') +
          '<label class="review-toggle"><input type="checkbox" ' + (s.reviewed ? 'checked' : '') + ' onchange="toggleReviewed(\\'' + s.id + '\\', this.checked)" /> Reviewed</label>' +
        '</div>' +
      '</div>';
    }).join('');
}

async function toggleReviewed(id, reviewed) {
  const item = ALL.find(s => s.id === id);
  if (item) item.reviewed = reviewed;
  render();
  try {
    await fetch('/priority-signals/api/review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, reviewed }),
    });
  } catch (e) {
    console.error('Failed to save reviewed state', e);
  }
}

function esc(str) {
  return String(str || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

loadData(false);
</script>
</body>
</html>
`;

const ACTIVE_CLIENTS_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>TAS Digital — Active Clients</title>
<style>
  :root {
    color-scheme: light;
    --brand-blue: #2821B5;
    --brand-blue-light: #E1E0F9;
    --brand-blue-dark: #181839;
    --brand-purple: #8321C8;
    --brand-purple-light: #F0E1FA;
    --brand-rose: #A63446;
    --brand-rose-light: #F6E3E6;
    --ink: #06060E;
    --ink-soft: #4A5263;
    --ink-faint: #8F8F8F;
    --line: #E3E3E3;
    --line-soft: #F1F1F1;
    --bg: #FAFAFA;
    --card: #FFFFFF;
    --shadow: 0 1px 3px rgba(6,6,14,.04), 0 4px 16px rgba(6,6,14,.05);
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: var(--bg); color: var(--ink);
    font-family: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", system-ui, sans-serif;
    font-size: 14px; line-height: 1.55; }
  .wrap { max-width: 1080px; margin: 0 auto; padding: 28px 24px 60px; }
  nav.topbar { display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 28px; padding-bottom: 16px; border-bottom: 1px solid var(--line); }
  .brand-mark { display: flex; align-items: center; gap: 10px; text-decoration: none; }
  .brand-mark .logo { height: 30px; width: auto; display: block; flex-shrink: 0; pointer-events: none; }
  .brand-mark .label { font-size: 11px; font-weight: 600; letter-spacing: .14em;
    text-transform: uppercase; color: var(--brand-blue); }
  .crumb { display: flex; gap: 8px; align-items: center; color: var(--ink-soft); font-size: 13px; margin-top: 4px; }
  .crumb a { color: var(--brand-blue); text-decoration: none; font-weight: 500; cursor: pointer; }
  .crumb a:hover { text-decoration: underline; }
  .crumb .sep { color: var(--ink-faint); }
  .topbar-right { display: flex; gap: 10px; align-items: center; }
  .topbar-right .ts { font-size: 11px; color: var(--ink-faint); font-variant-numeric: tabular-nums; }
  button.refresh { background: var(--brand-blue); color: white; border: none;
    padding: 8px 14px; border-radius: 8px; font-size: 12px; font-weight: 600;
    cursor: pointer; transition: all .15s ease; letter-spacing: .02em; }
  button.refresh:hover { background: var(--brand-blue-dark); }
  button.refresh:disabled { opacity: 0.5; cursor: wait; }
  h1 { font-size: 24px; font-weight: 700; margin: 0 0 4px; letter-spacing: -.02em; }
  .sub { color: var(--ink-soft); font-size: 13px; margin-bottom: 22px; }

  .stats-row { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 20px; }
  .stat { background: var(--card); border: 1px solid var(--line); border-radius: 10px;
    padding: 12px 16px; min-width: 120px; box-shadow: var(--shadow); }
  .stat .num { font-size: 22px; font-weight: 700; color: var(--ink); }
  .stat .lbl { font-size: 11px; color: var(--ink-faint); text-transform: uppercase; letter-spacing: .05em; margin-top: 2px; }
  .stat.warn .num { color: var(--brand-rose); }

  .attention-box { background: var(--brand-rose-light); border: 1px solid var(--brand-rose);
    border-radius: 10px; padding: 14px 16px; margin-bottom: 24px; }
  .attention-box h3 { margin: 0 0 8px; font-size: 13px; color: var(--brand-rose); font-weight: 700; }
  .attention-box ul { margin: 0; padding-left: 18px; font-size: 13px; color: var(--ink); }
  .attention-box li { margin-bottom: 3px; }

  .filters { display: flex; gap: 10px; margin-bottom: 16px; }
  .filters input[type="text"] { flex: 1; border: 1px solid var(--line); border-radius: 8px;
    padding: 7px 10px; font-size: 13px; font-family: inherit; background: var(--card); color: var(--ink); }

  .group-title { font-size: 15px; font-weight: 700; margin: 26px 0 10px; display: flex; align-items: baseline; gap: 8px; }
  .group-count { font-size: 12px; color: var(--ink-faint); font-weight: 500; }

  table.roster { width: 100%; border-collapse: collapse; background: var(--card);
    border: 1px solid var(--line); border-radius: 10px; overflow: hidden; box-shadow: var(--shadow); }
  table.roster th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: .04em;
    color: var(--ink-faint); padding: 10px 12px; border-bottom: 1px solid var(--line); background: var(--line-soft); }
  table.roster td { padding: 10px 12px; border-bottom: 1px solid var(--line-soft); font-size: 13px; vertical-align: middle; }
  table.roster tr:last-child td { border-bottom: none; }
  table.roster tr.is-attention { background: var(--brand-rose-light); }
  .pill { display: inline-block; font-size: 11px; font-weight: 600; padding: 3px 8px; border-radius: 6px; white-space: nowrap; }
  .pill-ok { background: #DFF3E3; color: #1E7A34; }
  .pill-warn { background: var(--brand-rose-light); color: var(--brand-rose); }
  .pill-hold { background: var(--line-soft); color: var(--ink-soft); margin-left: 6px; }
  .pill-count { background: var(--brand-blue-light); color: var(--brand-blue); }
  .muted { color: var(--ink-faint); }
  .untracked-list { font-size: 13px; color: var(--ink-soft); line-height: 1.9; background: var(--card);
    border: 1px solid var(--line); border-radius: 10px; padding: 12px 16px; }

  .empty, .loading { text-align: center; color: var(--ink-faint); padding: 40px 20px; font-size: 13px; }
  footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid var(--line);
    color: var(--ink-faint); font-size: 11px; text-align: center; text-transform: uppercase; letter-spacing: .08em; }
</style>
</head>
<body>
<div class="wrap">
  <nav class="topbar">
    <div>
      <div class="brand-mark">
        <svg class="logo" viewBox="0 0 470 100" xmlns="http://www.w3.org/2000/svg" aria-label="TAS Digital" role="img">
          <defs>
            <linearGradient id="tasG" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="#2821B5"/>
              <stop offset="100%" stop-color="#8321C8"/>
            </linearGradient>
          </defs>
          <g fill="none" stroke="url(#tasG)">
            <circle cx="50" cy="50" r="44" stroke-width="6"/>
            <circle cx="50" cy="50" r="30" stroke-width="5"/>
            <ellipse cx="50" cy="50" rx="12" ry="18" stroke-width="4"/>
          </g>
          <text x="120" y="65" font-family="-apple-system,BlinkMacSystemFont,'Inter','Segoe UI',system-ui,sans-serif" font-size="42" font-weight="300" letter-spacing="6" fill="url(#tasG)">TAS DIGITAL</text>
        </svg>
        <span class="label">· Active Clients</span>
      </div>
      <div class="crumb">
        <a href="/">Home</a>
        <span class="sep">·</span>
        <a href="/priority-signals">Priority Signals</a>
      </div>
    </div>
    <div class="topbar-right">
      <span class="ts" id="ts">Loading…</span>
      <button class="refresh" id="refresh-btn" onclick="loadData(true)">↻ Refresh</button>
    </div>
  </nav>

  <h1>Active Clients</h1>
  <div class="sub">Every client marked Active in Airtable, cross-checked live against the creative pipeline — so a client missing its base link (like Santa Mood was) gets caught immediately instead of silently disappearing.</div>

  <div id="stats" class="stats-row"></div>
  <div id="attention"></div>

  <div class="filters">
    <input type="text" id="search" placeholder="Search brand…" oninput="render()" />
  </div>

  <div id="root"><div class="loading">Loading…</div></div>

  <footer>Live from the 👥 Clients table in Airtable · Base-link status + item counts pulled fresh from each client's own creative base</footer>
</div>
<script>
let ALL = [];

async function loadData(force) {
  const btn = document.getElementById('refresh-btn');
  btn.disabled = true;
  btn.textContent = '↻ Loading…';
  try {
    const res = await fetch('/active-clients/api' + (force ? '?refresh=1' : ''));
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    ALL = data.clients || [];
    document.getElementById('ts').textContent = 'Updated ' + new Date(data.generatedAt).toLocaleString();
    renderStats(data);
    render();
  } catch (e) {
    document.getElementById('root').innerHTML = '<div class="empty">Failed to load: ' + (e.message || e) + '</div>';
  } finally {
    btn.disabled = false;
    btn.textContent = '↻ Refresh';
  }
}

function stat(num, label, warn) {
  return '<div class="stat' + (warn ? ' warn' : '') + '"><div class="num">' + num + '</div><div class="lbl">' + label + '</div></div>';
}

function renderStats(data) {
  const adsCount = ALL.filter(c => c.adsManaged).length;
  const creativeOnly = ALL.filter(c => !c.adsManaged && (c.creativeStrategists || []).length > 0).length;
  document.getElementById('stats').innerHTML =
    stat(data.total, 'Active Clients') +
    stat(adsCount, 'Creative + Ads') +
    stat(creativeOnly, 'Creative Only') +
    stat(data.needsAttentionCount, 'Needs Attention', data.needsAttentionCount > 0);

  const attn = ALL.filter(c => c.needsAttention);
  const box = document.getElementById('attention');
  if (attn.length === 0) { box.innerHTML = ''; return; }
  box.innerHTML = '<div class="attention-box"><h3>⚠️ ' + attn.length +
    ' active client(s) have a Creative Strategist or media buyer assigned but no Creative Base ID linked — the same gap that hid Santa Mood from this dashboard</h3><ul>' +
    attn.map(c => '<li><b>' + esc(c.brand) + '</b> — ' + [...(c.creativeStrategists || []), ...(c.mediaBuyers || [])].map(esc).join(', ') + '</li>').join('') +
    '</ul></div>';
}

function baseStatusPill(c) {
  if (!c.hasBase) return '<span class="pill pill-warn">⚠ Missing base</span>';
  if (c.error) return '<span class="pill pill-warn" title="' + esc(c.error) + '">⚠ ' + esc(c.error) + '</span>';
  return '<span class="pill pill-ok">✓ Linked</span>';
}

function render() {
  const q = (document.getElementById('search').value || '').toLowerCase().trim();
  let rows = ALL.filter(c => !q || c.brand.toLowerCase().includes(q));

  const adsGroup = rows.filter(c => c.adsManaged);
  const creativeGroup = rows.filter(c => !c.adsManaged && (c.creativeStrategists || []).length > 0);

  const root = document.getElementById('root');
  if (rows.length === 0) { root.innerHTML = '<div class="empty">No clients match this search.</div>'; return; }

  root.innerHTML =
    section('🎯 Creative + Ads', adsGroup, true) +
    section('🎨 Creative Only', creativeGroup, false);
}

function section(title, rows, showBuyers) {
  if (rows.length === 0) return '';
  return '<div class="group-title">' + title + '<span class="group-count">(' + rows.length + ')</span></div>' +
    '<table class="roster"><thead><tr><th>Brand</th><th>Creative Strategist(s)</th>' +
    (showBuyers ? '<th>Media Buyer(s)</th>' : '') +
    '<th>Base Link</th><th>Pending Items</th>' +
    (showBuyers ? '<th>Ads to Launch</th>' : '') +
    '</tr></thead><tbody>' +
    rows.map(c => '<tr class="' + (c.needsAttention ? 'is-attention' : '') + '">' +
      '<td>' + esc(c.brand) + (c.onHold ? '<span class="pill pill-hold">On Hold</span>' : '') + '</td>' +
      '<td>' + esc((c.creativeStrategists || []).join(', ') || '—') + '</td>' +
      (showBuyers ? '<td>' + esc((c.mediaBuyers || []).join(', ') || '—') + '</td>' : '') +
      '<td>' + baseStatusPill(c) + '</td>' +
      '<td>' + (c.pendingCount != null ? '<span class="pill pill-count">' + c.pendingCount + '</span>' : '<span class="muted">—</span>') + '</td>' +
      (showBuyers ? '<td>' + (c.adsToLaunchCount != null ? '<span class="pill pill-count">' + c.adsToLaunchCount + '</span>' : '<span class="muted">—</span>') + '</td>' : '') +
    '</tr>').join('') +
    '</tbody></table>';
}

function esc(str) {
  return String(str || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

loadData(false);
</script>
</body>
</html>
`;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === "/api/data") {
      return handleData(request, env);
    }
    if (url.pathname === "/pipeline/api") {
      return handlePipeline(request, env);
    }
    if (url.pathname === "/pipeline/client/api") {
      return handleClientDetail(request, env);
    }
    if (url.pathname === "/pipeline/concepts/api") {
      return handleConceptsAggregate(request, env);
    }
    if (url.pathname === "/pipeline/ugc/api") {
      return handleUgcAggregate(request, env);
    }
    if (url.pathname === "/api/launch-digest") {
      return handleLaunchDigest(request, env);
    }
    if (url.pathname === "/priority-signals/api") {
      return handlePrioritySignals(request, env);
    }
    if (url.pathname === "/priority-signals/api/review") {
      return handleMarkSignalReviewed(request, env);
    }
    if (url.pathname === "/priority-signals") {
      return new Response(PRIORITY_SIGNALS_HTML, {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "public, max-age=300",
        },
      });
    }
    if (url.pathname === "/active-clients/api") {
      return handleActiveClients(request, env);
    }
    if (url.pathname === "/active-clients") {
      return new Response(ACTIVE_CLIENTS_HTML, {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "public, max-age=300",
        },
      });
    }
    // On the dedicated pipeline domain (pipeline.tas-digital.ai), the pipeline
    // IS the homepage — no /pipeline path needed. API calls above still use
    // absolute /pipeline/* paths, which work on any hostname.
    const isPipelineHost = url.hostname.startsWith("pipeline.");
    if (url.pathname === "/pipeline" || (isPipelineHost && url.pathname === "/")) {
      return new Response(PIPELINE_HTML, {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "public, max-age=300",
        },
      });
    }
    return new Response(HTML, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=300",
      },
    });
  },
};

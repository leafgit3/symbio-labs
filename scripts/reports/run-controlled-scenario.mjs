#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";

function parseArgs(argv) {
  const args = {
    baseUrl: process.env.SYMBIO_BASE_URL || "https://symbio-labs.vercel.app",
    label: "",
    cycles: 5,
    brief: "",
    briefFile: "",
    pauseMs: 1200,
    reset: true,
    outDir: "docs/reports/sessions",
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    const next = argv[i + 1];

    if (token === "--base-url" && next) {
      args.baseUrl = next;
      i += 1;
      continue;
    }

    if (token === "--label" && next) {
      args.label = next;
      i += 1;
      continue;
    }

    if (token === "--cycles" && next) {
      args.cycles = Number.parseInt(next, 10);
      i += 1;
      continue;
    }

    if (token === "--brief" && next) {
      args.brief = next;
      i += 1;
      continue;
    }

    if (token === "--brief-file" && next) {
      args.briefFile = next;
      i += 1;
      continue;
    }

    if (token === "--pause-ms" && next) {
      args.pauseMs = Number.parseInt(next, 10);
      i += 1;
      continue;
    }

    if (token === "--no-reset") {
      args.reset = false;
      continue;
    }

    if (token === "--out-dir" && next) {
      args.outDir = next;
      i += 1;
      continue;
    }
  }

  return args;
}

function requireArg(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function slugify(input) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function avg(values) {
  if (!values.length) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function round(value, digits = 2) {
  return Number(value.toFixed(digits));
}

function formatDelta(value) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}`;
}

function nowDate() {
  return new Date().toISOString().slice(0, 10);
}

function compact(text, maxLength = 340) {
  if (!text) {
    return "";
  }

  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= maxLength) {
    return clean;
  }

  return `${clean.slice(0, maxLength - 3)}...`;
}

function scenarioVerdict(aggregate) {
  const activePass = aggregate.activeEventRate >= 0.6;
  const forcedPass = aggregate.forcedSlotRate <= 0.2;
  const saliencePass = aggregate.meanSalienceStdDev > 0.03;
  const trustCollapseCount = aggregate.cyclesWithTrustCrash;
  const trustPass = trustCollapseCount < 2;

  const passCount = [activePass, forcedPass, saliencePass, trustPass].filter(Boolean).length;

  if (passCount === 4) {
    return { status: "holding", confidence: "medium", rationale: "All baseline gates passed." };
  }

  if (passCount >= 2) {
    return {
      status: "mixed",
      confidence: "medium",
      rationale: "Some gates passed but at least one structural stability condition regressed.",
    };
  }

  return {
    status: "failing",
    confidence: "medium",
    rationale: "Multiple core gates failed in this scenario run.",
  };
}

async function requestJson(baseUrl, route, init) {
  const response = await fetch(`${baseUrl}${route}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error(`Request failed ${response.status} ${route}: ${text.slice(0, 400)}`);
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Invalid JSON from ${route}: ${text.slice(0, 240)}`);
  }
}

function buildMarkdown(report) {
  const cycleBlocks = report.cycles
    .map((cycle) => {
      return [
        `## Cycle ${cycle.cycleNumber}`,
        `- World summary: ${cycle.worldSummary}`,
        `- Active events: ${cycle.activeEventsCount}${cycle.activeEventsCount ? ` (${cycle.activeEvents.join("; ")})` : ""}`,
        `- Organic stances (e/c/m): ${cycle.organic.escalate}/${cycle.organic.contain}/${cycle.organic.monitor}`,
        `- Effective stances (e/c/m): ${cycle.effective.escalate}/${cycle.effective.contain}/${cycle.effective.monitor}`,
        `- Forced slots: ${cycle.forcedSlotsCount}`,
        `- Contradiction: ${Math.round(cycle.contradictionScore * 100)}%`,
        `- Salience avg/std: ${cycle.salienceAvg.toFixed(2)} / ${cycle.salienceStdDev.toFixed(2)}`,
        `- Role drift mean/max: ${Math.round(cycle.roleDriftMeanOverlap * 100)}% / ${Math.round(cycle.roleDriftMaxOverlap * 100)}%`,
        `- Role drift high pairs: ${cycle.roleDriftHighPairCount}`,
        cycle.roleDriftTopPairs.length
          ? `- Role drift top pair: ${cycle.roleDriftTopPairs[0].agentAName} <> ${cycle.roleDriftTopPairs[0].agentBName} (${Math.round(cycle.roleDriftTopPairs[0].overlap * 100)}%)`
          : "- Role drift top pair: none",
        `- Delta: c${formatDelta(cycle.delta.cohesion)} t${formatDelta(cycle.delta.trust)} n${formatDelta(cycle.delta.noise)}`,
        `- LLM turns success/fallback: ${cycle.llmSuccessCount}/${cycle.llmFallbackCount}`,
        cycle.fallbackEvents.length
          ? `- Fallback events: ${cycle.fallbackEvents.map((item) => `${item.errorCode} (${item.agentId ?? "n/a"})`).join(", ")}`
          : "- Fallback events: none",
      ].join("\n");
    })
    .join("\n\n");

  return [
    "# Scenario Session Report",
    "",
    "## Metadata",
    `- Date: ${report.date}`,
    `- App URL: ${report.baseUrl}`,
    `- Session ID: ${report.sessionId}`,
    `- Scenario label: ${report.scenarioLabel}`,
    `- Cycles run: ${report.cycles.length}`,
    "",
    "## Scenario Preset Used",
    `- Label: ${report.scenarioLabel}`,
    `- World brief: ${report.worldBrief}`,
    "",
    "## Abstract",
    report.abstract,
    "",
    "## Aggregate Evidence Snapshot",
    `- Active-event cycles: ${report.aggregate.activeEventCycles}/${report.aggregate.totalCycles} (${Math.round(report.aggregate.activeEventRate * 100)}%)`,
    `- Forced-slot cycles: ${report.aggregate.forcedSlotCycles}/${report.aggregate.totalCycles} (${Math.round(report.aggregate.forcedSlotRate * 100)}%)`,
    `- Mean contradiction: ${report.aggregate.meanContradiction.toFixed(2)}`,
    `- Mean salience avg/std: ${report.aggregate.meanSalienceAvg.toFixed(2)} / ${report.aggregate.meanSalienceStdDev.toFixed(2)}`,
    `- Mean role-drift overlap/max: ${report.aggregate.meanRoleDriftMean.toFixed(2)} / ${report.aggregate.maxRoleDriftMax.toFixed(2)}`,
    `- Cycles with high drift pairs: ${report.aggregate.cyclesWithHighRoleDrift}/${report.aggregate.totalCycles}`,
    `- Mean delta (c/t/n): ${report.aggregate.meanDelta.cohesion.toFixed(2)} / ${report.aggregate.meanDelta.trust.toFixed(2)} / ${report.aggregate.meanDelta.noise.toFixed(2)}`,
    `- Total LLM success/fallback turns: ${report.aggregate.totalLlmSuccessTurns}/${report.aggregate.totalLlmFallbackTurns}`,
    "",
    "## Robustness Verdict",
    `- Status: ${report.verdict.status}`,
    `- Confidence: ${report.verdict.confidence}`,
    `- Rationale: ${report.verdict.rationale}`,
    "",
    cycleBlocks,
    "",
    "## Raw Artifact",
    `- JSON: ${report.jsonPath}`,
  ].join("\n");
}

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function readWorldBrief(args) {
  if (args.brief) {
    return args.brief.trim();
  }

  if (args.briefFile) {
    const text = await fs.readFile(args.briefFile, "utf8");
    return text.trim();
  }

  throw new Error("Provide --brief or --brief-file.");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  requireArg(Boolean(args.label.trim()), "Missing --label");
  requireArg(Number.isInteger(args.cycles) && args.cycles > 0 && args.cycles <= 20, "--cycles must be an integer between 1 and 20");

  const worldBrief = await readWorldBrief(args);
  const scenarioLabel = args.label.trim();

  await ensureDir(args.outDir);

  if (args.reset) {
    console.log("Resetting simulation to start a fresh session...");
    await requestJson(args.baseUrl, "/api/simulation/reset", {
      method: "POST",
      body: "{}",
    });
  }

  let sessionId = "unknown-session";
  try {
    const context = await requestJson(args.baseUrl, "/api/simulation/context");
    if (context?.sessionId) {
      sessionId = String(context.sessionId);
    }
  } catch {
    console.warn("Warning: /api/simulation/context unavailable; continuing with unknown session id.");
  }
  const sessionShort = String(sessionId).slice(0, 8);
  const slug = slugify(scenarioLabel) || "scenario";
  const baseName = `${nowDate()}__session_${sessionShort}__${slug}`;

  const cycleRecords = [];

  for (let i = 0; i < args.cycles; i += 1) {
    console.log(`Running cycle ${i + 1}/${args.cycles}...`);

    const runResult = await requestJson(args.baseUrl, "/api/cycle/run", {
      method: "POST",
      body: JSON.stringify({
        scenarioLabel,
        worldBrief,
      }),
    });

    const cycleNumber = runResult?.runSummary?.cycleNumber;
    if (!Number.isInteger(cycleNumber)) {
      throw new Error("Missing cycleNumber in run result.");
    }

    const details = await requestJson(args.baseUrl, `/api/cycles/history/${cycleNumber}`);
    const diagnostics = details?.runSummary?.diagnostics ?? {};
    const worldState = details?.worldState ?? {};

    const fallbackEvents = (details?.eventLogs ?? [])
      .filter((event) => event?.event_type === "minor_event_created" && event?.payload?.kind === "llm_fallback")
      .map((event) => ({
        agentId: event?.source_agent_id ?? null,
        errorCode: event?.payload?.llmErrorCode ?? "unknown",
        errorDetail: event?.payload?.llmErrorDetail ?? "",
      }));

    const cycleRecord = {
      cycleNumber,
      worldSummary: compact(worldState?.summary ?? ""),
      activeEventsCount: Array.isArray(worldState?.active_events) ? worldState.active_events.length : 0,
      activeEvents: Array.isArray(worldState?.active_events) ? worldState.active_events : [],
      organic: diagnostics?.stanceCounts?.organic ?? { escalate: 0, contain: 0, monitor: 0 },
      effective: diagnostics?.stanceCounts?.effective ?? { escalate: 0, contain: 0, monitor: 0 },
      forcedSlotsCount: diagnostics?.forcedSlotsCount ?? 0,
      contradictionScore: diagnostics?.contradictionScore ?? 0,
      salienceAvg: diagnostics?.salienceAvg ?? 0,
      salienceStdDev: diagnostics?.salienceStdDev ?? 0,
      roleDriftMeanOverlap: diagnostics?.roleDriftMeanOverlap ?? 0,
      roleDriftMaxOverlap: diagnostics?.roleDriftMaxOverlap ?? 0,
      roleDriftHighPairCount: diagnostics?.roleDriftHighPairCount ?? 0,
      roleDriftTopPairs: Array.isArray(diagnostics?.roleDriftTopPairs) ? diagnostics.roleDriftTopPairs : [],
      delta: runResult?.runSummary?.delta ?? { cohesion: 0, trust: 0, noise: 0 },
      llmSuccessCount: diagnostics?.llmSuccessCount ?? 0,
      llmFallbackCount: diagnostics?.llmFallbackCount ?? 0,
      fallbackEvents,
    };

    cycleRecords.push(cycleRecord);

    console.log(
      `Cycle ${cycleRecord.cycleNumber}: events=${cycleRecord.activeEventsCount} organic=${cycleRecord.organic.escalate}/${cycleRecord.organic.contain}/${cycleRecord.organic.monitor} forced=${cycleRecord.forcedSlotsCount} contradiction=${round(cycleRecord.contradictionScore)} salience=${round(cycleRecord.salienceAvg)}/${round(cycleRecord.salienceStdDev)} drift=${round(cycleRecord.roleDriftMeanOverlap)}/${round(cycleRecord.roleDriftMaxOverlap)} highPairs=${cycleRecord.roleDriftHighPairCount} delta=${formatDelta(cycleRecord.delta.cohesion)}/${formatDelta(cycleRecord.delta.trust)}/${formatDelta(cycleRecord.delta.noise)} llm=${cycleRecord.llmSuccessCount}/${cycleRecord.llmFallbackCount}`,
    );

    if (i < args.cycles - 1 && args.pauseMs > 0) {
      await sleep(args.pauseMs);
    }
  }

  const aggregate = {
    totalCycles: cycleRecords.length,
    activeEventCycles: cycleRecords.filter((item) => item.activeEventsCount > 0).length,
    forcedSlotCycles: cycleRecords.filter((item) => item.forcedSlotsCount > 0).length,
    meanContradiction: round(avg(cycleRecords.map((item) => item.contradictionScore))),
    meanSalienceAvg: round(avg(cycleRecords.map((item) => item.salienceAvg))),
    meanSalienceStdDev: round(avg(cycleRecords.map((item) => item.salienceStdDev))),
    meanRoleDriftMean: round(avg(cycleRecords.map((item) => item.roleDriftMeanOverlap))),
    maxRoleDriftMax: round(Math.max(...cycleRecords.map((item) => item.roleDriftMaxOverlap), 0)),
    cyclesWithHighRoleDrift: cycleRecords.filter((item) => item.roleDriftHighPairCount > 0).length,
    meanDelta: {
      cohesion: round(avg(cycleRecords.map((item) => item.delta.cohesion))),
      trust: round(avg(cycleRecords.map((item) => item.delta.trust))),
      noise: round(avg(cycleRecords.map((item) => item.delta.noise))),
    },
    totalLlmSuccessTurns: cycleRecords.reduce((sum, item) => sum + item.llmSuccessCount, 0),
    totalLlmFallbackTurns: cycleRecords.reduce((sum, item) => sum + item.llmFallbackCount, 0),
    cyclesWithTrustCrash: cycleRecords.filter((item) => item.delta.trust <= -2).length,
  };

  aggregate.activeEventRate = aggregate.totalCycles > 0 ? aggregate.activeEventCycles / aggregate.totalCycles : 0;
  aggregate.forcedSlotRate = aggregate.totalCycles > 0 ? aggregate.forcedSlotCycles / aggregate.totalCycles : 0;

  const verdict = scenarioVerdict(aggregate);

  const report = {
    date: new Date().toISOString(),
    baseUrl: args.baseUrl,
    sessionId,
    scenarioLabel,
    worldBrief,
    cycles: cycleRecords,
    aggregate,
    verdict,
  };

  report.abstract = [
    `This controlled scenario run executed ${report.cycles.length} cycles with fixed agents and a single world-brief perturbation.` ,
    `Active events appeared in ${report.aggregate.activeEventCycles}/${report.aggregate.totalCycles} cycles, while forced slots appeared in ${report.aggregate.forcedSlotCycles}/${report.aggregate.totalCycles} cycles.` ,
    `Mean contradiction was ${report.aggregate.meanContradiction.toFixed(2)}, mean salience spread was ${report.aggregate.meanSalienceStdDev.toFixed(2)}, and mean role-drift overlap was ${report.aggregate.meanRoleDriftMean.toFixed(2)}.` ,
    `The run is currently classified as '${report.verdict.status}' based on baseline robustness gates.` ,
  ].join(" ");

  const jsonPath = path.join(args.outDir, `${baseName}.json`);
  report.jsonPath = jsonPath;

  const markdown = buildMarkdown(report);
  const mdPath = path.join(args.outDir, `${baseName}.md`);

  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  await fs.writeFile(mdPath, `${markdown}\n`, "utf8");

  console.log("\nRun complete.");
  console.log(`Session: ${sessionId}`);
  console.log(`JSON report: ${jsonPath}`);
  console.log(`Markdown report: ${mdPath}`);
}

main().catch((error) => {
  console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});

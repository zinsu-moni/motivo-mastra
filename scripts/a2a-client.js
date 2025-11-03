#!/usr/bin/env node
/**
 * Simple A2A client example.
 * Usage (PowerShell):
 *   $env:MASTRA_HOST = 'https://your-mastra-host'
 *   $env:AGENT_ID = 'motivationAgent'
 *   $env:MASTRA_API_KEY = '...'
 *   node .\scripts\a2a-client.js
 *
 * The script demonstrates:
 * 1) message/send (creates a task and returns task data)
 * 2) tasks/get (fetches task by id)
 * 3) message/stream (requests a streaming response for the same task)
 *
 * It requires Node 18+ (global fetch + Web Streams API). If you use older Node, install node-fetch and adjust accordingly.
 */

const { randomUUID } = require("crypto");

const HOST = process.env.MASTRA_HOST || "http://localhost:3000";
const AGENT_ID = process.env.AGENT_ID || "motivationAgent";
const API_KEY = process.env.MASTRA_API_KEY || process.env.X_API_KEY || null;

const BASE_URL = HOST.replace(/\/$/, "");
const A2A_URL = `${BASE_URL}/a2a/${AGENT_ID}`;

if (typeof fetch === "undefined") {
  console.error("This script requires Node 18+ with global fetch (or adapt the script to use node-fetch).");
  process.exit(1);
}

async function post(body, extra = {}) {
  const headers = { "content-type": "application/json" };
  if (API_KEY) headers["x-api-key"] = API_KEY;
  const res = await fetch(A2A_URL, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    ...extra
  });
  const text = await res.text();
  // Some endpoints (message/stream) return text streams; here we try parse JSON when possible
  try {
    return JSON.parse(text);
  } catch (e) {
    return text;
  }
}

async function sendMessage(text) {
  const messageId = randomUUID();
  console.log(`Sending message/send (messageId=${messageId}) to ${A2A_URL}...`);
  const body = {
    method: "message/send",
    params: {
      message: {
        role: "user",
        parts: [{ kind: "text", text }],
        kind: "message",
        messageId
      }
    }
  };
  const result = await post(body);
  if (!result || !result.result) {
    console.error("Unexpected response for message/send:", result);
    process.exit(1);
  }
  const task = result.result;
  console.log("message/send -> task id:", task.id);
  return task.id;
}

async function getTask(taskId) {
  console.log(`Calling tasks/get for id=${taskId}...`);
  const body = { method: "tasks/get", params: { id: taskId } };
  const resp = await post(body);
  console.log("tasks/get ->", JSON.stringify(resp, null, 2));
}

async function streamMessage(taskId, text) {
  console.log(`Starting message/stream for taskId=${taskId}...`);
  const messageId = randomUUID();
  const body = {
    method: "message/stream",
    params: {
      message: {
        role: "user",
        parts: [{ kind: "text", text }],
        kind: "message",
        messageId,
        taskId
      }
    }
  };

  const headers = { "content-type": "application/json" };
  if (API_KEY) headers["x-api-key"] = API_KEY;

  const res = await fetch(A2A_URL, {
    method: "POST",
    headers,
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const txt = await res.text();
    console.error("message/stream failed:", res.status, txt);
    return;
  }

  // The server sends JSON chunks separated by the ASCII record separator (0x1E)
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\u001e");
    buffer = parts.pop();
    for (const p of parts) {
      if (!p) continue;
      try {
        const chunk = JSON.parse(p);
        console.log("stream chunk:", JSON.stringify(chunk));
      } catch (e) {
        console.log("non-json chunk:", p);
      }
    }
  }
  if (buffer) {
    try {
      console.log("stream final:", JSON.parse(buffer));
    } catch (e) {
      console.log("stream final raw:", buffer);
    }
  }
}

async function main() {
  try {
    const text = process.argv.slice(2).join(" ") || "I need some motivation to finish my project.";
    const taskId = await sendMessage(text);
    // Wait a short moment to let the agent start processing
    await new Promise((r) => setTimeout(r, 500));
    await getTask(taskId);
    await streamMessage(taskId, "Please continue or expand on the previous response.");
    console.log("Done.");
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

if (require.main === module) main();

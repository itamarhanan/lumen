import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const BASE_URL = "https://models.github.ai/inference";

const MODELS = [
  "openai/gpt-4.1-nano",
  "openai/gpt-4.1-mini",
  "openai/gpt-4o-mini",
];

const TRUNCATION_LIMITS = [200000, 100000, 50000, 25000, 10000];

async function callAPI(model, userMsg, prompt) {
  const token = process.env.GH_MODELS_TOKEN;
  if (!token) {
    console.error("GH_MODELS_TOKEN is not set");
    return null;
  }

  const resp = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: userMsg },
      ],
      max_tokens: 4096,
    }),
  });

  return resp;
}

async function main() {
  let diff;
  try {
    diff = fs.readFileSync("/tmp/pr_diff.txt", "utf-8").trim();
  } catch {
    console.error("Failed to read diff file");
    console.log("[]");
    return;
  }

  console.error(`Diff size: ${diff.length} chars`);
  if (!diff || diff.length < 20) {
    console.error("Diff too small, skipping review.");
    console.log("[]");
    return;
  }

  let prompt;
  try {
    prompt = fs.readFileSync(
      path.resolve(__dirname, "../ai-review-prompt.md"),
      "utf-8",
    );
  } catch {
    console.error("Failed to read prompt file");
    console.log("[]");
    return;
  }

  const PROMPT_PREFIX = "Review this PR diff:\n```diff\n";
  const PROMPT_SUFFIX = "\n```";

  for (const model of MODELS) {
    for (const limit of TRUNCATION_LIMITS) {
      const slice = diff.slice(0, limit);
      const userMsg = `${PROMPT_PREFIX}${slice}${PROMPT_SUFFIX}`;

      console.error(`Trying model=${model} truncation=${limit}chars`);

      const resp = await callAPI(model, userMsg, prompt);
      if (!resp) {
        console.log("[]");
        return;
      }

      console.error(`API status: ${resp.status}`);

      if (resp.ok) {
        const data = await resp.json();
        const text = data.choices?.[0]?.message?.content || "[]";
        console.error(`Raw response length: ${text.length}`);
        const parsed = parseJSON(text);
        console.log(JSON.stringify(parsed));
        return;
      }

      const body = await resp.text();
      const err = body.toLowerCase();

      // Model not found — try next model
      if (
        resp.status === 404 ||
        (err.includes("model") &&
          (err.includes("not found") || err.includes("not_found")))
      ) {
        console.error(`Model ${model} not found`);
        break;
      }

      // Context window exceeded — try smaller truncation
      if (
        resp.status === 413 ||
        resp.status === 400 ||
        err.includes("context length") ||
        err.includes("too many tokens") ||
        err.includes("maximum context") ||
        err.includes("token limit") ||
        err.includes("maximum_input_tokens")
      ) {
        console.error(
          `Context too long at ${limit} chars, retrying with smaller truncation`,
        );
        continue;
      }

      // Other error — log and try next model
      console.error(`API error: ${resp.status} ${body}`);
      break;
    }
  }

  console.error("All models exhausted, no review generated.");
  console.log("[]");
}

function parseJSON(text) {
  try {
    return JSON.parse(
      text
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/, "")
        .trim(),
    );
  } catch {
    return [];
  }
}

main().catch((err) => {
  console.error("Script error:", err);
  console.log("[]");
});

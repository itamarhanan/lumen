import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const diff = fs.readFileSync("/tmp/pr_diff.txt", "utf-8").trim();
  console.error(`Diff size: ${diff.length} chars`);
  if (!diff || diff.length < 20) {
    console.error("Diff too small, skipping review.");
    console.log("[]");
    return;
  }

  const prompt = fs.readFileSync(
    path.resolve(__dirname, "../ai-review-prompt.md"),
    "utf-8",
  );

  const userMsg = `Review this PR diff:\n\`\`\`diff\n${diff.slice(0, 40000)}\n\`\`\``;

  const resp = await fetch(
    "https://models.inference.ai.azure.com/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GH_MODELS_TOKEN || process.env.GITHUB_TOKEN}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: prompt },
          { role: "user", content: userMsg },
        ],
      }),
    },
  );

  console.error(`API status: ${resp.status} ${resp.statusText}`);
  if (!resp.ok) {
    const body = await resp.text();
    console.error(`API error: ${body}`);
    console.log("[]");
    return;
  }

  const data = await resp.json();
  const text = data.choices?.[0]?.message?.content || "[]";
  console.error(`Raw response length: ${text.length}`);
  const parsed = parseJSON(text);
  console.log(JSON.stringify(parsed));
}

function parseJSON(text) {
  try {
    return JSON.parse(
      text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim(),
    );
  } catch {
    return [];
  }
}

main().catch((err) => {
  console.error("Script error:", err);
  console.log("[]");
});

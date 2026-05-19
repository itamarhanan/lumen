import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const diff = fs.readFileSync("/tmp/pr_diff.txt", "utf-8").trim();
  if (!diff || diff.length < 20) {
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
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
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

  const data = await resp.json();
  const text = data.choices?.[0]?.message?.content || "[]";
  console.log(JSON.stringify(parseJSON(text)));
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

main().catch(() => console.log("[]"));

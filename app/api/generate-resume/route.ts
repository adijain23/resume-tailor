import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";

type OpenAIResponse = {
  output?: Array<{
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
};

function extractOutputText(payload: OpenAIResponse) {
  const content = payload.output?.[0]?.content ?? [];
  return content
    .filter((item) => item.type === "output_text" && item.text)
    .map((item) => item.text)
    .join("\n")
    .trim();
}

function extractEducationSection(resumeText: string) {
  const match = resumeText.match(/## EDUCATION([\s\S]*?)(?:\n## |\n# |$)/);
  return match ? match[1].trim() : "";
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing OPENAI_API_KEY." },
      { status: 500 }
    );
  }

  const body = await request.json().catch(() => null);
  const jobDescription = body?.jobDescription?.trim();

  if (!jobDescription) {
    return NextResponse.json(
      { error: "Job description is required." },
      { status: 400 }
    );
  }

  const resumePath = path.join(process.cwd(), "original-resume.md");
  const resumeText = await readFile(resumePath, "utf8");
  const educationSection = extractEducationSection(resumeText);

  const prompt = [
    "You are a resume assistant.",
    "Rewrite the resume to tailor it to the job description.",
    "Only change content that improves fit; leave other content as-is.",
    "Education must remain unchanged and must be included verbatim.",
    "Use only the same section headings and structure already present in the original resume; do not add new sections.",
    "Do not invent or embellish experience, skills, tools, dates, or outcomes. Be truthful to the original resume and only adjust wording to better match the job description.",
    "If a detail is missing (for example, a LinkedIn URL), leave it blank.",
    "Target a single-page resume by keeping content concise.",
    "Output must match the requested JSON schema exactly.",
    "Map sections: Professional Summary -> summary, Education -> education, Technical Skills -> skills, Professional Experience -> experience, Academic Experience -> academicExperience.",
    "Return JSON only.",
    "",
    "Original resume:",
    resumeText,
    "",
    "Education section to keep verbatim:",
    educationSection,
  ].join("\n");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  let response: Response;
  try {
    response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: "gpt-4o-mini",
        input: `${prompt}\n\nJob Description:\n${jobDescription}`,
        text: {
          format: {
            name: "tailored_resume",
            type: "json_schema",
            schema: {
              type: "object",
              additionalProperties: false,
              required: [
                "header",
                "summary",
                "education",
                "skills",
                "experience",
                "academicExperience",
              ],
              properties: {
                header: {
                  type: "object",
                  additionalProperties: false,
                  required: ["name", "contactLine"],
                  properties: {
                    name: { type: "string" },
                    contactLine: { type: "string" },
                  },
                },
                summary: { type: "string" },
                skills: {
                  type: "array",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    required: ["label", "items"],
                    properties: {
                      label: { type: "string" },
                      items: { type: "array", items: { type: "string" } },
                    },
                  },
                },
                experience: {
                  type: "array",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    required: ["company", "location", "dates", "title", "bullets"],
                    properties: {
                      company: { type: "string" },
                      location: { type: "string" },
                      dates: { type: "string" },
                      title: { type: "string" },
                      bullets: { type: "array", items: { type: "string" } },
                    },
                  },
                },
                education: {
                  type: "array",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    required: ["institution", "dates", "degree"],
                    properties: {
                      institution: { type: "string" },
                      dates: { type: "string" },
                      degree: { type: "string" },
                    },
                  },
                },
                academicExperience: {
                  type: "array",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    required: ["title", "tools", "dates", "bullets"],
                    properties: {
                      title: { type: "string" },
                      tools: { type: "string" },
                      dates: { type: "string" },
                      bullets: { type: "array", items: { type: "string" } },
                    },
                  },
                },
              },
            },
          },
        },
      }),
    });
  } catch (error) {
    clearTimeout(timeout);
    const message =
      error instanceof Error && error.name === "AbortError"
        ? "OpenAI request timed out."
        : "OpenAI request failed.";
    return NextResponse.json({ error: message }, { status: 504 });
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const errorText = await response.text();
    return NextResponse.json(
      { error: `OpenAI error: ${errorText}` },
      { status: response.status }
    );
  }

  const payload = (await response.json()) as OpenAIResponse;
  const text = extractOutputText(payload);
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return NextResponse.json(
      { error: "Model returned invalid JSON.", raw: text },
      { status: 502 }
    );
  }

  return NextResponse.json({ resume: parsed });
}

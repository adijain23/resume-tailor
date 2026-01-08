import { NextResponse } from "next/server";

export const runtime = "nodejs";

type ResumePayload = {
  header: {
    name: string;
    contactLine: string;
  };
  summary: string;
  education: Array<{
    institution: string;
    dates: string;
    degree: string;
  }>;
  skills: Array<{
    label: string;
    items: string[];
  }>;
  experience: Array<{
    company: string;
    location: string;
    dates: string;
    title: string;
    bullets: string[];
  }>;
  academicExperience: Array<{
    title: string;
    tools: string;
    dates: string;
    bullets: string[];
  }>;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderResume(resume: ResumePayload) {
  const educationHtml = resume.education
    .map(
      (entry) => `
      <div class="entry">
        <div class="row">
          <div class="bold">${escapeHtml(entry.institution)}</div>
          <div class="date">${escapeHtml(entry.dates)}</div>
        </div>
        <div class="subtext">${escapeHtml(entry.degree)}</div>
      </div>
    `
    )
    .join("");

  const skillsHtml = resume.skills
    .map(
      (skill) => `
      <li>
        <span class="bold">${escapeHtml(skill.label)}:</span>
        ${escapeHtml(skill.items.join(", "))}
      </li>
    `
    )
    .join("");

  const experienceHtml = resume.experience
    .map(
      (entry) => `
      <div class="entry">
        <div class="row">
          <div class="bold">${escapeHtml(
            `${entry.company}, ${entry.location}`.trim()
          )}</div>
          <div class="date">${escapeHtml(entry.dates)}</div>
        </div>
        <div class="italic">${escapeHtml(entry.title)}</div>
        <ul>
          ${entry.bullets
            .map((bullet) => `<li>${escapeHtml(bullet)}</li>`)
            .join("")}
        </ul>
      </div>
    `
    )
    .join("");

  const academicHtml = resume.academicExperience
    .map(
      (entry) => `
      <div class="entry">
        <div class="row">
          <div>
            <span class="bold">${escapeHtml(entry.title)}</span>
            ${entry.tools ? ` | Tools: ${escapeHtml(entry.tools)}` : ""}
          </div>
          <div class="date">${escapeHtml(entry.dates)}</div>
        </div>
        <ul>
          ${entry.bullets
            .map((bullet) => `<li>${escapeHtml(bullet)}</li>`)
            .join("")}
        </ul>
      </div>
    `
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Resume</title>
    <style>
      @page {
        size: letter;
        margin: 0.2in 0.35in 0.45in 0.35in;
      }
      body {
        font-family: Calibri, Arial, sans-serif;
        color: #000;
        background: #fff;
        margin: 0;
        padding: 0;
        font-size: 11pt;
        line-height: 1.35;
      }
      .page {
        max-width: 8.5in;
        margin: 0 auto;
        padding: 0.2in 0.35in 0.45in;
      }
      .header {
        text-align: center;
        margin-bottom: 0.2in;
      }
      .header h1 {
        margin: 0;
        font-size: 20pt;
        letter-spacing: 0.04em;
        font-weight: 700;
      }
      .contact {
        margin-top: 0.05in;
        font-size: 10.5pt;
      }
      .section + .section {
        margin-top: 0.04in;
      }
      .section-title {
        display: flex;
        align-items: center;
        gap: 0.1in;
        font-size: 10.5pt;
        font-weight: 700;
        letter-spacing: 0.04em;
        text-transform: uppercase;
      }
      .section-title + * {
        margin-top: 0.01in;
      }
      .section-title .rule {
        flex: 1;
        border-bottom: 1px solid #000;
        transform: translateY(1px);
      }
      p {
        margin: 0.02in 0 0;
      }
      .entry {
        margin-top: 0.05in;
      }
      .row {
        display: flex;
        justify-content: space-between;
        gap: 0.2in;
      }
      .bold {
        font-weight: 700;
      }
      .italic {
        font-style: italic;
        margin-top: 0.02in;
      }
      .date {
        white-space: nowrap;
      }
      .subtext {
        margin-top: 0.02in;
      }
      ul {
        margin: 0.03in 0 0.02in 0.15in;
        padding-left: 0.15in;
      }
      li {
        margin-bottom: 0.04in;
      }
      .skills {
        margin-top: 0.05in;
      }
      .skills li {
        margin-bottom: 0.03in;
      }
    </style>
  </head>
  <body>
    <div class="page">
      <div class="header">
        <h1>${escapeHtml(resume.header.name)}</h1>
        <div class="contact">${escapeHtml(resume.header.contactLine)}</div>
      </div>

      <section class="section">
        <div class="section-title">
          <span>Professional Summary</span>
          <span class="rule"></span>
        </div>
        <p>${escapeHtml(resume.summary)}</p>
      </section>

      <section class="section">
        <div class="section-title">
          <span>Education</span>
          <span class="rule"></span>
        </div>
        ${educationHtml}
      </section>

      <section class="section">
        <div class="section-title">
          <span>Technical Skills</span>
          <span class="rule"></span>
        </div>
        <ul class="skills">
          ${skillsHtml}
        </ul>
      </section>

      <section class="section">
        <div class="section-title">
          <span>Professional Experience</span>
          <span class="rule"></span>
        </div>
        ${experienceHtml}
      </section>

      <section class="section">
        <div class="section-title">
          <span>Academic Experience</span>
          <span class="rule"></span>
        </div>
        ${academicHtml}
      </section>
    </div>
  </body>
</html>`;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const resume = body?.resume as ResumePayload | undefined;

  if (!resume) {
    return NextResponse.json(
      { error: "Resume JSON is required." },
      { status: 400 }
    );
  }

  try {
    const html = renderResume(resume);
    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": "attachment; filename=tailored-resume.html",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to render resume.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

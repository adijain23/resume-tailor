"use client";

import { useState } from "react";

export default function Home() {
  const [jobDescription, setJobDescription] = useState("");
  const [result, setResult] = useState("");
  const [resumeJson, setResumeJson] = useState<unknown | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError("");
    setResult("");
    setResumeJson(null);

    try {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 25000);

      const response = await fetch("/api/generate-resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobDescription }),
        signal: controller.signal,
      });
      window.clearTimeout(timeout);

      const data = await response.json();

      if (!response.ok) {
        setError(data?.error || "Something went wrong.");
        return;
      }

      if (data?.resume) {
        setResumeJson(data.resume);
        setResult(JSON.stringify(data.resume, null, 2));
        return;
      }

      setError("No resume data returned.");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        setError("Request timed out. Please try again.");
      } else {
        setError("Failed to reach the server.");
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDownload() {
    if (!resumeJson) {
      setError("Generate a resume before downloading.");
      return;
    }

    setIsDownloading(true);
    setError("");

    try {
      const response = await fetch("/api/render-resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume: resumeJson }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        setError(data?.error || "Failed to render resume.");
        return;
      }

      const html = await response.text();
      const blob = new Blob([html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "tailored-resume.html";
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("Failed to render resume.");
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-16 text-slate-900">
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-10">
        <header className="space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight">
            Resume Tailor
          </h1>
          <p className="text-base text-slate-600">
            Paste a job description and generate a tailored resume outline.
          </p>
        </header>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="block text-sm font-medium text-slate-700">
            Job description
          </label>
          <textarea
            className="min-h-[220px] w-full rounded-lg border border-slate-200 bg-white p-4 text-sm shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            placeholder="Paste the job description here..."
            value={jobDescription}
            onChange={(event) => setJobDescription(event.target.value)}
            required
          />
          <button
            className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            type="submit"
            disabled={isLoading || jobDescription.trim().length === 0}
          >
            {isLoading ? "Generating..." : "Generate"}
          </button>
        </form>

        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Result</h2>
            <button
              className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              type="button"
              onClick={handleDownload}
              disabled={!resumeJson || isDownloading}
            >
              {isDownloading ? "Preparing..." : "Download HTML"}
            </button>
          </div>
          {error ? (
            <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </p>
          ) : (
            <div className="space-y-2">
              <pre className="min-h-[160px] whitespace-pre-wrap rounded-lg border border-slate-200 bg-white p-4 text-xs text-slate-700">
                {result || "Your tailored resume JSON will appear here."}
              </pre>
              <p className="text-xs text-slate-500">
                Open the HTML file and use Print to save a one-page PDF.
              </p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

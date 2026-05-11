import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { reports as reportsApi, jobs as jobsApi, push as pushApi } from "../../api.js";
import { StatusDot, TierBadge } from "../../shared.jsx";

export function EditorScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [saving, setSaving] = useState(false);
  const [jobStatus, setJobStatus] = useState(null);
  const pdfRef = useRef();
  const ogRef = useRef();

  useEffect(() => {
    // Editor fetches by id — need slug for public endpoint, use admin list endpoint
    reportsApi.list().then((list) => {
      const r = list.find((x) => x.id === id);
      if (r) reportsApi.get(r.slug).then(setReport);
      else navigate("/cms/reports", { replace: true });
    });
  }, [id]);

  const set = (key) => (e) =>
    setReport((prev) => ({ ...prev, [key]: e.target.value }));

  const save = async () => {
    setSaving(true);
    try {
      await reportsApi.update(id, {
        title: report.title,
        subtitle: report.subtitle,
        hook: report.hook,
        content_md: report.content_md,
        access: report.access,
        status: report.status,
        tag: report.tag,
        domain: report.domain,
        year: report.year,
      });
    } finally {
      setSaving(false);
    }
  };

  const handlePdfUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    await reportsApi.uploadPdf(id, file);
    alert("PDF uploaded — ingestion queued");
  };

  const handleOgUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const res = await reportsApi.uploadOgImage(id, file);
    setReport((prev) => ({ ...prev, og_image_url: res.og_image_url }));
  };

  const handleSynthesize = async () => {
    if (!confirm("Start AI synthesis? This will start the GCP VM.")) return;
    const res = await jobsApi.synthesize(id);
    setJobStatus(`Queued: task ${res.task_id}`);
  };

  const handlePublishNotify = async () => {
    if (!report?.slug) return;
    await pushApi.notifyReport(report.slug);
    alert("Push notification sent to all subscribers");
  };

  if (!report) return <div className="cms-page">Loading…</div>;

  return (
    <div className="cms-page editor-page">
      <div className="cms-page-header">
        <div>
          <h1 className="cms-page-title">Edit Report</h1>
          <code className="report-slug">/reports/{report.slug}</code>
        </div>
        <div className="editor-actions">
          <StatusDot status={report.status} />
          <button onClick={save} disabled={saving} className="btn-primary btn-sm">
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      <div className="editor-layout">
        {/* Left: main fields */}
        <div className="editor-main">
          <label className="field-label">Title</label>
          <input className="field-input" value={report.title} onChange={set("title")} />

          <label className="field-label">Subtitle</label>
          <input className="field-input" value={report.subtitle || ""} onChange={set("subtitle")} />

          <label className="field-label">Hook (160 chars)</label>
          <input className="field-input" value={report.hook || ""} onChange={set("hook")} maxLength={160} />

          <label className="field-label">Body (Markdown)</label>
          <textarea
            className="field-textarea"
            value={report.content_md || ""}
            onChange={set("content_md")}
            rows={24}
            placeholder={"Use :::members\n...\n::: to gate sections."}
          />
        </div>

        {/* Right: metadata + tools */}
        <aside className="editor-sidebar">
          <fieldset className="editor-fieldset">
            <legend>Metadata</legend>

            <label className="field-label">Tag</label>
            <input className="field-input" value={report.tag || ""} onChange={set("tag")} />

            <label className="field-label">Domain</label>
            <input className="field-input" value={report.domain || ""} onChange={set("domain")} />

            <label className="field-label">Year</label>
            <input className="field-input" value={report.year || ""} onChange={set("year")} />

            <label className="field-label">Access tier</label>
            <select className="field-select" value={report.access} onChange={set("access")}>
              <option value="free">Free</option>
              <option value="members">Members</option>
              <option value="paid">Paid</option>
            </select>

            <label className="field-label">Status</label>
            <select className="field-select" value={report.status} onChange={set("status")}>
              <option value="draft">Draft</option>
              <option value="processing">Processing</option>
              <option value="published">Published</option>
              <option value="retired">Retired</option>
            </select>
          </fieldset>

          <fieldset className="editor-fieldset">
            <legend>PDF</legend>
            <input ref={pdfRef} type="file" accept=".pdf" style={{ display: "none" }}
              onChange={handlePdfUpload} />
            <button onClick={() => pdfRef.current.click()} className="btn-secondary btn-sm btn-full">
              Upload PDF
            </button>
          </fieldset>

          <fieldset className="editor-fieldset">
            <legend>OG Image</legend>
            {report.og_image_url && (
              <img src={report.og_image_url} alt="OG" className="og-preview" />
            )}
            <input ref={ogRef} type="file" accept="image/*" style={{ display: "none" }}
              onChange={handleOgUpload} />
            <button onClick={() => ogRef.current.click()} className="btn-secondary btn-sm btn-full">
              Upload OG image
            </button>
          </fieldset>

          <fieldset className="editor-fieldset">
            <legend>AI Synthesis</legend>
            <button onClick={handleSynthesize} className="btn-secondary btn-sm btn-full">
              Run synthesis
            </button>
            {jobStatus && <p className="job-status">{jobStatus}</p>}
          </fieldset>

          <fieldset className="editor-fieldset">
            <legend>Push Notifications</legend>
            <button onClick={handlePublishNotify} className="btn-secondary btn-sm btn-full">
              Notify subscribers
            </button>
          </fieldset>
        </aside>
      </div>
    </div>
  );
}

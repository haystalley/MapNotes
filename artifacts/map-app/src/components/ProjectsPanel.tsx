import React, { useEffect, useRef, useState } from "react";
import { X, Trash2, FolderOpen, Plus, Settings } from "lucide-react";
import { ProjectEntry, getAllProjects, deleteProject } from "@/lib/db";

interface ProjectsPanelProps {
  open: boolean;
  onClose: () => void;
  onSave: (name: string) => Promise<void>;
  onLoad: (project: ProjectEntry) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  onOpenSettings: () => void;
}

function formatDate(ts: number) {
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function ProjectsPanel({
  open,
  onClose,
  onSave,
  onLoad,
  onDelete,
  triggerRef,
  onOpenSettings,
}: ProjectsPanelProps) {
  const [projects, setProjects] = useState<ProjectEntry[]>([]);
  const [saving, setSaving] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [showNameInput, setShowNameInput] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      getAllProjects().then(setProjects);
      setShowNameInput(false);
      setNameInput("");
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onClose, triggerRef]);

  if (!open) return null;

  const handleSave = async () => {
    const name = nameInput.trim() || `Untitled Map — ${formatDate(Date.now())}`;
    setSaving(true);
    try {
      await onSave(name);
      const updated = await getAllProjects();
      setProjects(updated);
      setShowNameInput(false);
      setNameInput("");
    } finally {
      setSaving(false);
    }
  };

  const handleLoad = async (project: ProjectEntry) => {
    setLoadingId(project.id);
    try {
      await onLoad(project);
      onClose();
    } finally {
      setLoadingId(null);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm("Delete this map? This cannot be undone.")) return;
    await onDelete(id);
    setProjects((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <div className="projects-panel" ref={panelRef}>
      <div className="projects-header">
        <span className="projects-title">My Maps</span>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <button
            className="btn-icon-sm"
            onClick={() => { onClose(); onOpenSettings(); }}
            title="Settings"
          >
            <Settings size={14} />
          </button>
          <button className="btn-icon-sm" onClick={onClose} title="Close">
            <X size={14} />
          </button>
        </div>
      </div>

      <div className="projects-save-area">
        {showNameInput ? (
          <div className="projects-name-row">
            <input
              className="field-input"
              placeholder="Map name…"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
                if (e.key === "Escape") setShowNameInput(false);
              }}
              autoFocus
            />
            <button className="btn-save" onClick={handleSave} disabled={saving}>
              {saving ? "…" : "Save"}
            </button>
            <button className="btn-icon-sm" onClick={() => setShowNameInput(false)}>
              <X size={12} />
            </button>
          </div>
        ) : (
          <button
            className="projects-save-btn"
            onClick={() => setShowNameInput(true)}
          >
            <Plus size={14} />
            Save Current Map
          </button>
        )}
      </div>

      <div className="projects-list">
        {projects.length === 0 ? (
          <div className="projects-empty">
            <FolderOpen size={28} className="projects-empty-icon" />
            <p>No saved maps yet.</p>
            <p>Save your current work to create a project.</p>
          </div>
        ) : (
          projects.map((p) => (
            <button
              key={p.id}
              className="project-item"
              onClick={() => handleLoad(p)}
              disabled={loadingId === p.id}
            >
              <img
                className="project-thumb"
                src={p.thumbnail}
                alt={p.name}
                width={60}
                height={40}
              />
              <div className="project-info">
                <div className="project-name">{p.name}</div>
                <div className="project-meta">
                  {p.elements.length} item{p.elements.length !== 1 ? "s" : ""} · {formatDate(p.updatedAt)}
                </div>
              </div>
              <button
                className="project-delete btn-icon-sm"
                onClick={(e) => handleDelete(e, p.id)}
                title="Delete this map"
              >
                <Trash2 size={13} />
              </button>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

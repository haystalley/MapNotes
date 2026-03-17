import React, { useState, useEffect, useRef, useCallback } from "react";
import { MapElement, MapMarker, MapShape } from "@/lib/db";
import { useImageStorage } from "@/hooks/useImageStorage";
import { generateId } from "@/lib/geo";
import {
  X, Upload, Trash2, Tag, Calendar, Type, AlignLeft, Image as ImageIcon,
  Plus, ChevronLeft, ChevronRight
} from "lucide-react";

interface ElementPopupProps {
  element: MapElement;
  onUpdate: (element: MapElement) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

const ICON_TYPES = [
  { id: "default", label: "Pin", emoji: "📍" },
  { id: "star", label: "Star", emoji: "⭐" },
  { id: "home", label: "Home", emoji: "🏠" },
  { id: "flag", label: "Flag", emoji: "🚩" },
  { id: "camera", label: "Camera", emoji: "📷" },
  { id: "food", label: "Food", emoji: "🍽️" },
  { id: "car", label: "Car", emoji: "🚗" },
  { id: "tree", label: "Nature", emoji: "🌲" },
];

const COLORS = [
  "#3b82f6", "#ef4444", "#22c55e", "#f97316",
  "#a855f7", "#eab308", "#14b8a6", "#ec4899",
];

export default function ElementPopup({
  element,
  onUpdate,
  onDelete,
  onClose,
}: ElementPopupProps) {
  const [title, setTitle] = useState(element.title);
  const [description, setDescription] = useState(element.description);
  const [tags, setTags] = useState(element.tags.join(", "));
  const [date, setDate] = useState(element.date);
  const [color, setColor] = useState(element.color);
  const [iconType, setIconType] = useState(
    element.type === "marker" ? (element as MapMarker).iconType : "default"
  );
  const [opacity, setOpacity] = useState(
    element.type !== "marker" ? (element as MapShape).opacity : 0.3
  );
  const [images, setImages] = useState<{ id: string; data: string; name: string }[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dirty, setDirty] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { storeImage, loadImage, removeImage } = useImageStorage();

  useEffect(() => {
    async function loadImages() {
      const loaded: { id: string; data: string; name: string }[] = [];
      for (const imgId of element.imageIds) {
        const img = await loadImage(imgId);
        if (img) loaded.push({ id: img.id, data: img.data, name: img.name });
      }
      setImages(loaded);
    }
    loadImages();
  }, [element.imageIds, loadImage]);

  const markDirty = () => setDirty(true);

  const handleSave = useCallback(() => {
    const updated: MapElement = {
      ...element,
      title,
      description,
      tags: tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      date,
      color,
      imageIds: images.map((i) => i.id),
      ...(element.type === "marker"
        ? { iconType }
        : { opacity, fillColor: color }),
    };
    onUpdate(updated);
    setDirty(false);
  }, [element, title, description, tags, date, color, iconType, opacity, images, onUpdate]);

  const handleFiles = useCallback(
    async (files: FileList) => {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) continue;
        const id = await storeImage(file);
        const reader = new FileReader();
        reader.onload = (e) => {
          setImages((prev) => [
            ...prev,
            { id, data: e.target?.result as string, name: file.name },
          ]);
          markDirty();
        };
        reader.readAsDataURL(file);
      }
    },
    [storeImage]
  );

  const handleDeleteImage = useCallback(
    async (imgId: string) => {
      await removeImage(imgId);
      setImages((prev) => prev.filter((i) => i.id !== imgId));
      setCurrentImageIndex((idx) => Math.max(0, idx - 1));
      markDirty();
    },
    [removeImage]
  );

  return (
    <div className="popup-container" onClick={(e) => e.stopPropagation()}>
      <div className="popup-header">
        <h3 className="popup-title">
          {element.type === "marker" ? "Marker" : "Shape"} Details
        </h3>
        <div className="popup-header-actions">
          {dirty && (
            <button className="btn-save" onClick={handleSave}>
              Save
            </button>
          )}
          <button
            className="btn-icon-sm"
            onClick={() => onDelete(element.id)}
            title="Delete"
          >
            <Trash2 size={14} />
          </button>
          <button className="btn-icon-sm" onClick={onClose} title="Close">
            <X size={14} />
          </button>
        </div>
      </div>

      <div className="popup-body">
        {/* Title */}
        <div className="field-group">
          <label className="field-label">
            <Type size={12} /> Title
          </label>
          <input
            className="field-input"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              markDirty();
            }}
            placeholder="Add a title..."
          />
        </div>

        {/* Description */}
        <div className="field-group">
          <label className="field-label">
            <AlignLeft size={12} /> Description
          </label>
          <textarea
            className="field-textarea"
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              markDirty();
            }}
            placeholder="Add a description..."
            rows={2}
          />
        </div>

        {/* Date & Tags row */}
        <div className="field-row">
          <div className="field-group flex-1">
            <label className="field-label">
              <Calendar size={12} /> Date
            </label>
            <input
              type="date"
              className="field-input"
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                markDirty();
              }}
            />
          </div>
          <div className="field-group flex-1">
            <label className="field-label">
              <Tag size={12} /> Tags
            </label>
            <input
              className="field-input"
              value={tags}
              onChange={(e) => {
                setTags(e.target.value);
                markDirty();
              }}
              placeholder="tag1, tag2..."
            />
          </div>
        </div>

        {/* Color */}
        <div className="field-group">
          <label className="field-label">Color</label>
          <div className="color-picker">
            {COLORS.map((c) => (
              <button
                key={c}
                className={`color-dot ${color === c ? "ring-2 ring-offset-1 ring-white/60" : ""}`}
                style={{ backgroundColor: c }}
                onClick={() => {
                  setColor(c);
                  markDirty();
                }}
              />
            ))}
          </div>
        </div>

        {/* Icon type (marker only) */}
        {element.type === "marker" && (
          <div className="field-group">
            <label className="field-label">Icon</label>
            <div className="icon-picker">
              {ICON_TYPES.map((icon) => (
                <button
                  key={icon.id}
                  className={`icon-option ${iconType === icon.id ? "icon-option-active" : ""}`}
                  onClick={() => {
                    setIconType(icon.id);
                    markDirty();
                  }}
                  title={icon.label}
                >
                  <span className="icon-emoji">{icon.emoji}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Opacity (shape only) */}
        {element.type !== "marker" && (
          <div className="field-group">
            <label className="field-label">
              Opacity: {Math.round(opacity * 100)}%
            </label>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={opacity}
              onChange={(e) => {
                setOpacity(Number(e.target.value));
                markDirty();
              }}
              className="range-input"
            />
          </div>
        )}

        {/* Images */}
        <div className="field-group">
          <label className="field-label">
            <ImageIcon size={12} /> Photos ({images.length})
          </label>

          {images.length > 0 && (
            <div className="image-viewer">
              <img
                src={images[currentImageIndex].data}
                alt={images[currentImageIndex].name}
                className="image-preview"
              />
              <div className="image-controls">
                <button
                  className="btn-icon-sm"
                  onClick={() =>
                    setCurrentImageIndex((i) => Math.max(0, i - 1))
                  }
                  disabled={currentImageIndex === 0}
                >
                  <ChevronLeft size={12} />
                </button>
                <span className="image-counter">
                  {currentImageIndex + 1} / {images.length}
                </span>
                <button
                  className="btn-icon-sm"
                  onClick={() =>
                    setCurrentImageIndex((i) =>
                      Math.min(images.length - 1, i + 1)
                    )
                  }
                  disabled={currentImageIndex === images.length - 1}
                >
                  <ChevronRight size={12} />
                </button>
                <button
                  className="btn-icon-sm ml-auto"
                  onClick={() =>
                    handleDeleteImage(images[currentImageIndex].id)
                  }
                  title="Remove photo"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          )}

          <div
            className={`dropzone ${isDragging ? "dropzone-active" : ""}`}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              handleFiles(e.dataTransfer.files);
            }}
            onClick={() => fileRef.current?.click()}
          >
            <Upload size={14} />
            <span>Drop photos here or click to upload</span>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
          />
        </div>
      </div>

      {dirty && (
        <div className="popup-footer">
          <button className="btn-save-full" onClick={handleSave}>
            Save Changes
          </button>
        </div>
      )}
    </div>
  );
}

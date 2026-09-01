"use client";

import { useState, useRef } from "react";

interface DropzoneProps {
  onFiles: (files: File[]) => void;
}

export function Dropzone({ onFiles }: DropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files).filter((file) =>
      /\.(txt|slt|cha|json)$/i.test(file.name)
    );
    if (droppedFiles.length > 0) {
      onFiles(droppedFiles);
    }
  }

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files ? Array.from(e.target.files) : [];
    if (selected.length > 0) {
      onFiles(selected);
    }
    e.target.value = "";
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
      className={`group relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-4 transition-all cursor-pointer text-center ${
        isDragging
          ? "border-teal-500 bg-teal-50/50 dark:bg-teal-950/20"
          : "border-slate-300 dark:border-slate-700 hover:border-teal-500/70 hover:bg-slate-50 dark:hover:bg-slate-800/40"
      }`}
      style={{
        borderColor: isDragging ? "var(--accent)" : undefined,
      }}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".txt,.slt,.cha,.json"
        className="hidden"
        onChange={handleFileInputChange}
      />
      <div className="flex items-center gap-2">
        <svg
          className="h-5 w-5 transition-transform group-hover:scale-110"
          style={{ color: "var(--accent)" }}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
          />
        </svg>
        <span className="text-xs font-semibold" style={{ color: "var(--text)" }}>
          Drag & drop transcript files here or <span style={{ color: "var(--accent)" }}>browse</span>
        </span>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5">
        <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-mono font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
          .TXT (SALT)
        </span>
        <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-mono font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
          .CHA (CHAT)
        </span>
        <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-mono font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
          .JSON (ULASA)
        </span>
      </div>
    </div>
  );
}

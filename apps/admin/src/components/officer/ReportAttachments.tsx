'use client';

import { useCallback, useRef } from 'react';
import { useBlobUrl } from '@/hooks/useBlobUrl';

const ACCEPT =
  'image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,application/pdf,application/msword';

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileIcon(file: File): string {
  if (file.type.startsWith('image/')) return '🖼️';
  if (file.type.startsWith('video/')) return '🎥';
  if (file.type.startsWith('audio/')) return '🎙️';
  if (file.type.includes('pdf')) return '📄';
  return '📎';
}

type Props = {
  files: File[];
  onChange: (files: File[]) => void;
  maxFiles?: number;
  disabled?: boolean;
};

function AttachmentThumb({ file }: { file: File }) {
  const url = useBlobUrl(file.type.startsWith('image/') ? file : null);
  if (url) {
    return <img className="report-attachments__thumb" src={url} alt={file.name} />;
  }
  return (
    <span className="report-attachments__thumb report-attachments__thumb--icon">
      {fileIcon(file)}
    </span>
  );
}

export function ReportAttachments({ files, onChange, maxFiles = 8, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback(
    (list: FileList | null) => {
      if (!list?.length) return;
      onChange([...files, ...Array.from(list)].slice(0, maxFiles));
    },
    [files, maxFiles, onChange],
  );

  const removeFile = (index: number) => {
    onChange(files.filter((_, i) => i !== index));
  };

  return (
    <div className="report-attachments">
      <div className="report-attachments__header">
        <span>Photos, videos & documents</span>
        <span className="report-attachments__hint">
          Up to {maxFiles} files · 50 MB each · images, video, PDF, Word, etc.
        </span>
      </div>

      <button
        type="button"
        className="report-attachments__dropzone"
        disabled={disabled || files.length >= maxFiles}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          e.currentTarget.classList.add('report-attachments__dropzone--hover');
        }}
        onDragLeave={(e) => {
          e.currentTarget.classList.remove('report-attachments__dropzone--hover');
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.currentTarget.classList.remove('report-attachments__dropzone--hover');
          addFiles(e.dataTransfer.files);
        }}
      >
        <span className="report-attachments__dropzone-icon" aria-hidden>
          📎
        </span>
        <span>
          <strong>Tap to attach</strong> or drag files here
        </span>
        <span className="report-attachments__dropzone-types">Photos · Videos · PDF · Documents</span>
      </button>

      <input
        ref={inputRef}
        type="file"
        className="report-attachments__input"
        accept={ACCEPT}
        multiple
        disabled={disabled}
        onChange={(e) => {
          addFiles(e.target.files);
          e.target.value = '';
        }}
      />

      {files.length > 0 && (
        <ul className="report-attachments__list">
          {files.map((file, i) => (
            <li key={`${file.name}-${file.size}-${i}`} className="report-attachments__item">
              <AttachmentThumb file={file} />
              <div className="report-attachments__meta">
                <strong>{file.name}</strong>
                <span>{formatFileSize(file.size)}</span>
              </div>
              <button
                type="button"
                className="report-attachments__remove"
                disabled={disabled}
                onClick={() => removeFile(i)}
                aria-label={`Remove ${file.name}`}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

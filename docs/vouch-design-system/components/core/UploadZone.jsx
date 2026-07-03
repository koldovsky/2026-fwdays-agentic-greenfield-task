import React from 'react';

/**
 * Drag-and-drop file upload zone for CV files.
 * Hover state: border changes to brand blue, background to brand wash.
 * FR-CV-01
 */
export function UploadZone({
  label = 'Drop your CV here',
  hint = 'PDF or DOCX · parsed server-side',
  onFile,
}) {
  const [over, setOver] = React.useState(false);
  const [fileName, setFileName] = React.useState(null);
  const inputRef = React.useRef(null);

  function handleDrop(e) {
    e.preventDefault();
    setOver(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      setFileName(file.name);
      if (onFile) onFile(file);
    }
  }

  function handleChange(e) {
    const file = e.target.files[0];
    if (file) {
      setFileName(file.name);
      if (onFile) onFile(file);
    }
  }

  return (
    <div
      onClick={() => inputRef.current && inputRef.current.click()}
      onDragOver={e => { e.preventDefault(); setOver(true); }}
      onDragEnter={() => setOver(true)}
      onDragLeave={() => setOver(false)}
      onDrop={handleDrop}
      style={{
        border: `1.5px dashed ${over ? 'var(--color-brand)' : '#c3cbd6'}`,
        borderRadius: 'var(--radius-xl)',
        background: over
          ? 'var(--color-brand-wash)'
          : fileName
          ? 'var(--color-met-bg)'
          : '#f8f9fb',
        padding: 'var(--space-7)',
        textAlign: 'center',
        transition: 'all 0.15s ease',
        cursor: 'pointer',
        fontFamily: 'var(--font-body)',
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx"
        onChange={handleChange}
        style={{ display: 'none' }}
      />
      <div
        style={{
          width: '40px',
          height: '40px',
          borderRadius: 'var(--radius-md)',
          background: fileName
            ? 'var(--color-met-bg)'
            : over
            ? 'var(--color-brand)'
            : 'var(--color-brand-wash)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 12px',
          transition: 'all 0.15s',
        }}
      >
        <span
          style={{
            color: fileName
              ? 'var(--color-met)'
              : over
              ? '#fff'
              : 'var(--color-brand)',
            fontSize: '20px',
            lineHeight: 1,
          }}
        >
          {fileName ? '✓' : '↑'}
        </span>
      </div>
      <div
        style={{
          fontWeight: 600,
          fontSize: 'var(--text-base)',
          marginBottom: '4px',
          color: fileName ? 'var(--color-met)' : 'var(--color-ink)',
        }}
      >
        {fileName || label}
      </div>
      <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-ink-muted)' }}>
        {fileName ? 'Click to replace' : hint}
      </div>
    </div>
  );
}

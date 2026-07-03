Drag-and-drop upload zone for the CV file (PDF or DOCX). Shows three states: default, drag-hover (blue), and uploaded (green with checkmark).

```jsx
// Default
<UploadZone />

// Custom labels
<UploadZone
  label="Drop your CV here"
  hint="PDF or DOCX · max 10 MB"
  onFile={(file) => console.log(file.name)}
/>
```

**State behavior:**
- Default: dashed grey border, white-ish bg, blue upload icon
- Drag-hover: blue dashed border, brand-wash bg, white icon on blue bg
- Uploaded: green border tint, met-green bg, checkmark, filename displayed

**Notes:**
- Click-to-browse (native file input) is built in
- Accepts `.pdf` and `.docx` only
- FR-CV-01: files are parsed server-side — the component is UI only, no parsing logic

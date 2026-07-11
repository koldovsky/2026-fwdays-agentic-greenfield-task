"""Audio adapter package marker.

Hosts the per-sentence → per-chapter audio stitching primitives
(``AudioStitcher``) + future audio adapters (per-paragraph stitcher,
MP3 export, etc.). Kept separate from ``adapters/tts/`` because
``tts/`` is the synthesis seam (input = text, output = audio) while
``audio/`` is the audio-mixing seam (input = audio bytes, output =
combined audio bytes).
"""

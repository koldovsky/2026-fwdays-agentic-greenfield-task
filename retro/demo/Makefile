# Demo-video pipeline (see PLAN.md). Full rebuild: make video
# The `demo` target needs the reference host dev server on :5173
# (pnpm --filter @transon/reference-host dev).

audio:
	node tts.mjs

slides: audio
	node capture.mjs

demo: audio
	node autopilot.mjs

assemble:
	bash assemble.sh

video: audio slides demo assemble

clean:
	rm -rf out/segments out/captions out/captions.srt

.PHONY: audio slides demo assemble video clean

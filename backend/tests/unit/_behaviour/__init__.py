"""Test-only behaviour gate fixtures (BACK-08, plan 01-02).

The ``BehaviourSpec`` env-var reader (parses ``MOCK_TRANSLATOR_BEHAVIOUR``
+ ``MOCK_TTS_BEHAVIOUR`` CSVs into ``AdapterBehaviour`` instances) lives
here as a test-only fixture; the production lifespan no longer reads
behaviour env vars (the in-process mocks are not wired in production).
The lightweight ``AdapterBehaviour`` Pydantic model itself lives in
``backend/tests/unit/_adapters/behaviour.py`` (test-only sibling of
``MockTranslationAdapter`` + ``MockTTSAdapter``; quick 260709-9yk moved
it from ``backend/src/epubtv/application/behaviour.py`` because the
production workflow services no longer consume a behaviour gate).
"""

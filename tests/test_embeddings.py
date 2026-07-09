def test_embedding_dimension_is_384(embedder):
    assert embedder.dimension == 384

    vectors = embedder.embed(["кавова гуща", "літаюче авто"])
    assert len(vectors) == 2
    assert all(len(v) == 384 for v in vectors)

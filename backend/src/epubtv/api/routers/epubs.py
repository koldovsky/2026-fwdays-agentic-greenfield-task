"""POST /api/v1/epubs — F1 EPUB upload + validation + metadata extraction.

Sprint scope: 50 MB hard cap (off-by-one audited per Pitfall D),
``ebooklib`` + ``BeautifulSoup(html5lib)`` parse, returns
``{epub_id, title, author, declared_languages[], chapter_count, chapter_ids[]}``
in the ``EpubUploadResponse`` envelope. Errors round-trip through the
``{error:{code,message,details?}}`` envelope via the
``EpubValidationError`` exception handler registered in ``api/app.py``.

The route is THIN — it enforces the size cap + reads the body, then
delegates to ``EpubService.validate_and_extract``. The canonical chapter
rule lives in ``EpubService._extract_chapters`` (Pattern 3 / Pitfall 13)
and is reused by F3/F4/F6.

Re-exporting ``EpubValidationError`` here is a deliberate seam: Plan 01's
``api/error_handlers.py`` lazy-imports it from this module so the
exception type has a single import path that always works.
"""

from __future__ import annotations

import io

from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile

from epubtv.api.schemas import EpubUploadResponse, ErrorResponse, GetEpubResponse
from epubtv.application.epub_service import EpubService, EpubValidationError
from epubtv.ports.file_store_port import FileStorePort

router = APIRouter()

# 50 MB hard cap (EPUB-01, off-by-one audited per Pitfall D).
MAX_BYTES = 50 * 1024 * 1024
CHUNK_SIZE = 64 * 1024  # 64 KB read chunks — keeps peak RAM bounded.
# Multipart envelope adds ~200 bytes (boundary + Content-Disposition + CRLF)
# to the HTTP body. We allow ``MAX_BYTES + MULTIPART_HEADROOM`` in the
# Content-Length early-reject so an exactly-50 MB file (which arrives with
# a slightly larger multipart body) is not falsely rejected. The chunked
# read remains the precise 50 MB gate on the file content itself.
MULTIPART_HEADROOM = 64 * 1024  # 64 KB — generous; covers the 200 B envelope.


def get_file_store(request: Request) -> FileStorePort:
    """Return the ``FileStorePort`` bound at the lifespan composition root."""
    return request.app.state.file_store  # type: ignore[no-any-return]


@router.post(
    "/epubs",
    response_model=EpubUploadResponse,
    status_code=200,
    responses={
        413: {"model": ErrorResponse, "description": "file_too_large"},
        422: {"model": ErrorResponse, "description": "invalid_epub"},
    },
)
async def upload_epub(
    file: UploadFile,
    request: Request,
    file_store: FileStorePort = Depends(get_file_store),
) -> EpubUploadResponse:
    """Validate + extract + persist the uploaded EPUB; return metadata.

    1. ``Content-Length`` early reject — never read the body if the header
       already says the upload is over the cap.
    2. Chunked read with running total — reject if the live total exceeds
       50 MB (off-by-one audited: ``> MAX_BYTES`` is the trigger).
    3. Delegate to ``EpubService.validate_and_extract`` — the service
       thread-offloads the blocking parse and persists the bytes.
    """
    # 1. Content-Length early reject (Pitfall D — bounds RAM at MAX_BYTES).
    # The cap is ``MAX_BYTES + MULTIPART_HEADROOM`` so an exactly-50 MB
    # file (whose multipart body is slightly larger than 50 MB) is NOT
    # falsely rejected. The chunked read below is the precise 50 MB gate
    # on the file content itself.
    cl_header = request.headers.get("content-length")
    if cl_header is not None:
        try:
            cl = int(cl_header)
        except ValueError:
            cl = 0
        if cl > MAX_BYTES + MULTIPART_HEADROOM:
            raise EpubValidationError(
                "file_too_large",
                f"EPUB exceeds {MAX_BYTES} byte limit",
                413,
            )

    # 2. Chunked read with running cap.
    total = 0
    buf = io.BytesIO()
    while True:
        chunk = await file.read(CHUNK_SIZE)
        if not chunk:
            break
        total += len(chunk)
        if total > MAX_BYTES:
            raise EpubValidationError(
                "file_too_large",
                f"EPUB exceeds {MAX_BYTES} byte limit",
                413,
            )
        buf.write(chunk)
    epub_bytes = buf.getvalue()

    # 3. Delegate to the service (thread offload + parse + persist).
    service = EpubService()
    return await service.validate_and_extract(
        epub_bytes=epub_bytes,
        original_filename=file.filename,
        file_store=file_store,
    )


@router.get(
    "/epubs/{epub_id}",
    response_model=GetEpubResponse,
    responses={404: {"model": ErrorResponse, "description": "not_found"}},
)
async def get_epub(epub_id: str, request: Request) -> GetEpubResponse:
    """D-06 + F1: re-fetch EPUB metadata (SPA prefill for source-language).

    Re-parses the persisted EPUB bytes via ``EpubService.get_metadata``
    and returns the 6-field ``GetEpubResponse`` shape
    (``epub_id, title, author, declared_languages, chapter_count,
    chapter_ids``). 404 ``not_found`` envelope if the EPUB is not in
    scratch.
    """
    file_store = request.app.state.file_store
    try:
        meta = await EpubService().get_metadata(epub_id, file_store=file_store)
    except FileNotFoundError:
        raise HTTPException(
            status_code=404,
            detail={"code": "not_found", "message": f"epub {epub_id!r} not found"},
        ) from None
    return GetEpubResponse.model_validate({**meta, "epub_id": epub_id})


# Re-export for backward compat with Plan 01's lazy import in
# ``api/error_handlers.py`` (``epub_validation_handler``).
__all__ = ["MAX_BYTES", "EpubValidationError", "router"]

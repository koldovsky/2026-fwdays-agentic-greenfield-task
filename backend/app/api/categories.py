"""Category CRUD router (FR-CAT-01/02/03), behind the slice 001 auth boundary.

Thin transport: every route takes ``CurrentUser`` (per-user isolation, FR-AUTH-07)
and mutations also require the CSRF double-submit (NFR-SEC-02). Validate -> call
``CategoryService`` -> return; domain errors map to HTTP status codes. The client
never passes a trusted object id: the id flows through the user_id-scoped repo, so a
category the user does not own is invisible and yields ``404`` (not ``403``).
"""

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import CurrentUser, SessionDep, require_csrf
from app.schemas.categories import CategoryCreate, CategoryRead, CategoryUpdate
from app.services.categories import (
    CategoryNotFoundError,
    CategoryService,
    DuplicateCategoryNameError,
)

router = APIRouter(prefix="/api/categories", tags=["categories"])

_DUPLICATE_DETAIL = "A category with that name already exists"
_NOT_FOUND_DETAIL = "Category not found"


@router.post(
    "",
    response_model=CategoryRead,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_csrf)],
)
async def create_category(
    payload: CategoryCreate, session: SessionDep, user: CurrentUser
) -> CategoryRead:
    """Create a category; 409 if the name duplicates an active one for this user."""
    try:
        category = await CategoryService(session).create(
            user_id=user.id,
            name=payload.name,
            color=payload.color,
            description=payload.description,
        )
    except DuplicateCategoryNameError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=_DUPLICATE_DETAIL) from exc
    return CategoryRead.model_validate(category)


@router.get("", response_model=list[CategoryRead])
async def list_categories(session: SessionDep, user: CurrentUser) -> list[CategoryRead]:
    """List the user's active (non-archived) categories."""
    categories = await CategoryService(session).list_active(user_id=user.id)
    return [CategoryRead.model_validate(category) for category in categories]


@router.patch(
    "/{category_id}",
    response_model=CategoryRead,
    dependencies=[Depends(require_csrf)],
)
async def update_category(
    category_id: int, payload: CategoryUpdate, session: SessionDep, user: CurrentUser
) -> CategoryRead:
    """Edit name/color/description; 404 if not owned, 409 on a rename collision."""
    changes = payload.model_dump(exclude_unset=True)
    try:
        category = await CategoryService(session).update(
            user_id=user.id, category_id=category_id, changes=changes
        )
    except CategoryNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=_NOT_FOUND_DETAIL
        ) from exc
    except DuplicateCategoryNameError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=_DUPLICATE_DETAIL) from exc
    return CategoryRead.model_validate(category)


@router.delete(
    "/{category_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_csrf)],
)
async def delete_category(category_id: int, session: SessionDep, user: CurrentUser) -> None:
    """Delete = archive the category; 404 if the user does not own it."""
    try:
        await CategoryService(session).delete(user_id=user.id, category_id=category_id)
    except CategoryNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=_NOT_FOUND_DETAIL
        ) from exc

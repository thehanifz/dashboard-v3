from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import require_superuser
from app.db.database import get_db
from app.schemas.admin import (
    ResetPasswordRequest,
    UserCreateRequest,
    UserListResponse,
    UserResponse,
    UserUpdateRequest,
)
from app.services.admin_service import (
    create_user,
    deactivate_user,
    list_users,
    reset_password,
    update_user,
)

router = APIRouter(tags=["Admin"])


def serialize_user(user) -> UserResponse:
    return UserResponse(
        id=str(user.id),
        username=user.username,
        nama_lengkap=user.nama_lengkap,
        role=user.role.value if hasattr(user.role, "value") else user.role,
        gsheet_url=user.gsheet_url,
        is_active=user.is_active,
        created_at=user.created_at.isoformat() if user.created_at else None,
        created_by=user.created_by,
    )


@router.get("/users", response_model=UserListResponse)
async def get_users(
    db: AsyncSession = Depends(get_db),
    actor: dict = Depends(require_superuser),
):
    users = await list_users(db)
    return UserListResponse(items=[serialize_user(u) for u in users])


@router.post("/users", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def post_create_user(
    payload: UserCreateRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    actor: dict = Depends(require_superuser),
):
    user = await create_user(
        db,
        actor_username=actor["username"],
        actor_role="superuser",
        payload=payload,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )
    return serialize_user(user)


@router.put("/users/{user_id}", response_model=UserResponse)
async def put_update_user(
    user_id: str,
    payload: UserUpdateRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    actor: dict = Depends(require_superuser),
):
    user = await update_user(
        db,
        user_id=user_id,
        actor_username=actor["username"],
        actor_role="superuser",
        payload=payload,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )
    return serialize_user(user)


@router.post("/users/{user_id}/deactivate", response_model=UserResponse)
async def post_deactivate_user(
    user_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    actor: dict = Depends(require_superuser),
):
    user = await deactivate_user(
        db,
        user_id=user_id,
        actor_username=actor["username"],
        actor_role="superuser",
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )
    return serialize_user(user)


@router.post("/users/{user_id}/reset-password", response_model=UserResponse)
async def post_reset_password(
    user_id: str,
    payload: ResetPasswordRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    actor: dict = Depends(require_superuser),
):
    user = await reset_password(
        db,
        user_id=user_id,
        new_password=payload.new_password,
        actor_username=actor["username"],
        actor_role="superuser",
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )
    return serialize_user(user)

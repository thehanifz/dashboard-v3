from typing import Literal, Optional
from pydantic import BaseModel, Field, field_validator


UserRole = Literal["engineer", "ptl", "mitra"]


class UserCreateRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=8, max_length=128)
    nama_lengkap: str = Field(..., min_length=3, max_length=150)
    role: UserRole
    gsheet_url: Optional[str] = Field(default=None, max_length=500)

    @field_validator("username")
    @classmethod
    def validate_username(cls, value: str) -> str:
        value = value.strip()
        if " " in value:
            raise ValueError("Username tidak boleh mengandung spasi")
        return value

    @field_validator("nama_lengkap")
    @classmethod
    def validate_nama_lengkap(cls, value: str) -> str:
        return value.strip()

    @field_validator("gsheet_url")
    @classmethod
    def validate_gsheet_url(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        return value.strip() or None


class UserUpdateRequest(BaseModel):
    nama_lengkap: str = Field(..., min_length=3, max_length=150)
    role: UserRole
    gsheet_url: Optional[str] = Field(default=None, max_length=500)
    is_active: bool = True

    @field_validator("nama_lengkap")
    @classmethod
    def validate_nama_lengkap(cls, value: str) -> str:
        return value.strip()

    @field_validator("gsheet_url")
    @classmethod
    def validate_gsheet_url(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        return value.strip() or None


class ResetPasswordRequest(BaseModel):
    new_password: str = Field(..., min_length=8, max_length=128)


class UserResponse(BaseModel):
    id: str
    username: str
    nama_lengkap: str
    role: str
    gsheet_url: Optional[str]
    is_active: bool
    created_at: Optional[str] = None
    created_by: Optional[str] = None


class UserListResponse(BaseModel):
    items: list[UserResponse]

"""
schemas/settings.py
Pydantic schemas untuk dashboard_settings endpoint.
"""
from datetime import datetime
from typing import Any, Literal, Optional
from pydantic import BaseModel


ValueType = Literal["string", "number", "boolean", "json"]


class SettingRead(BaseModel):
    """Schema untuk response GET settings."""
    id:          int
    key:         str
    value:       str
    value_type:  str
    category:    str
    label:       str
    description: Optional[str] = None
    is_editable: bool
    updated_by:  Optional[str] = None
    updated_at:  Optional[datetime] = None

    model_config = {"from_attributes": True}


class SettingUpdate(BaseModel):
    """Schema untuk request body PUT /settings/{key}."""
    value:      str
    updated_by: Optional[str] = None  # diisi otomatis dari current_user di endpoint


class SettingPublic(BaseModel):
    """
    Schema ringkas untuk frontend — hanya key + coerced value.
    Dipakai endpoint GET /settings/public yang tidak butuh auth.
    """
    key:      str
    value:    Any
    category: str
    label:    str

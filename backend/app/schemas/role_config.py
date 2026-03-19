from typing import List, Optional
from pydantic import BaseModel


class RoleTableConfigUpdate(BaseModel):
    visible_columns: List[str]
    editable_columns: List[str]


class RoleTableConfigResponse(BaseModel):
    role: str
    visible_columns: List[str]
    editable_columns: List[str]
    updated_by: str
    updated_at: Optional[str] = None

from pydantic import BaseModel


class PublicTerritory(BaseModel):
    id: str
    name: str
    kind: str
    parent_id: str | None
    center_latitude: float | None
    center_longitude: float | None
    default_zoom: float | None
    external_code: str | None
    open_centers: int
    active_needs: int
    has_activity: bool

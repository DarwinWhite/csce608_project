from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import database as db

router = APIRouter(tags=["Handles"])


class HandleIn(BaseModel):
    staffID: int
    artworkID: int


@router.post("/handles", status_code=201)
def assign_artwork(body: HandleIn):
    existing = db.fetchone(
        "SELECT 1 FROM Handles WHERE staffID=%s AND artworkID=%s",
        (body.staffID, body.artworkID),
    )
    if existing:
        raise HTTPException(status_code=409, detail="Assignment already exists")
    db.execute(
        "INSERT INTO Handles (staffID, artworkID) VALUES (%s, %s)",
        (body.staffID, body.artworkID),
    )
    return {"staffID": body.staffID, "artworkID": body.artworkID}


@router.delete("/handles/{staff_id}/{artwork_id}", status_code=204)
def unassign_artwork(staff_id: int, artwork_id: int):
    db.execute(
        "DELETE FROM Handles WHERE staffID=%s AND artworkID=%s",
        (staff_id, artwork_id),
    )

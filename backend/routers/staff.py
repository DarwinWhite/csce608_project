from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import database as db

router = APIRouter(tags=["Staff"])


class StaffIn(BaseModel):
    name: str
    phoneNum: str
    role: str
    galleryID: int = 1


@router.get("/staff")
def list_staff():
    return db.fetchall(
        """
        SELECT s.*, g.name AS gallery_name,
               COUNT(h.artworkID) AS handles_count
        FROM Staff s
        JOIN Gallery g ON g.galleryID = s.galleryID
        LEFT JOIN Handles h ON h.staffID = s.staffID
        GROUP BY s.staffID, g.name
        ORDER BY s.name
        """
    )


@router.get("/staff/{staff_id}")
def get_staff(staff_id: int):
    row = db.fetchone("SELECT * FROM Staff WHERE staffID = %s", (staff_id,))
    if not row:
        raise HTTPException(status_code=404, detail="Staff member not found")
    return row


@router.get("/staff/{staff_id}/handles")
def staff_handles(staff_id: int):
    rows = db.fetchall(
        """
        SELECT aw.artworkID, aw.title, aw.style, aw.price, aw.isSold, aw.yearMade,
               ar.name AS artist_name
        FROM Handles h
        JOIN Artwork aw ON aw.artworkID = h.artworkID
        JOIN Artists ar ON ar.artistID = aw.artistID
        WHERE h.staffID = %s
        ORDER BY aw.title
        """,
        (staff_id,),
    )
    return rows


@router.post("/staff", status_code=201)
def create_staff(body: StaffIn):
    row = db.fetchone(
        """
        INSERT INTO Staff (name, phoneNum, role, galleryID)
        VALUES (%s, %s, %s, %s) RETURNING *
        """,
        (body.name, body.phoneNum, body.role, body.galleryID),
    )
    return row


@router.put("/staff/{staff_id}")
def update_staff(staff_id: int, body: StaffIn):
    row = db.fetchone(
        """
        UPDATE Staff SET name=%s, phoneNum=%s, role=%s, galleryID=%s
        WHERE staffID=%s RETURNING *
        """,
        (body.name, body.phoneNum, body.role, body.galleryID, staff_id),
    )
    if not row:
        raise HTTPException(status_code=404, detail="Staff member not found")
    return row


@router.delete("/staff/{staff_id}", status_code=204)
def delete_staff(staff_id: int):
    db.execute("DELETE FROM Staff WHERE staffID = %s", (staff_id,))

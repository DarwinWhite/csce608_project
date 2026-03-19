from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
import database as db

router = APIRouter(tags=["Artists"])


class ArtistIn(BaseModel):
    name: str
    style: str
    medium: str


@router.get("/artists")
def list_artists(
    style: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
):
    offset = (page - 1) * page_size
    if style:
        rows = db.fetchall(
            """
            SELECT a.*,
                   COUNT(aw.artworkID) AS artwork_count
            FROM Artists a
            LEFT JOIN Artwork aw ON aw.artistID = a.artistID
            WHERE a.style = %s
            GROUP BY a.artistID
            ORDER BY a.name
            LIMIT %s OFFSET %s
            """,
            (style, page_size, offset),
        )
        total = db.fetchone(
            "SELECT COUNT(*) AS cnt FROM Artists WHERE style = %s", (style,)
        )
    else:
        rows = db.fetchall(
            """
            SELECT a.*,
                   COUNT(aw.artworkID) AS artwork_count
            FROM Artists a
            LEFT JOIN Artwork aw ON aw.artistID = a.artistID
            GROUP BY a.artistID
            ORDER BY a.name
            LIMIT %s OFFSET %s
            """,
            (page_size, offset),
        )
        total = db.fetchone("SELECT COUNT(*) AS cnt FROM Artists")

    return {"total": total["cnt"], "page": page, "page_size": page_size, "data": rows}


@router.get("/artists/{artist_id}")
def get_artist(artist_id: int):
    artist = db.fetchone("SELECT * FROM Artists WHERE artistID = %s", (artist_id,))
    if not artist:
        raise HTTPException(status_code=404, detail="Artist not found")
    artwork = db.fetchall(
        "SELECT * FROM Artwork WHERE artistID = %s ORDER BY yearMade DESC",
        (artist_id,),
    )
    return {**artist, "artwork": artwork}


@router.post("/artists", status_code=201)
def create_artist(body: ArtistIn):
    row = db.fetchone(
        "INSERT INTO Artists (name, style, medium) VALUES (%s, %s, %s) RETURNING *",
        (body.name, body.style, body.medium),
    )
    return row


@router.put("/artists/{artist_id}")
def update_artist(artist_id: int, body: ArtistIn):
    row = db.fetchone(
        """
        UPDATE Artists SET name=%s, style=%s, medium=%s
        WHERE artistID=%s RETURNING *
        """,
        (body.name, body.style, body.medium, artist_id),
    )
    if not row:
        raise HTTPException(status_code=404, detail="Artist not found")
    return row


@router.delete("/artists/{artist_id}", status_code=204)
def delete_artist(artist_id: int):
    db.execute("DELETE FROM Artists WHERE artistID = %s", (artist_id,))

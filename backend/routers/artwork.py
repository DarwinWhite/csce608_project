from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
import database as db

router = APIRouter(tags=["Artwork"])


class ArtworkIn(BaseModel):
    title: str
    yearMade: int
    style: str
    price: float
    isSold: bool = False
    artistID: int
    galleryID: int = 1


class ArtworkUpdate(BaseModel):
    title: str | None = None
    yearMade: int | None = None
    style: str | None = None
    price: float | None = None
    isSold: bool | None = None
    artistID: int | None = None


@router.get("/artwork")
def list_artwork(
    style: str | None = Query(None),
    min_price: float | None = Query(None),
    max_price: float | None = Query(None),
    artist_id: int | None = Query(None),
    is_sold: bool | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(24, ge=1, le=200),
):
    conditions = []
    params: list = []

    if style:
        conditions.append("aw.style = %s")
        params.append(style)
    if min_price is not None:
        conditions.append("aw.price >= %s")
        params.append(min_price)
    if max_price is not None:
        conditions.append("aw.price <= %s")
        params.append(max_price)
    if artist_id is not None:
        conditions.append("aw.artistID = %s")
        params.append(artist_id)
    if is_sold is not None:
        conditions.append("aw.isSold = %s")
        params.append(is_sold)

    where = ("WHERE " + " AND ".join(conditions)) if conditions else ""
    offset = (page - 1) * page_size

    rows = db.fetchall(
        f"""
        SELECT aw.*, ar.name AS artist_name
        FROM Artwork aw
        JOIN Artists ar ON ar.artistID = aw.artistID
        {where}
        ORDER BY aw.artworkID
        LIMIT %s OFFSET %s
        """,
        params + [page_size, offset],
    )

    count_row = db.fetchone(
        f"SELECT COUNT(*) AS cnt FROM Artwork aw {where}", params
    )

    return {
        "total": count_row["cnt"],
        "page": page,
        "page_size": page_size,
        "data": rows,
    }


@router.get("/artwork/{artwork_id}")
def get_artwork(artwork_id: int):
    row = db.fetchone(
        """
        SELECT aw.*, ar.name AS artist_name, ar.style AS artist_style
        FROM Artwork aw
        JOIN Artists ar ON ar.artistID = aw.artistID
        WHERE aw.artworkID = %s
        """,
        (artwork_id,),
    )
    if not row:
        raise HTTPException(status_code=404, detail="Artwork not found")
    return row


@router.post("/artwork", status_code=201)
def create_artwork(body: ArtworkIn):
    row = db.fetchone(
        """
        INSERT INTO Artwork (title, yearMade, style, price, isSold, artistID, galleryID)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        RETURNING *
        """,
        (body.title, body.yearMade, body.style, body.price,
         body.isSold, body.artistID, body.galleryID),
    )
    return row


@router.put("/artwork/{artwork_id}")
def update_artwork(artwork_id: int, body: ArtworkUpdate):
    existing = db.fetchone("SELECT * FROM Artwork WHERE artworkID = %s", (artwork_id,))
    if not existing:
        raise HTTPException(status_code=404, detail="Artwork not found")

    title    = body.title    if body.title    is not None else existing["title"]
    yearMade = body.yearMade if body.yearMade is not None else existing["yearmade"]
    style    = body.style    if body.style    is not None else existing["style"]
    price    = body.price    if body.price    is not None else float(existing["price"])
    isSold   = body.isSold   if body.isSold   is not None else existing["issold"]
    artistID = body.artistID if body.artistID is not None else existing["artistid"]

    row = db.fetchone(
        """
        UPDATE Artwork
        SET title=%s, yearMade=%s, style=%s, price=%s, isSold=%s, artistID=%s
        WHERE artworkID=%s RETURNING *
        """,
        (title, yearMade, style, price, isSold, artistID, artwork_id),
    )
    return row


@router.delete("/artwork/{artwork_id}", status_code=204)
def delete_artwork(artwork_id: int):
    db.execute("DELETE FROM Artwork WHERE artworkID = %s", (artwork_id,))

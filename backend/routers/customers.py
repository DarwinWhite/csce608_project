from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
import database as db

router = APIRouter(tags=["Customers"])


class CustomerIn(BaseModel):
    name: str
    phoneNum: str
    email: str
    moneySpent: float = 0.0


@router.get("/customers")
def list_customers(
    sort_by: str = Query("customerid", pattern="^(customerid|name|moneyspent)$"),
    order: str = Query("asc", pattern="^(asc|desc)$"),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    search: str | None = Query(None),
):
    offset = (page - 1) * page_size
    conditions = []
    params: list = []

    if search:
        conditions.append("(name ILIKE %s OR email ILIKE %s)")
        params.extend([f"%{search}%", f"%{search}%"])

    where = ("WHERE " + " AND ".join(conditions)) if conditions else ""

    # sort_by is validated by regex pattern — safe to interpolate
    order_clause = f"ORDER BY {sort_by} {order.upper()}"

    rows = db.fetchall(
        f"SELECT * FROM Customers {where} {order_clause} LIMIT %s OFFSET %s",
        params + [page_size, offset],
    )
    count_row = db.fetchone(
        f"SELECT COUNT(*) AS cnt FROM Customers {where}", params
    )
    return {"total": count_row["cnt"], "page": page, "page_size": page_size, "data": rows}


@router.get("/customers/{customer_id}")
def get_customer(customer_id: int):
    row = db.fetchone("SELECT * FROM Customers WHERE customerID = %s", (customer_id,))
    if not row:
        raise HTTPException(status_code=404, detail="Customer not found")
    # also return their liked artwork
    likes = db.fetchall(
        """
        SELECT aw.artworkID, aw.title, aw.style, aw.price, aw.isSold, ar.name AS artist_name
        FROM "Like" l
        JOIN Artwork aw ON aw.artworkID = l.artworkID
        JOIN Artists ar ON ar.artistID = l.artistID
        WHERE l.customerID = %s
        ORDER BY aw.title
        """,
        (customer_id,),
    )
    return {**row, "liked_artwork": likes}


@router.post("/customers", status_code=201)
def create_customer(body: CustomerIn):
    row = db.fetchone(
        """
        INSERT INTO Customers (name, phoneNum, email, moneySpent)
        VALUES (%s, %s, %s, %s) RETURNING *
        """,
        (body.name, body.phoneNum, body.email, body.moneySpent),
    )
    return row


@router.put("/customers/{customer_id}")
def update_customer(customer_id: int, body: CustomerIn):
    row = db.fetchone(
        """
        UPDATE Customers SET name=%s, phoneNum=%s, email=%s, moneySpent=%s
        WHERE customerID=%s RETURNING *
        """,
        (body.name, body.phoneNum, body.email, body.moneySpent, customer_id),
    )
    if not row:
        raise HTTPException(status_code=404, detail="Customer not found")
    return row


@router.delete("/customers/{customer_id}", status_code=204)
def delete_customer(customer_id: int):
    db.execute("DELETE FROM Customers WHERE customerID = %s", (customer_id,))

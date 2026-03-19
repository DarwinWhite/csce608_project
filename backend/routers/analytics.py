from fastapi import APIRouter
import database as db

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/artwork-by-style")
def artwork_by_style():
    return db.fetchall(
        """
        SELECT style, COUNT(*) AS count
        FROM Artwork
        GROUP BY style
        ORDER BY count DESC
        """
    )


@router.get("/sold-vs-available")
def sold_vs_available():
    return db.fetchall(
        """
        SELECT isSold, COUNT(*) AS count
        FROM Artwork
        GROUP BY isSold
        """
    )


@router.get("/price-distribution")
def price_distribution():
    """Return counts bucketed into price ranges."""
    return db.fetchall(
        """
        SELECT
            CASE
                WHEN price <    1000 THEN 'Under $1K'
                WHEN price <    5000 THEN '$1K–$5K'
                WHEN price <   10000 THEN '$5K–$10K'
                WHEN price <   50000 THEN '$10K–$50K'
                WHEN price <  100000 THEN '$50K–$100K'
                WHEN price <  250000 THEN '$100K–$250K'
                ELSE '$250K+'
            END AS bucket,
            COUNT(*) AS count
        FROM Artwork
        GROUP BY bucket
        ORDER BY MIN(price)
        """
    )


@router.get("/top-customers")
def top_customers(limit: int = 10):
    return db.fetchall(
        """
        SELECT customerID, name, moneySpent
        FROM Customers
        ORDER BY moneySpent DESC
        LIMIT %s
        """,
        (limit,),
    )


@router.get("/revenue-by-style")
def revenue_by_style():
    return db.fetchall(
        """
        SELECT style,
               SUM(price)  AS total_revenue,
               COUNT(*)    AS sold_count
        FROM Artwork
        WHERE isSold = TRUE
        GROUP BY style
        ORDER BY total_revenue DESC
        """
    )


@router.get("/artwork-by-year")
def artwork_by_year():
    return db.fetchall(
        """
        SELECT yearMade AS year, COUNT(*) AS count
        FROM Artwork
        GROUP BY yearMade
        ORDER BY yearMade
        """
    )


@router.get("/top-artists")
def top_artists(limit: int = 10):
    return db.fetchall(
        """
        SELECT ar.artistID, ar.name, ar.style,
               COUNT(aw.artworkID) AS artwork_count,
               COALESCE(SUM(CASE WHEN aw.isSold THEN aw.price ELSE 0 END), 0) AS total_revenue
        FROM Artists ar
        LEFT JOIN Artwork aw ON aw.artistID = ar.artistID
        GROUP BY ar.artistID, ar.name, ar.style
        ORDER BY artwork_count DESC
        LIMIT %s
        """,
        (limit,),
    )


@router.get("/staff-handles")
def staff_handles():
    return db.fetchall(
        """
        SELECT s.staffID, s.name, s.role, COUNT(h.artworkID) AS handles_count
        FROM Staff s
        LEFT JOIN Handles h ON h.staffID = s.staffID
        GROUP BY s.staffID, s.name, s.role
        ORDER BY handles_count DESC
        """
    )


@router.get("/liked-artists")
def liked_artists(limit: int = 10):
    return db.fetchall(
        """
        SELECT ar.artistID, ar.name, ar.style,
               COUNT(l.artworkID) AS like_count
        FROM "Like" l
        JOIN Artists ar ON ar.artistID = l.artistID
        GROUP BY ar.artistID, ar.name, ar.style
        ORDER BY like_count DESC
        LIMIT %s
        """,
        (limit,),
    )


@router.get("/summary")
def summary():
    """Quick dashboard numbers."""
    return db.fetchone(
        """
        SELECT
            (SELECT COUNT(*) FROM Artwork)                         AS total_artwork,
            (SELECT COUNT(*) FROM Artwork WHERE isSold = TRUE)     AS sold_artwork,
            (SELECT COALESCE(SUM(price),0) FROM Artwork
             WHERE isSold = TRUE)                                  AS total_revenue,
            (SELECT COUNT(*) FROM Artists)                         AS total_artists,
            (SELECT COUNT(*) FROM Customers)                       AS total_customers,
            (SELECT COUNT(*) FROM Staff)                           AS total_staff,
            (SELECT COUNT(*) FROM "Like")                          AS total_likes
        """
    )

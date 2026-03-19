"""
Seed script for the Art Gallery Management System.

Generates realistic-looking data using the Faker library and structured
vocabulary lists.  Runs automatically at app startup when the Gallery table
is empty (i.e., first launch).

Counts
------
Gallery   :   1
Artists   : 300
Customers : 5 000
Artwork   : 3 000
Staff     :  15
Like      : ~15 000 (unique per customer+artwork pair)
Handles   : ~200   (unique per staff+artwork pair)
"""

from __future__ import annotations

import random
import math
import logging
from faker import Faker

import database as db

log = logging.getLogger(__name__)
fake = Faker()
Faker.seed(42)
random.seed(42)

# ── Vocabulary ────────────────────────────────────────────────────────────────

STYLES = [
    "Impressionism", "Realism", "Abstract", "Surrealism",
    "Expressionism", "Modernism", "Baroque", "Romanticism",
    "Pop Art", "Minimalism", "Renaissance", "Cubism",
    "Art Nouveau", "Symbolism", "Neoclassicism",
]

MEDIUMS = [
    "Oil on canvas", "Watercolor", "Acrylic", "Sculpture",
    "Photography", "Digital", "Charcoal", "Mixed Media",
    "Pastel", "Fresco", "Ink", "Lithograph",
    "Bronze cast", "Gouache", "Encaustic",
]

ROLES = [
    "Gallery Manager", "Curator", "Registrar",
    "Sales Associate", "Art Advisor", "Receptionist",
    "Security Officer", "Conservator", "Archivist",
    "Events Coordinator",
]

ADJECTIVES = [
    "Eternal", "Shattered", "Luminous", "Forgotten", "Silent",
    "Golden", "Melancholy", "Wandering", "Fleeting", "Vibrant",
    "Chromatic", "Serene", "Crimson", "Dark", "Radiant",
    "Hollow", "Distant", "Trembling", "Cascading", "Infinite",
    "Fragile", "Ancient", "Celestial", "Amber", "Twilight",
    "Fading", "Desperate", "Translucent", "Burning", "Quiet",
]

SUBJECTS = [
    "Garden", "Horizon", "Portrait", "Storm", "Reflection",
    "Valley", "Ruins", "Figure", "Shore", "Nocturne",
    "Dream", "Elegy", "Vista", "Lament", "Reverie",
    "Solitude", "Cascade", "Prism", "Vision", "Memory",
    "Threshold", "Vessel", "Myth", "Fragment", "Landscape",
    "Tide", "Echo", "Silhouette", "Sanctuary", "Fugue",
]

LOCATIONS = [
    "at Dusk", "in Blue", "of Light", "in Shadow",
    "at Midnight", "in Ochre", "of the Moors", "in Red",
    "of Autumn", "at Dawn", "in Grey", "of the River",
    "in Crimson", "at Noon", "of the Sea", "in Amber",
    "of the Mountains", "in Green", "at Twilight", "",
    "", "", "",  # blank entries to make suffix optional ~30% of time
]


def _artwork_title() -> str:
    adj = random.choice(ADJECTIVES)
    subj = random.choice(SUBJECTS)
    loc = random.choice(LOCATIONS)
    if loc:
        return f"{adj} {subj} {loc}"
    return f"{adj} {subj}"


def _log_uniform(lo: float, hi: float) -> float:
    """Return a value log-uniformly distributed between lo and hi."""
    return math.exp(random.uniform(math.log(lo), math.log(hi)))


# ── Core seed function ────────────────────────────────────────────────────────

def seed_if_empty() -> None:
    """Entry-point called from app lifespan.  No-op if data already exists."""
    row = db.fetchone("SELECT COUNT(*) AS cnt FROM Gallery")
    if row and row["cnt"] > 0:
        log.info("Database already seeded — skipping.")
        return

    log.info("Seeding database …")
    _seed_gallery()
    artist_ids = _seed_artists()
    customer_ids = _seed_customers()
    artwork_rows = _seed_artwork(artist_ids)
    _seed_staff()
    _seed_likes(customer_ids, artwork_rows)
    _seed_handles(artwork_rows)
    _update_money_spent(customer_ids, artwork_rows)
    log.info("Seeding complete.")


# ── Individual seeders ────────────────────────────────────────────────────────

def _seed_gallery() -> None:
    db.execute(
        """
        INSERT INTO Gallery (name, address, openHours)
        VALUES (%s, %s, %s)
        """,
        (
            "The Meridian Art Gallery",
            "420 Exposition Blvd, Houston, TX 77004",
            "Tue–Fri 10:00 AM – 6:00 PM | Sat–Sun 11:00 AM – 8:00 PM | Mon Closed",
        ),
    )
    log.info("  Gallery inserted.")


def _seed_artists(n: int = 300) -> list[int]:
    rows = [
        (
            fake.name(),
            random.choice(STYLES),
            random.choice(MEDIUMS),
        )
        for _ in range(n)
    ]
    with db.get_conn() as conn:
        with conn.cursor() as cur:
            cur.executemany(
                "INSERT INTO Artists (name, style, medium) VALUES (%s, %s, %s)",
                rows,
            )
            cur.execute("SELECT artistID FROM Artists ORDER BY artistID")
            ids = [r[0] for r in cur.fetchall()]
    log.info("  %d artists inserted.", len(ids))
    return ids


def _seed_customers(n: int = 5000) -> list[int]:
    rows: list[tuple] = []
    seen_emails: set[str] = set()
    while len(rows) < n:
        email = fake.unique.email()
        if email in seen_emails:
            continue
        seen_emails.add(email)
        rows.append((fake.name(), fake.numerify("(###) ###-####"), email, 0.00))

    with db.get_conn() as conn:
        with conn.cursor() as cur:
            cur.executemany(
                "INSERT INTO Customers (name, phoneNum, email, moneySpent) VALUES (%s, %s, %s, %s)",
                rows,
            )
            cur.execute("SELECT customerID FROM Customers ORDER BY customerID")
            ids = [r[0] for r in cur.fetchall()]
    log.info("  %d customers inserted.", len(ids))
    return ids


def _seed_artwork(artist_ids: list[int], n: int = 3000) -> list[dict]:
    """Returns list of dicts {artworkID, artistID, price, isSold}."""
    rows = []
    for _ in range(n):
        artist_id = random.choice(artist_ids)
        price = round(_log_uniform(500, 500_000), 2)
        is_sold = random.random() < 0.40
        rows.append((
            _artwork_title(),
            random.randint(1890, 2024),
            random.choice(STYLES),
            price,
            is_sold,
            artist_id,
            1,  # galleryID — only one gallery
        ))

    with db.get_conn() as conn:
        with conn.cursor() as cur:
            cur.executemany(
                """
                INSERT INTO Artwork (title, yearMade, style, price, isSold, artistID, galleryID)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                """,
                rows,
            )
            cur.execute(
                "SELECT artworkID, artistID, price, isSold FROM Artwork ORDER BY artworkID"
            )
            artwork_rows = [
                {"artworkID": r[0], "artistID": r[1], "price": float(r[2]), "isSold": r[3]}
                for r in cur.fetchall()
            ]
    log.info("  %d artworks inserted.", len(artwork_rows))
    return artwork_rows


def _seed_staff(n: int = 15) -> None:
    rows = [
        (
            fake.name(),
            fake.numerify("(###) ###-####"),
            random.choice(ROLES),
            1,  # galleryID
        )
        for _ in range(n)
    ]
    with db.get_conn() as conn:
        with conn.cursor() as cur:
            cur.executemany(
                "INSERT INTO Staff (name, phoneNum, role, galleryID) VALUES (%s, %s, %s, %s)",
                rows,
            )
    log.info("  %d staff inserted.", n)


def _seed_likes(customer_ids: list[int], artwork_rows: list[dict], n: int = 15000) -> None:
    """Generate n unique (customerID, artworkID, artistID) likes."""
    seen: set[tuple[int, int]] = set()
    rows: list[tuple[int, int, int]] = []

    attempts = 0
    max_attempts = n * 10
    while len(rows) < n and attempts < max_attempts:
        attempts += 1
        c = random.choice(customer_ids)
        aw = random.choice(artwork_rows)
        key = (c, aw["artworkID"])
        if key in seen:
            continue
        seen.add(key)
        rows.append((c, aw["artworkID"], aw["artistID"]))

    with db.get_conn() as conn:
        with conn.cursor() as cur:
            cur.executemany(
                'INSERT INTO "Like" (customerID, artworkID, artistID) VALUES (%s, %s, %s)',
                rows,
            )
    log.info("  %d likes inserted.", len(rows))


def _seed_handles(artwork_rows: list[dict], n: int = 200) -> None:
    """Assign ~200 artwork–staff pairs to Handles."""
    with db.get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT staffID FROM Staff ORDER BY staffID")
            staff_ids = [r[0] for r in cur.fetchall()]

    seen: set[tuple[int, int]] = set()
    rows: list[tuple[int, int]] = []
    attempts = 0
    while len(rows) < n and attempts < n * 20:
        attempts += 1
        s = random.choice(staff_ids)
        aw = random.choice(artwork_rows)
        key = (s, aw["artworkID"])
        if key in seen:
            continue
        seen.add(key)
        rows.append((s, aw["artworkID"]))

    with db.get_conn() as conn:
        with conn.cursor() as cur:
            cur.executemany(
                "INSERT INTO Handles (staffID, artworkID) VALUES (%s, %s)",
                rows,
            )
    log.info("  %d handles inserted.", len(rows))


def _update_money_spent(customer_ids: list[int], artwork_rows: list[dict]) -> None:
    """
    For every sold artwork, randomly assign a buyer and increment moneySpent.
    Uses a single batch UPDATE per customer via aggregation in Python.
    """
    sold = [aw for aw in artwork_rows if aw["isSold"]]
    spending: dict[int, float] = {}
    for aw in sold:
        buyer = random.choice(customer_ids)
        spending[buyer] = spending.get(buyer, 0.0) + aw["price"]

    rows = [(round(amt, 2), cid) for cid, amt in spending.items()]
    with db.get_conn() as conn:
        with conn.cursor() as cur:
            cur.executemany(
                "UPDATE Customers SET moneySpent = moneySpent + %s WHERE customerID = %s",
                rows,
            )
    log.info("  moneySpent updated for %d customers.", len(rows))

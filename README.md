# Art Gallery Management System

A full-stack database web application for managing an art gallery. Built as a showcase of relational database design and SQL, the system models a real gallery's data — artwork, artists, customers, staff, and sales — and exposes it through three role-based web interfaces.

## Overview

The application is backed by a **PostgreSQL** relational database and served by a **FastAPI** backend. All data access uses raw SQL (no ORM) to demonstrate query design across joins, aggregations, filters, and pagination. The frontend is plain HTML, CSS, and JavaScript with **Chart.js** for data visualizations.

On first launch, a seed script automatically populates the database with realistic simulated data:

| Table | Count |
|---|---|
| Gallery | 1 (The Meridian Art Gallery) |
| Artists | 300 |
| Customers | 5,000 |
| Artwork | 3,000 |
| Staff | 15 |
| Likes | ~15,000 |
| Handles | ~200 |

## Relational Schema

```
Customers(customerID, name, phoneNum, email, moneySpent)
Artists(artistID, name, style, medium)
Artwork(artworkID, title, yearMade, style, price, isSold, artistID→Artists, galleryID→Gallery)
Staff(staffID, name, phoneNum, role, galleryID→Gallery)
Gallery(galleryID, name, address, openHours)
Like(customerID→Customers, artworkID→Artwork, artistID→Artists)
Handles(staffID→Staff, artworkID→Artwork)
```

## Interfaces

### Visitor Page (`/`)
Browse the gallery's full collection. Filter artwork by style, price range, and availability. View all artists sorted by style. Includes four Chart.js charts: artwork count by style, sold vs. available breakdown, artwork distribution by year, and price range histogram.

### Staff Page (`/staff.html`)
Select an active staff member to view and manage their assigned artwork. Mark pieces as sold, unassign artwork, add new artwork to the gallery, and assign existing pieces. Includes a searchable read-only customer lookup table.

### Management Page (`/management.html`)
Full CRUD management for all entities (Artwork, Artists, Customers, Staff) in a tabbed layout with inline edit/delete modals. An Analytics tab displays six charts: revenue by style, top customers by spending, top artists by artwork count, staff assignment distribution, most-liked artists, and artwork added by year.

## Tech Stack

| Layer | Technology |
|---|---|
| Database | PostgreSQL 15 |
| Backend | Python 3.11, FastAPI, psycopg2 |
| Package manager | uv |
| Seed data | Faker |
| Frontend | HTML, CSS, JavaScript |
| Charts | Chart.js 4 |
| Containerization | Docker + Docker Compose |

## Setup & Running

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/) installed and running.

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd csce608_project
```

### 2. Start the application

```bash
docker compose up --build
```

This will:
1. Pull the `postgres:15` image and start the database.
2. Build the backend image (installs all Python dependencies via `uv`).
3. Apply the schema (`database/schema.sql`) to the database automatically.
4. Start the FastAPI server, which seeds the database on first launch (takes ~1–2 minutes).

### 3. Open the app

Once you see `Seeding complete.` in the logs, open your browser:

| Interface | URL |
|---|---|
| Visitor | http://localhost:8000 |
| Staff | http://localhost:8000/staff.html |
| Management | http://localhost:8000/management.html |
| API docs (Swagger) | http://localhost:8000/docs |

### Stopping

```bash
docker compose down
```

The database volume (`postgres_data`) is preserved between restarts. On subsequent `docker compose up` runs, seeding is skipped automatically.

To fully reset the database (wipe all data):

```bash
docker compose down -v
```

## Project Structure

```
csce608_project/
├── docker-compose.yml
├── database/
│   └── schema.sql              # Table definitions and indexes
└── backend/
    ├── Dockerfile
    ├── pyproject.toml
    ├── main.py                 # FastAPI app entry point
    ├── database.py             # Connection pool and query helpers
    ├── routers/
    │   ├── gallery.py
    │   ├── artists.py
    │   ├── artwork.py
    │   ├── customers.py
    │   ├── staff.py
    │   ├── handles.py
    │   └── analytics.py        # Aggregation and chart data endpoints
    ├── seed/
    │   └── seed_data.py        # Faker-based data generator
    └── static/
        ├── index.html          # Visitor interface
        ├── staff.html          # Staff interface
        ├── management.html     # Management interface
        ├── css/styles.css
        └── js/
            ├── common.js
            ├── user.js
            ├── staff.js
            └── management.js
```

## API Reference

All endpoints are prefixed with `/api`. Interactive documentation is available at `/docs`.

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/gallery` | Gallery info |
| GET | `/api/artists` | List artists (filter, paginate) |
| GET/POST/PUT/DELETE | `/api/artists/{id}` | Artist CRUD |
| GET | `/api/artwork` | List artwork (filter by style, price, sold, artist) |
| GET/POST/PUT/DELETE | `/api/artwork/{id}` | Artwork CRUD |
| GET | `/api/customers` | List customers (search, sort, paginate) |
| GET/POST/PUT/DELETE | `/api/customers/{id}` | Customer CRUD |
| GET | `/api/staff` | List staff with handle counts |
| GET/POST/PUT/DELETE | `/api/staff/{id}` | Staff CRUD |
| GET | `/api/staff/{id}/handles` | Artwork assigned to a staff member |
| POST | `/api/handles` | Assign artwork to staff |
| DELETE | `/api/handles/{staff_id}/{artwork_id}` | Unassign artwork |
| GET | `/api/analytics/summary` | Dashboard totals |
| GET | `/api/analytics/artwork-by-style` | Artwork count per style |
| GET | `/api/analytics/sold-vs-available` | Sold vs available counts |
| GET | `/api/analytics/price-distribution` | Price range histogram |
| GET | `/api/analytics/top-customers` | Top customers by spending |
| GET | `/api/analytics/revenue-by-style` | Revenue grouped by style |
| GET | `/api/analytics/artwork-by-year` | Artwork count per year |
| GET | `/api/analytics/top-artists` | Top artists by artwork count |
| GET | `/api/analytics/staff-handles` | Artwork assignments per staff |
| GET | `/api/analytics/liked-artists` | Most liked artists |

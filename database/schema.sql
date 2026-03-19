-- Art Gallery Management System
-- Schema: dependencies are respected (referenced tables created first)

-- ============================================================
-- Gallery
-- ============================================================
CREATE TABLE IF NOT EXISTS Gallery (
    galleryID   SERIAL PRIMARY KEY,
    name        VARCHAR(200) NOT NULL,
    address     VARCHAR(300) NOT NULL,
    openHours   VARCHAR(200) NOT NULL
);

-- ============================================================
-- Artists
-- ============================================================
CREATE TABLE IF NOT EXISTS Artists (
    artistID    SERIAL PRIMARY KEY,
    name        VARCHAR(200) NOT NULL,
    style       VARCHAR(100) NOT NULL,
    medium      VARCHAR(100) NOT NULL
);

-- ============================================================
-- Customers
-- ============================================================
CREATE TABLE IF NOT EXISTS Customers (
    customerID  SERIAL PRIMARY KEY,
    name        VARCHAR(200) NOT NULL,
    phoneNum    VARCHAR(30)  NOT NULL,
    email       VARCHAR(200) NOT NULL UNIQUE,
    moneySpent  NUMERIC(12, 2) NOT NULL DEFAULT 0.00
);

-- ============================================================
-- Artwork  (references Artists + Gallery)
-- ============================================================
CREATE TABLE IF NOT EXISTS Artwork (
    artworkID   SERIAL PRIMARY KEY,
    title       VARCHAR(300) NOT NULL,
    yearMade    INT          NOT NULL,
    style       VARCHAR(100) NOT NULL,
    price       NUMERIC(12, 2) NOT NULL,
    isSold      BOOLEAN      NOT NULL DEFAULT FALSE,
    artistID    INT          NOT NULL REFERENCES Artists(artistID)  ON DELETE CASCADE,
    galleryID   INT          NOT NULL REFERENCES Gallery(galleryID) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_artwork_artistid  ON Artwork(artistID);
CREATE INDEX IF NOT EXISTS idx_artwork_galleryid ON Artwork(galleryID);
CREATE INDEX IF NOT EXISTS idx_artwork_style     ON Artwork(style);
CREATE INDEX IF NOT EXISTS idx_artwork_issold    ON Artwork(isSold);

-- ============================================================
-- Staff  (references Gallery)
-- ============================================================
CREATE TABLE IF NOT EXISTS Staff (
    staffID     SERIAL PRIMARY KEY,
    name        VARCHAR(200) NOT NULL,
    phoneNum    VARCHAR(30)  NOT NULL,
    role        VARCHAR(100) NOT NULL,
    galleryID   INT          NOT NULL REFERENCES Gallery(galleryID) ON DELETE CASCADE
);

-- ============================================================
-- Like  (composite PK; all three columns are FKs)
-- artistID is independently stored per schema spec, but is
-- always == Artwork.artistID for the referenced artwork.
-- ============================================================
CREATE TABLE IF NOT EXISTS "Like" (
    customerID  INT NOT NULL REFERENCES Customers(customerID) ON DELETE CASCADE,
    artworkID   INT NOT NULL REFERENCES Artwork(artworkID)    ON DELETE CASCADE,
    artistID    INT NOT NULL REFERENCES Artists(artistID)     ON DELETE CASCADE,
    PRIMARY KEY (customerID, artworkID, artistID)
);

CREATE INDEX IF NOT EXISTS idx_like_artistid  ON "Like"(artistID);
CREATE INDEX IF NOT EXISTS idx_like_artworkid ON "Like"(artworkID);

-- ============================================================
-- Handles  (composite PK)
-- ============================================================
CREATE TABLE IF NOT EXISTS Handles (
    staffID     INT NOT NULL REFERENCES Staff(staffID)    ON DELETE CASCADE,
    artworkID   INT NOT NULL REFERENCES Artwork(artworkID) ON DELETE CASCADE,
    PRIMARY KEY (staffID, artworkID)
);

CREATE INDEX IF NOT EXISTS idx_handles_staffid ON Handles(staffID);

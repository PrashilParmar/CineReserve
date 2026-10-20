
-- CineReserve Database Schema
-- Compatible with Oracle Database 11g XE
-- Run as the CINERESERVE user in a fresh schema.

CREATE TABLE Users (
    user_id NUMBER PRIMARY KEY,
    full_name VARCHAR2(100) NOT NULL,
    email VARCHAR2(150) NOT NULL UNIQUE,
    phone VARCHAR2(20),
    password_hash VARCHAR2(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE SEQUENCE users_seq START WITH 1 INCREMENT BY 1 NOCACHE;

CREATE OR REPLACE TRIGGER users_bir
BEFORE INSERT ON Users
FOR EACH ROW
WHEN (NEW.user_id IS NULL)
BEGIN
    :NEW.user_id := users_seq.NEXTVAL;
END;
/

CREATE TABLE Movies (
    movie_id NUMBER PRIMARY KEY,
    title VARCHAR2(150) NOT NULL,
    genre VARCHAR2(60),
    language VARCHAR2(40),
    duration_minutes NUMBER NOT NULL,
    certificate VARCHAR2(10),
    release_date DATE,
    description VARCHAR2(1000),
    CONSTRAINT chk_movie_duration CHECK (duration_minutes > 0)
);

CREATE SEQUENCE movies_seq START WITH 1 INCREMENT BY 1 NOCACHE;

CREATE OR REPLACE TRIGGER movies_bir
BEFORE INSERT ON Movies
FOR EACH ROW
WHEN (NEW.movie_id IS NULL)
BEGIN
    :NEW.movie_id := movies_seq.NEXTVAL;
END;
/

CREATE TABLE Theatres (
    theatre_id NUMBER PRIMARY KEY,
    theatre_name VARCHAR2(150) NOT NULL,
    city VARCHAR2(80) NOT NULL,
    address VARCHAR2(250)
);

CREATE SEQUENCE theatres_seq START WITH 1 INCREMENT BY 1 NOCACHE;

CREATE OR REPLACE TRIGGER theatres_bir
BEFORE INSERT ON Theatres
FOR EACH ROW
WHEN (NEW.theatre_id IS NULL)
BEGIN
    :NEW.theatre_id := theatres_seq.NEXTVAL;
END;
/

CREATE TABLE Screens (
    screen_id NUMBER PRIMARY KEY,
    theatre_id NUMBER NOT NULL,
    screen_name VARCHAR2(50) NOT NULL,
    screen_type VARCHAR2(30),
    CONSTRAINT fk_screen_theatre
        FOREIGN KEY (theatre_id) REFERENCES Theatres(theatre_id),
    CONSTRAINT uq_screen_name UNIQUE (theatre_id, screen_name)
);

CREATE SEQUENCE screens_seq START WITH 1 INCREMENT BY 1 NOCACHE;

CREATE OR REPLACE TRIGGER screens_bir
BEFORE INSERT ON Screens
FOR EACH ROW
WHEN (NEW.screen_id IS NULL)
BEGIN
    :NEW.screen_id := screens_seq.NEXTVAL;
END;
/

CREATE TABLE Seats (
    seat_id NUMBER PRIMARY KEY,
    screen_id NUMBER NOT NULL,
    seat_row VARCHAR2(5) NOT NULL,
    seat_number NUMBER NOT NULL,
    seat_type VARCHAR2(30),
    seat_price NUMBER(10,2) DEFAULT 0 NOT NULL,
    CONSTRAINT fk_seat_screen
        FOREIGN KEY (screen_id) REFERENCES Screens(screen_id),
    CONSTRAINT uq_screen_seat
        UNIQUE (screen_id, seat_row, seat_number),
    CONSTRAINT chk_seat_price CHECK (seat_price >= 0),
    CONSTRAINT chk_seat_number CHECK (seat_number > 0)
);

CREATE SEQUENCE seats_seq START WITH 1 INCREMENT BY 1 NOCACHE;

CREATE OR REPLACE TRIGGER seats_bir
BEFORE INSERT ON Seats
FOR EACH ROW
WHEN (NEW.seat_id IS NULL)
BEGIN
    :NEW.seat_id := seats_seq.NEXTVAL;
END;
/

CREATE TABLE Movie_Shows (
    show_id NUMBER PRIMARY KEY,
    movie_id NUMBER NOT NULL,
    screen_id NUMBER NOT NULL,
    show_time TIMESTAMP NOT NULL,
    base_price NUMBER(10,2) NOT NULL,
    CONSTRAINT fk_show_movie
        FOREIGN KEY (movie_id) REFERENCES Movies(movie_id),
    CONSTRAINT fk_show_screen
        FOREIGN KEY (screen_id) REFERENCES Screens(screen_id),
    CONSTRAINT chk_show_price CHECK (base_price >= 0)
);

CREATE SEQUENCE movie_shows_seq START WITH 1 INCREMENT BY 1 NOCACHE;

CREATE OR REPLACE TRIGGER movie_shows_bir
BEFORE INSERT ON Movie_Shows
FOR EACH ROW
WHEN (NEW.show_id IS NULL)
BEGIN
    :NEW.show_id := movie_shows_seq.NEXTVAL;
END;
/

CREATE TABLE Bookings (
    booking_id NUMBER PRIMARY KEY,
    user_id NUMBER NOT NULL,
    show_id NUMBER NOT NULL,
    booking_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    booking_status VARCHAR2(20) DEFAULT 'PENDING' NOT NULL,
    total_amount NUMBER(10,2) DEFAULT 0 NOT NULL,
    CONSTRAINT fk_booking_user
        FOREIGN KEY (user_id) REFERENCES Users(user_id),
    CONSTRAINT fk_booking_show
        FOREIGN KEY (show_id) REFERENCES Movie_Shows(show_id),
    CONSTRAINT chk_booking_status
        CHECK (booking_status IN ('PENDING','CONFIRMED','CANCELLED')),
    CONSTRAINT chk_booking_amount CHECK (total_amount >= 0)
);

CREATE SEQUENCE bookings_seq START WITH 1 INCREMENT BY 1 NOCACHE;

CREATE OR REPLACE TRIGGER bookings_bir
BEFORE INSERT ON Bookings
FOR EACH ROW
WHEN (NEW.booking_id IS NULL)
BEGIN
    :NEW.booking_id := bookings_seq.NEXTVAL;
END;
/

CREATE TABLE Show_Seats (
    show_seat_id NUMBER PRIMARY KEY,
    show_id NUMBER NOT NULL,
    seat_id NUMBER NOT NULL,
    seat_status VARCHAR2(20) DEFAULT 'AVAILABLE' NOT NULL,
    CONSTRAINT fk_showseat_show
        FOREIGN KEY (show_id) REFERENCES Movie_Shows(show_id),
    CONSTRAINT fk_showseat_seat
        FOREIGN KEY (seat_id) REFERENCES Seats(seat_id),
    CONSTRAINT uq_show_seat UNIQUE (show_id, seat_id),
    CONSTRAINT chk_showseat_status
        CHECK (seat_status IN ('AVAILABLE','BOOKED','BLOCKED'))
);

CREATE SEQUENCE show_seats_seq START WITH 1 INCREMENT BY 1 NOCACHE;

CREATE OR REPLACE TRIGGER show_seats_bir
BEFORE INSERT ON Show_Seats
FOR EACH ROW
WHEN (NEW.show_seat_id IS NULL)
BEGIN
    :NEW.show_seat_id := show_seats_seq.NEXTVAL;
END;
/

CREATE TABLE Tickets (
    ticket_id NUMBER PRIMARY KEY,
    booking_id NUMBER NOT NULL,
    show_seat_id NUMBER NOT NULL,
    ticket_price NUMBER(10,2) NOT NULL,
    ticket_status VARCHAR2(20) DEFAULT 'VALID' NOT NULL,
    CONSTRAINT fk_ticket_booking
        FOREIGN KEY (booking_id) REFERENCES Bookings(booking_id),
    CONSTRAINT fk_ticket_showseat
        FOREIGN KEY (show_seat_id) REFERENCES Show_Seats(show_seat_id),
    CONSTRAINT uq_ticket_showseat UNIQUE (show_seat_id),
    CONSTRAINT chk_ticket_price CHECK (ticket_price >= 0),
    CONSTRAINT chk_ticket_status CHECK (ticket_status IN ('VALID','CANCELLED'))
);

CREATE SEQUENCE tickets_seq START WITH 1 INCREMENT BY 1 NOCACHE;

CREATE OR REPLACE TRIGGER tickets_bir
BEFORE INSERT ON Tickets
FOR EACH ROW
WHEN (NEW.ticket_id IS NULL)
BEGIN
    :NEW.ticket_id := tickets_seq.NEXTVAL;
END;
/

CREATE TABLE Payments (
    payment_id NUMBER PRIMARY KEY,
    booking_id NUMBER NOT NULL,
    payment_method VARCHAR2(30) NOT NULL,
    payment_status VARCHAR2(20) DEFAULT 'PENDING' NOT NULL,
    amount NUMBER(10,2) NOT NULL,
    transaction_ref VARCHAR2(100) UNIQUE,
    payment_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_payment_booking
        FOREIGN KEY (booking_id) REFERENCES Bookings(booking_id),
    CONSTRAINT chk_payment_status
        CHECK (payment_status IN ('PENDING','SUCCESS','FAILED','REFUNDED')),
    CONSTRAINT chk_payment_amount CHECK (amount >= 0)
);

CREATE SEQUENCE payments_seq START WITH 1 INCREMENT BY 1 NOCACHE;

CREATE OR REPLACE TRIGGER payments_bir
BEFORE INSERT ON Payments
FOR EACH ROW
WHEN (NEW.payment_id IS NULL)
BEGIN
    :NEW.payment_id := payments_seq.NEXTVAL;
END;
/

-- Indexes for common joins and searches
CREATE INDEX idx_screens_theatre ON Screens(theatre_id);
CREATE INDEX idx_seats_screen ON Seats(screen_id);
CREATE INDEX idx_shows_movie ON Movie_Shows(movie_id);
CREATE INDEX idx_shows_screen_time ON Movie_Shows(screen_id, show_time);
CREATE INDEX idx_bookings_user ON Bookings(user_id);
CREATE INDEX idx_bookings_show ON Bookings(show_id);
CREATE INDEX idx_show_seats_status ON Show_Seats(show_id, seat_status);
CREATE INDEX idx_tickets_booking ON Tickets(booking_id);
CREATE INDEX idx_payments_booking ON Payments(booking_id);

-- Show availability view
CREATE OR REPLACE VIEW vw_show_availability AS
SELECT
    ms.show_id,
    m.title AS movie_title,
    th.theatre_name,
    th.city,
    sc.screen_name,
    ms.show_time,
    COUNT(ss.show_seat_id) AS total_seats,
    SUM(
        CASE
            WHEN ss.seat_status = 'AVAILABLE' THEN 1
            ELSE 0
        END
    ) AS available_seats,
    ms.base_price
FROM Movie_Shows ms
JOIN Movies m ON m.movie_id = ms.movie_id
JOIN Screens sc ON sc.screen_id = ms.screen_id
JOIN Theatres th ON th.theatre_id = sc.theatre_id
LEFT JOIN Show_Seats ss ON ss.show_id = ms.show_id
GROUP BY
    ms.show_id,
    m.title,
    th.theatre_name,
    th.city,
    sc.screen_name,
    ms.show_time,
    ms.base_price;

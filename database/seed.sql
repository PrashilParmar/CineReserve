
-- CineReserve sample data
-- Oracle Database 11g XE
-- Run only after schema.sql on a fresh, empty schema.

-- Movies
INSERT INTO Movies
(movie_id, title, genre, language, duration_minutes, certificate, release_date, description)
VALUES
(1, 'Kalki 2898 AD', 'Sci-Fi', 'Hindi', 181, 'UA', DATE '2024-06-27',
 'Science fiction adventure');

INSERT INTO Movies
(movie_id, title, genre, language, duration_minutes, certificate, release_date, description)
VALUES
(2, 'Stree 2', 'Horror Comedy', 'Hindi', 149, 'UA', DATE '2024-08-15',
 'Horror comedy');

INSERT INTO Movies
(movie_id, title, genre, language, duration_minutes, certificate, release_date, description)
VALUES
(3, 'Avengers Endgame', 'Action', 'English', 181, 'UA', DATE '2019-04-26',
 'Superhero action adventure');

-- Theatres
INSERT INTO Theatres
(theatre_id, theatre_name, city, address)
VALUES (1, 'CineReserve Central', 'Indore', 'MG Road, Indore');

INSERT INTO Theatres
(theatre_id, theatre_name, city, address)
VALUES (2, 'CineReserve Galaxy', 'Bhopal', 'MP Nagar, Bhopal');

-- Screens
INSERT INTO Screens
(screen_id, theatre_id, screen_name, screen_type)
VALUES (1, 1, 'Screen 1', '2D');

INSERT INTO Screens
(screen_id, theatre_id, screen_name, screen_type)
VALUES (2, 1, 'Screen 2', '3D');

INSERT INTO Screens
(screen_id, theatre_id, screen_name, screen_type)
VALUES (3, 2, 'Screen 1', '2D');

-- Seats
INSERT INTO Seats
(seat_id, screen_id, seat_row, seat_number, seat_type, seat_price)
VALUES (1, 1, 'A', 1, 'REGULAR', 150);

INSERT INTO Seats
(seat_id, screen_id, seat_row, seat_number, seat_type, seat_price)
VALUES (2, 1, 'A', 2, 'REGULAR', 150);

INSERT INTO Seats
(seat_id, screen_id, seat_row, seat_number, seat_type, seat_price)
VALUES (3, 2, 'A', 1, 'PREMIUM', 220);

INSERT INTO Seats
(seat_id, screen_id, seat_row, seat_number, seat_type, seat_price)
VALUES (4, 2, 'A', 2, 'PREMIUM', 220);

INSERT INTO Seats
(seat_id, screen_id, seat_row, seat_number, seat_type, seat_price)
VALUES (5, 3, 'A', 1, 'REGULAR', 160);

INSERT INTO Seats
(seat_id, screen_id, seat_row, seat_number, seat_type, seat_price)
VALUES (6, 3, 'A', 2, 'REGULAR', 160);

-- Shows
INSERT INTO Movie_Shows
(show_id, movie_id, screen_id, show_time, base_price)
VALUES (1, 1, 1, TIMESTAMP '2026-10-20 18:30:00', 180);

INSERT INTO Movie_Shows
(show_id, movie_id, screen_id, show_time, base_price)
VALUES (2, 2, 2, TIMESTAMP '2026-10-21 19:00:00', 220);

INSERT INTO Movie_Shows
(show_id, movie_id, screen_id, show_time, base_price)
VALUES (3, 3, 3, TIMESTAMP '2026-10-22 17:30:00', 160);

-- Create show-specific seat availability
INSERT INTO Show_Seats (show_id, seat_id, seat_status)
SELECT ms.show_id, s.seat_id, 'AVAILABLE'
FROM Movie_Shows ms
JOIN Seats s ON s.screen_id = ms.screen_id;

-- Demo user
INSERT INTO Users
(user_id, full_name, email, phone, password_hash)
VALUES
(1, 'Demo Customer', 'demo@cinereserve.test', '9000000001',
 'DEMO_HASH_NOT_FOR_LOGIN');

-- Demo booking
INSERT INTO Bookings
(booking_id, user_id, show_id, booking_status, total_amount)
VALUES (1, 1, 1, 'CONFIRMED', 180);

-- Mark seat A1 for show 1 as booked
UPDATE Show_Seats
SET seat_status = 'BOOKED'
WHERE show_id = 1 AND seat_id = 1;

-- Demo ticket
INSERT INTO Tickets
(ticket_id, booking_id, show_seat_id, ticket_price, ticket_status)
SELECT 1, 1, show_seat_id, 180, 'VALID'
FROM Show_Seats
WHERE show_id = 1 AND seat_id = 1;

-- Demo payment
INSERT INTO Payments
(payment_id, booking_id, payment_method, payment_status, amount, transaction_ref)
VALUES (1, 1, 'UPI', 'SUCCESS', 180, 'DEMO-TXN-0001');

COMMIT;


import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class BookingHandler {

    public static void register(HttpServer server) {

        // Existing booking API
        server.createContext("/api/bookings", exchange -> {
            if ("OPTIONS".equalsIgnoreCase(
                    exchange.getRequestMethod())) {
                send(exchange, 200, "{}");
                return;
            }

            if (!"POST".equalsIgnoreCase(
                    exchange.getRequestMethod())) {
                send(exchange, 405,
                        "{\"error\":\"POST method required\"}");
                return;
            }

            handleBooking(exchange);
        });

        // New API: Get seats for a particular show
        server.createContext("/api/seats", exchange -> {
            if ("OPTIONS".equalsIgnoreCase(
                    exchange.getRequestMethod())) {
                send(exchange, 200, "{}");
                return;
            }

            if (!"GET".equalsIgnoreCase(
                    exchange.getRequestMethod())) {
                send(exchange, 405,
                        "{\"error\":\"GET method required\"}");
                return;
            }

            try {
                String query =
                        exchange.getRequestURI().getQuery();

                int showId = -1;

                if (query != null) {
                    for (String parameter : query.split("&")) {
                        String[] parts = parameter.split("=", 2);

                        if (parts.length == 2
                                && "showId".equals(parts[0])) {
                            showId = Integer.parseInt(parts[1]);
                            break;
                        }
                    }
                }

                if (showId <= 0) {
                    send(exchange, 400,
                            "{\"error\":\"Valid showId required\"}");
                    return;
                }

                String sql =
                    "SELECT ss.show_seat_id, s.seat_id, " +
                    "s.seat_row, s.seat_number, s.seat_type, " +
                    "ms.base_price AS price, ss.seat_status " +
                    "FROM show_seats ss " +
                    "JOIN seats s ON s.seat_id = ss.seat_id " +
                    "JOIN movie_shows ms ON ms.show_id = ss.show_id " +
                    "WHERE ss.show_id = ? " +
                    "ORDER BY s.seat_row, s.seat_number";

                try (Connection connection =
                             DatabaseConnection.getConnection();
                     PreparedStatement statement =
                             connection.prepareStatement(sql)) {

                    statement.setInt(1, showId);

                    try (ResultSet rs = statement.executeQuery()) {
                        StringBuilder json = new StringBuilder("[");
                        boolean first = true;

                        while (rs.next()) {
                            if (!first) {
                                json.append(",");
                            }

                            first = false;

                            json.append("{")
                                .append("\"showSeatId\":")
                                .append(rs.getInt("show_seat_id"))
                                .append(",\"seatId\":")
                                .append(rs.getInt("seat_id"))
                                .append(",\"row\":\"")
                                .append(rs.getString("seat_row"))
                                .append("\",\"number\":")
                                .append(rs.getInt("seat_number"))
                                .append(",\"type\":\"")
                                .append(rs.getString("seat_type"))
                                .append("\",\"price\":")
                                .append(rs.getBigDecimal("price"))
                                .append(",\"status\":\"")
                                .append(rs.getString("seat_status"))
                                .append("\"}");
                        }

                        json.append("]");
                        send(exchange, 200, json.toString());
                    }

                } catch (SQLException e) {
                    e.printStackTrace();
                    send(exchange, 500,
                            "{\"error\":\"Could not load seats\"}");
                }

            } catch (NumberFormatException e) {
                send(exchange, 400,
                        "{\"error\":\"Invalid showId\"}");
            } catch (IOException e) {
                throw e;
            } catch (Exception e) {
                e.printStackTrace();
                send(exchange, 500,
                        "{\"error\":\"Unexpected server error\"}");
            }
        });
    }

    private static void handleBooking(
            HttpExchange exchange) throws IOException {

        try {
            String body = readBody(exchange.getRequestBody());

        

Integer authenticatedUserId = AuthHandler.authenticatedUser(exchange);

if (authenticatedUserId == null) {
    send(exchange, 401,
            "{\"error\":\"Login required\"}");
    return;
}

int showId = getNumber(body, "showId");
int showSeatId = getNumber(body, "showSeatId");

if (showId <= 0 || showSeatId <= 0) {
    send(exchange, 400,
            "{\"error\":\"Show and seat IDs must be positive numbers\"}");
    return;
}

createBooking(exchange, authenticatedUserId, showId, showSeatId);
        } catch (IllegalArgumentException e) {
            send(exchange, 400,
                    "{\"error\":\"Invalid booking request\"}");
        }
    }

    private static void createBooking(
            HttpExchange exchange,
            int userId,
            int showId,
            int showSeatId) throws IOException {

        try (Connection connection =
                     DatabaseConnection.getConnection()) {

            connection.setAutoCommit(false);

            try {
                String seatStatus;
                BigDecimal basePrice;

                String checkSql =
                    "SELECT ss.seat_status, ms.base_price " +
                    "FROM show_seats ss " +
                    "JOIN movie_shows ms ON ms.show_id = ss.show_id " +
                    "WHERE ss.show_seat_id = ? " +
                    "AND ss.show_id = ? " +
                    "FOR UPDATE OF ss.seat_status";

                try (PreparedStatement statement =
                             connection.prepareStatement(checkSql)) {

                    statement.setInt(1, showSeatId);
                    statement.setInt(2, showId);

                    try (ResultSet rs = statement.executeQuery()) {
                        if (!rs.next()) {
                            connection.rollback();
                            send(exchange, 404,
                                "{\"error\":\"Show seat not found\"}");
                            return;
                        }

                        seatStatus = rs.getString("seat_status");
                        basePrice = rs.getBigDecimal("base_price");
                    }
                }

                if (!"AVAILABLE".equalsIgnoreCase(seatStatus)) {
                    connection.rollback();
                    send(exchange, 409,
                        "{\"error\":\"Seat is not available\"}");
                    return;
                }

                String updateSeatSql =
                    "UPDATE show_seats " +
                    "SET seat_status = 'BOOKED' " +
                    "WHERE show_seat_id = ? " +
                    "AND show_id = ? " +
                    "AND seat_status = 'AVAILABLE'";

                try (PreparedStatement statement =
                             connection.prepareStatement(updateSeatSql)) {
                    statement.setInt(1, showSeatId);
                    statement.setInt(2, showId);

                    if (statement.executeUpdate() != 1) {
                        connection.rollback();
                        send(exchange, 409,
                            "{\"error\":\"Seat is no longer available\"}");
                        return;
                    }
                }

                String insertBookingSql =
                    "INSERT INTO bookings " +
                    "(booking_id, user_id, show_id, booking_time, " +
                    "booking_status, total_amount) " +
                    "VALUES (NULL, ?, ?, SYSTIMESTAMP, 'CONFIRMED', ?)";

                try (PreparedStatement statement =
                             connection.prepareStatement(insertBookingSql)) {
                    statement.setInt(1, userId);
                    statement.setInt(2, showId);
                    statement.setBigDecimal(3, basePrice);
                    statement.executeUpdate();
                }

                int bookingId = getSequenceValue(
                        connection, "bookings_seq");

                String insertTicketSql =
                    "INSERT INTO tickets " +
                    "(ticket_id, booking_id, show_seat_id, " +
                    "ticket_price, ticket_status) " +
                    "VALUES (NULL, ?, ?, ?, 'VALID')";

                try (PreparedStatement statement =
                             connection.prepareStatement(insertTicketSql)) {
                    statement.setInt(1, bookingId);
                    statement.setInt(2, showSeatId);
                    statement.setBigDecimal(3, basePrice);
                    statement.executeUpdate();
                }

                int ticketId = getSequenceValue(
                        connection, "tickets_seq");

                String transactionRef =
                    "DEMO-TXN-" +
                    UUID.randomUUID().toString().substring(0, 8);

                String insertPaymentSql =
                    "INSERT INTO payments " +
                    "(payment_id, booking_id, payment_method, " +
                    "payment_status, amount, transaction_ref, payment_time) " +
                    "VALUES (NULL, ?, 'UPI', 'SUCCESS', ?, ?, SYSTIMESTAMP)";

                try (PreparedStatement statement =
                             connection.prepareStatement(insertPaymentSql)) {
                    statement.setInt(1, bookingId);
                    statement.setBigDecimal(2, basePrice);
                    statement.setString(3, transactionRef);
                    statement.executeUpdate();
                }

                int paymentId = getSequenceValue(
                        connection, "payments_seq");

                connection.commit();

                String response =
                    "{\"status\":\"CONFIRMED\"," +
                    "\"bookingId\":" + bookingId + "," +
                    "\"ticketId\":" + ticketId + "," +
                    "\"paymentId\":" + paymentId + "," +
                    "\"showId\":" + showId + "," +
                    "\"showSeatId\":" + showSeatId + "," +
                    "\"amount\":" + basePrice.toPlainString() + "," +
                    "\"paymentMethod\":\"UPI\"," +
                    "\"paymentStatus\":\"SUCCESS\"," +
                    "\"demoPayment\":true}";

                send(exchange, 201, response);

            } catch (SQLException | RuntimeException e) {
                try {
                    connection.rollback();
                } catch (SQLException rollbackError) {
                    System.err.println("Booking rollback failed.");
                }

                System.err.println(
                    "Booking failed: " +
                    e.getClass().getSimpleName()
                );

                send(exchange, 500,
                    "{\"error\":\"Booking failed; transaction rolled back\"}");
            }

        } catch (SQLException e) {
            System.err.println(
                "Database connection failed: " +
                e.getClass().getSimpleName()
            );

            send(exchange, 500,
                "{\"error\":\"Database connection failed\"}");
        }
    }

    private static int getSequenceValue(
            Connection connection,
            String sequenceName) throws SQLException {

        if (!sequenceName.matches(
                "(bookings|tickets|payments)_seq")) {
            throw new SQLException("Invalid sequence name");
        }

        String sql = "SELECT " + sequenceName + ".CURRVAL FROM dual";

        try (PreparedStatement statement =
                     connection.prepareStatement(sql);
             ResultSet rs = statement.executeQuery()) {

            if (rs.next()) {
                return rs.getInt(1);
            }

            throw new SQLException("Sequence value not found");
        }
    }

    private static int getNumber(String body, String key) {
        Pattern pattern = Pattern.compile(
            "\"" + Pattern.quote(key) +
            "\"\\s*:\\s*(\\d+)"
        );

        Matcher matcher = pattern.matcher(body);

        if (!matcher.find()) {
            throw new IllegalArgumentException(
                "Missing field: " + key);
        }

        return Integer.parseInt(matcher.group(1));
    }

    private static String readBody(InputStream input)
            throws IOException {

        byte[] bytes = input.readAllBytes();
        return new String(bytes, StandardCharsets.UTF_8);
    }

    private static void send(
            HttpExchange exchange,
            int status,
            String body) throws IOException {

        byte[] bytes = body.getBytes(StandardCharsets.UTF_8);

        exchange.getResponseHeaders().set(
            "Content-Type", "application/json; charset=UTF-8");
        exchange.getResponseHeaders().set(
            "Access-Control-Allow-Origin", "http://127.0.0.1:5500");
        exchange.getResponseHeaders().set(
            "Access-Control-Allow-Credentials", "true");
        exchange.getResponseHeaders().set(
            "Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        exchange.getResponseHeaders().set(
            "Access-Control-Allow-Headers", "Content-Type");
        exchange.getResponseHeaders().set(
            "Cache-Control", "no-store");

        exchange.sendResponseHeaders(status, bytes.length);

        try (OutputStream output = exchange.getResponseBody()) {
            output.write(bytes);
        }
    }
}




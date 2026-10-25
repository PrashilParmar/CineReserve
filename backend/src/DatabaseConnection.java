import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;

public class DatabaseConnection {

    private static final String URL =
            System.getenv().getOrDefault(
                    "CINERESERVE_DB_URL",
                    "jdbc:oracle:thin:@localhost:1521:xe"
            );

    private static final String USERNAME =
            System.getenv().getOrDefault(
                    "CINERESERVE_DB_USER",
                    "CINERESERVE"
            );

    private static final String PASSWORD =
            System.getenv("CINERESERVE_DB_PASSWORD");

    public static Connection getConnection() throws SQLException {
        if (PASSWORD == null || PASSWORD.isBlank()) {
            throw new SQLException(
                    "Database password is missing. "
                    + "Set CINERESERVE_DB_PASSWORD before starting the server."
            );
        }

        return DriverManager.getConnection(URL, USERNAME, PASSWORD);
    }

    public static void main(String[] args) {
        try (Connection connection = getConnection()) {
            System.out.println("Oracle database connected successfully!");
            System.out.println("Connection valid: "
                    + connection.isValid(5));
        } catch (SQLException e) {
            System.out.println("Database connection failed.");
            System.out.println(e.getMessage());
        }
    }
}

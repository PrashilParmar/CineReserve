
/* =====================================================
   CINERESERVE â€” MOVIE DISCOVERY
   Module 1: Frontend
   Movie data loaded from the backend API.
===================================================== */

"use strict";

let movies = [];

const posterByTitle = {
    "Kalki 2898 AD":
        "https://media.themoviedb.org/t/p/w440_and_h660_face/ppkIXUj96xmr2BKELahi0EfRarE.jpg",

    "Stree 2":
        "https://www.impawards.com/intl/india/2024/posters/stree_two_sarkate_ka_aatank.jpg",

    "Avengers Endgame":
        "https://image.tmdb.org/t/p/w500/or06FN3Dka5tukK1e9sl16pB3iy.jpg"
};

/* HTML element references */

const movieGrid = document.getElementById("movieGrid");
const movieSearch = document.getElementById("movieSearch");
const genreFilter = document.getElementById("genreFilter");
const languageFilter = document.getElementById("languageFilter");
const resetFilters = document.getElementById("resetFilters");
const emptyReset = document.getElementById("emptyReset");
const clearSearch = document.getElementById("clearSearch");
const emptyState = document.getElementById("emptyState");
const movieCount = document.getElementById("movieCount");
const resultsLabel = document.getElementById("resultsLabel");

/* Convert duration into hours and minutes */

function formatDuration(minutes) {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    return `${hours}h ${remainingMinutes}m`;
}

/* Normalize movie titles for matching */

function normalizeTitle(title) {
    return String(title)
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
}

/* Load shows and seats for the selected movie */

async function openShowsForMovie(movie) {
    const modalElement = document.getElementById("movieDetailsModal");
    const modalBody = document.getElementById("movieDetailsBody");
    const modalTitle = document.getElementById("movieDetailsTitle");

    if (!modalElement || !modalBody || !modalTitle) {
        console.error("Movie details modal elements are missing.");
        return;
    }

    const modal = bootstrap.Modal.getOrCreateInstance(modalElement);

    modalTitle.textContent = movie.title;
    modalBody.innerHTML = `
        <div class="text-center py-4">
            <div class="spinner-border text-warning" role="status"></div>
            <p class="mt-3 mb-0">Loading showtimes and seat availability...</p>
        </div>
    `;
    modal.show();

    try {
        const response = await fetch("http://127.0.0.1:8081/api/shows");

        if (!response.ok) {
            throw new Error("Shows API returned HTTP " + response.status);
        }

        const shows = await response.json();
        const matchingShows = shows.filter(
            show => normalizeTitle(show.movieTitle) === normalizeTitle(movie.title)
        );

        if (matchingShows.length === 0) {
            modalBody.innerHTML = `
                <div class="alert alert-secondary mb-0">
                    No shows are currently available for this movie.
                </div>
            `;
            return;
        }

        modalBody.innerHTML = `
            <div class="mb-4">
                <div class="text-secondary small text-uppercase mb-1">Movie information</div>
                <h3 class="h5 mb-2">${escapeMovieText(movie.title)}</h3>
                <p class="text-secondary mb-0">
                    ${escapeMovieText(movie.genres.join(" / "))} ·
                    ${escapeMovieText(movie.language)} ·
                    ${formatDuration(Number(movie.duration))}
                </p>
            </div>
            <h3 class="h5 mb-3">Choose a show</h3>
            <div id="crShowList"></div>
            <div id="crSeatArea" class="mt-4"></div>
        `;

        const showList = document.getElementById("crShowList");

        matchingShows.forEach(show => {
            const card = document.createElement("div");
            card.className = "cr-show-card";

            const details = document.createElement("div");
            details.className = "d-flex flex-column flex-md-row justify-content-between gap-3";

            const info = document.createElement("div");
            const theatre = document.createElement("h4");
            theatre.className = "h6 mb-2";
            theatre.textContent = `${show.theatre}, ${show.city}`;

            const time = document.createElement("p");
            time.className = "text-secondary small mb-1";
            time.textContent = `${show.screen} · ${show.showTime}`;

            const availability = document.createElement("p");
            availability.className = "cr-gold-text small mb-0";
            availability.textContent = `${show.availableSeats} of ${show.totalSeats} seats available`;

            info.append(theatre, time, availability);

            const right = document.createElement("div");
            right.className = "text-md-end";

            const price = document.createElement("div");
            price.className = "cr-gold-text fw-bold mb-2";
            price.textContent = `₹${show.basePrice} / ticket`;

            const choose = document.createElement("button");
            choose.type = "button";
            choose.className = "cr-book-button";
            choose.textContent = "View Seats";

            choose.addEventListener("click", async () => {
                const seatArea = document.getElementById("crSeatArea");
                seatArea.innerHTML = `
                    <div class="text-center py-3">
                        <div class="spinner-border spinner-border-sm text-warning" role="status"></div>
                        <span class="ms-2">Loading seats...</span>
                    </div>
                `;

                try {
                    const [seatResponse, authResponse] = await Promise.all([
                        fetch(`http://127.0.0.1:8081/api/seats?showId=${encodeURIComponent(show.showId)}`, {
                            credentials: "include"
                        }),
                        fetch("http://127.0.0.1:8081/api/auth/me", {
                            credentials: "include"
                        })
                    ]);

                    if (!seatResponse.ok) {
                        throw new Error("Seats API returned HTTP " + seatResponse.status);
                    }

                    const seats = await seatResponse.json();
                    let currentUser = null;

                    if (authResponse.ok) {
                        currentUser = await authResponse.json();
                    }

                    seatArea.innerHTML = `
                        <hr class="border-secondary my-4">
                        <h3 class="h5 mb-2">Seat availability</h3>
                        <p class="text-secondary small mb-3">
                            Green = available · Red = booked · Gold = selected
                        </p>
                        <div class="cr-seat-grid mb-3" id="crSeatGrid"></div>
                        <p class="small text-secondary mb-3" id="crSeatMessage">
                            ${currentUser ? `Logged in as ${currentUser.fullName || currentUser.email}. Select an available seat.` : "Please log in before booking."}
                        </p>
                        <div class="d-flex flex-wrap justify-content-between align-items-center gap-3">
                            <div class="small cr-gold-text" id="crSeatTotal">No seat selected</div>
                            <button type="button" class="cr-book-button" id="crConfirmBooking"
                                ${currentUser ? "disabled" : ""}>
                                ${currentUser ? "Confirm Booking" : "Login to Book"}
                            </button>
                        </div>
                    `;

                    const seatGrid = document.getElementById("crSeatGrid");
                    const message = document.getElementById("crSeatMessage");
                    const total = document.getElementById("crSeatTotal");
                    const bookButton = document.getElementById("crConfirmBooking");
                    let selectedSeat = null;

                    seats.forEach(seat => {
                        const available = String(seat.status).toUpperCase() === "AVAILABLE";
                        const seatElement = document.createElement("button");
                        seatElement.type = "button";
                        seatElement.className = "cr-seat " +
                            (available ? "cr-seat-available" : "cr-seat-booked");
                        seatElement.textContent = `${seat.row}${seat.number}`;
                        seatElement.title = `${seat.type} · ₹${seat.price} · ${seat.status}`;
                        seatElement.disabled = !available || !currentUser;
                        seatElement.style.cursor = seatElement.disabled ? "not-allowed" : "pointer";

                        seatElement.addEventListener("click", () => {
                            if (!currentUser || !available) return;

                            selectedSeat = seat;

                            seatGrid.querySelectorAll(".cr-seat").forEach(element => {
                                element.style.outline = "";
                            });

                            seatElement.style.outline = "2px solid #d4af37";
                            total.textContent = `Selected: ${seat.row}${seat.number} · ₹${seat.price}`;
                            bookButton.disabled = false;
                            message.textContent = "Seat selected. Confirm to complete your demo booking.";
                        });

                        seatGrid.appendChild(seatElement);
                    });

                    bookButton.addEventListener("click", async () => {
                        if (!currentUser) {
                            modal.hide();
                            document.getElementById("login")?.scrollIntoView({ behavior: "smooth" });
                            return;
                        }

                        if (!selectedSeat) {
                            message.textContent = "Please select an available seat first.";
                            return;
                        }

                        bookButton.disabled = true;
                        bookButton.textContent = "Processing...";
                        message.textContent = "Creating your booking...";

                        try {
                            const response = await fetch("http://127.0.0.1:8081/api/bookings", {
                                method: "POST",
                                credentials: "include",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                    showId: Number(show.showId),
                                    showSeatId: Number(selectedSeat.showSeatId)
                                })
                            });

                            const result = await response.json();

                            if (!response.ok) {
                                throw new Error(result.error || result.message || `Booking failed (HTTP ${response.status})`);
                            }

                            message.textContent = `Booking confirmed! Booking ID: ${result.bookingId}`;
                            total.textContent = `Paid: ₹${result.amount}`;
                            bookButton.textContent = "Booking Confirmed";

                            window.alert(
                                `Booking Confirmed!\n\nBooking ID: ${result.bookingId}\nTicket ID: ${result.ticketId}\nAmount: ₹${result.amount}\nPayment: ${result.paymentStatus}\n\nDemo payment only.`
                            );

                            choose.click();
                        } catch (error) {
                            message.textContent = error.message;
                            bookButton.disabled = false;
                            bookButton.textContent = "Retry Booking";
                        }
                    });

                } catch (error) {
                    console.error("Seat loading failed:", error);
                    seatArea.innerHTML = `
                        <div class="alert alert-danger">
                            Unable to load seats: ${error.message}
                        </div>
                    `;
                }
            });

            right.append(price, choose);
            details.append(info, right);
            card.appendChild(details);
            showList.appendChild(card);
        });

    } catch (error) {
        console.error("Show selection failed:", error);
        modalBody.innerHTML = `
            <div class="alert alert-danger mb-0">
                Unable to load shows. Please check that the backend is running.
            </div>
        `;
    }
}

function escapeMovieText(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}
/* Load movies from the database API */

async function loadMovies() {
    movieGrid.innerHTML = "";
    movieGrid.hidden = true;
    emptyState.hidden = true;
    resultsLabel.textContent = "Loading movies...";
    movieCount.textContent = "00";

    try {
        const response = await fetch(
            "http://127.0.0.1:8081/api/movies"
        );

        if (!response.ok) {
            throw new Error(
                "Movies API returned HTTP " + response.status
            );
        }

        const data = await response.json();

        movies = data.map((movie) => ({
            id: movie.id,
            title: movie.title,
            genres: movie.genre === "Sci-Fi"
                ? ["Science Fiction"]
                : movie.genre.split(",").map(
                    (genre) => genre.trim()
                ),
            language: movie.language,
            duration: movie.duration,
            year: movie.year,
            tag: "Now Showing",
            poster: posterByTitle[movie.title] || ""
        }));

        renderMovies();

    } catch (error) {
        console.error("Could not load movies:", error);

        movieGrid.replaceChildren();
        movieGrid.hidden = true;
        emptyState.hidden = false;
        resultsLabel.textContent = "Unable to load movies";
        movieCount.textContent = "00";
    }
}

/* Create one movie card safely */

function createMovieCard(movie) {
    const card = document.createElement("article");
    card.className = "cr-movie-card";

    const posterWrap = document.createElement("div");
    posterWrap.className = "cr-movie-poster-wrap";

    const poster = document.createElement("img");
    poster.className = "cr-movie-poster";
    poster.src = movie.poster;
    poster.alt = `${movie.title} movie poster`;
    poster.loading = "lazy";

    poster.addEventListener("error", () => {
        poster.remove();

        const fallback = document.createElement("div");
        fallback.className = "cr-movie-poster-placeholder";

        const icon = document.createElement("i");
        icon.className = "bi bi-film";
        icon.setAttribute("aria-hidden", "true");

        fallback.appendChild(icon);
        posterWrap.prepend(fallback);
    }, { once: true });

    const overlay = document.createElement("div");
    overlay.className = "cr-poster-overlay";

    const tag = document.createElement("span");
    tag.className = "cr-movie-tag";
    tag.textContent = movie.tag;

    posterWrap.append(poster, overlay, tag);

    const info = document.createElement("div");
    info.className = "cr-movie-info";

    const meta = document.createElement("div");
    meta.className = "cr-movie-meta";

    const year = document.createElement("span");
    year.textContent = String(movie.year);

    const duration = document.createElement("span");
    duration.textContent = formatDuration(movie.duration);

    meta.append(year, duration);

    const title = document.createElement("h3");
    title.className = "cr-movie-title";
    title.textContent = movie.title;

    const genres = document.createElement("p");
    genres.className = "cr-movie-genres";
    genres.textContent = movie.genres.join(" / ");

    const footer = document.createElement("div");
    footer.className = "cr-movie-footer";

    const language = document.createElement("span");
    language.className = "cr-movie-language";
    language.textContent = movie.language;

    const detailsButton = document.createElement("button");
    detailsButton.type = "button";
    detailsButton.className = "cr-movie-details-btn";

    detailsButton.setAttribute(
        "aria-label",
        `View details for ${movie.title}`
    );

    const buttonText = document.createElement("span");
    buttonText.textContent = "View Details";

    const arrow = document.createElement("i");
    arrow.className = "bi bi-arrow-up-right";
    arrow.setAttribute("aria-hidden", "true");

    detailsButton.append(buttonText, arrow);

    /* Updated: show available shows and seats */

    detailsButton.addEventListener("click", () => {
        openShowsForMovie(movie);
    });

    footer.append(language, detailsButton);
    info.append(meta, title, genres, footer);
    card.append(posterWrap, info);

    return card;
}

/* Filter and display movies */

function renderMovies() {
    const searchTerm = movieSearch.value.trim().toLowerCase();
    const selectedGenre = genreFilter.value;
    const selectedLanguage = languageFilter.value;

    const filteredMovies = movies.filter((movie) => {
        const searchableText = [
            movie.title,
            movie.language,
            ...movie.genres
        ].join(" ").toLowerCase();

        const matchesSearch = searchableText.includes(searchTerm);

        const matchesGenre = !selectedGenre ||
            movie.genres.includes(selectedGenre);

        const matchesLanguage = !selectedLanguage ||
            movie.language === selectedLanguage;

        return matchesSearch && matchesGenre && matchesLanguage;
    });

    movieGrid.replaceChildren();

    filteredMovies.forEach((movie) => {
        movieGrid.appendChild(createMovieCard(movie));
    });

    emptyState.hidden = filteredMovies.length !== 0;
    movieGrid.hidden = filteredMovies.length === 0;

    movieCount.textContent = String(
        filteredMovies.length
    ).padStart(2, "0");

    resultsLabel.textContent =
        filteredMovies.length === movies.length
            ? "Showing all movies"
            : `Showing ${filteredMovies.length} of ${movies.length} movies`;

    clearSearch.hidden = movieSearch.value.length === 0;
}

/* Reset all filters */

function clearAllFilters() {
    movieSearch.value = "";
    genreFilter.value = "";
    languageFilter.value = "";

    renderMovies();
}

/* Events */

movieSearch.addEventListener("input", renderMovies);
genreFilter.addEventListener("change", renderMovies);
languageFilter.addEventListener("change", renderMovies);

resetFilters.addEventListener("click", clearAllFilters);
emptyReset.addEventListener("click", clearAllFilters);

clearSearch.addEventListener("click", () => {
    movieSearch.value = "";
    renderMovies();
    movieSearch.focus();
});

/* Start the application */

loadMovies();


/* =====================================================
   CINERESERVE — AUTHENTICATION
   Connects existing Login and Register forms to the API
   ===================================================== */

const CR_AUTH_API = "http://127.0.0.1:8081/api/auth";

async function crAuthRequest(endpoint, data = null) {
    const options = {
        method: data ? "POST" : "GET",
        credentials: "include",
        headers: {}
    };

    if (data) {
        options.headers["Content-Type"] = "application/json";
        options.body = JSON.stringify(data);
    }

    const response = await fetch(`${CR_AUTH_API}/${endpoint}`, options);

    let result = {};
    try {
        result = await response.json();
    } catch {
        result = {};
    }

    if (!response.ok) {
        throw new Error(result.error || result.message || "Request failed.");
    }

    return result;
}

let crCurrentUser = null;

function crRenderAccount(user) {
    crCurrentUser = user || null;

    const loginLink = document.getElementById("crNavLogin");
    const registerLink = document.getElementById("crNavRegister");
    const userArea = document.getElementById("crNavUser");
    const userName = document.getElementById("crNavUserName");

    if (!loginLink || !registerLink || !userArea || !userName) return;

    if (crCurrentUser) {
        loginLink.hidden = true;
        registerLink.hidden = true;
        userArea.hidden = false;
        userName.textContent = crCurrentUser.fullName || crCurrentUser.email || "Account";
    } else {
        loginLink.hidden = false;
        registerLink.hidden = false;
        userArea.hidden = true;
        userName.textContent = "";
    }
}

async function crRefreshAccount() {
    try {
        const user = await crAuthRequest("me");
        crRenderAccount(user);
        return user;
    } catch {
        crRenderAccount(null);
        return null;
    }
}

const crLogoutButton = document.getElementById("crNavLogout");

if (crLogoutButton) {
    crLogoutButton.addEventListener("click", async () => {
        crLogoutButton.disabled = true;

        try {
            await crAuthRequest("logout", {});
            crRenderAccount(null);
            const message = document.getElementById("loginMessage");
            crShowAuthMessage(message, "You have logged out successfully.", true);
        } catch (error) {
            crShowAuthMessage(
                document.getElementById("loginMessage"),
                "Logout failed: " + error.message
            );
        } finally {
            crLogoutButton.disabled = false;
        }
    });
}
function crShowAuthMessage(element, message, success = false) {
    if (!element) return;

    element.textContent = message;
    element.style.color = success ? "#16a34a" : "#dc2626";
}

const crRegisterForm = document.getElementById("registerForm");

if (crRegisterForm) {
    crRegisterForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        const message = document.getElementById("registerMessage");
        const button = crRegisterForm.querySelector('button[type="submit"]');

        const fullName = document.getElementById("registerName").value.trim();
        const email = document.getElementById("registerEmail").value.trim();
        const phone = document.getElementById("registerPhone").value.trim();
        const password = document.getElementById("registerPassword").value;

        if (password.length < 8) {
            crShowAuthMessage(message, "Password must be at least 8 characters.");
            return;
        }

        button.disabled = true;
        crShowAuthMessage(message, "Creating your account...", true);

        try {
            const result = await crAuthRequest("register", {
                fullName,
                email,
                phone,
                password
            });

            crShowAuthMessage(
                message,
                result.message || "Account created successfully. Please log in.",
                true
            );

            crRegisterForm.reset();
        } catch (error) {
            crShowAuthMessage(message, error.message);
        } finally {
            button.disabled = false;
        }
    });
}

const crLoginForm = document.getElementById("loginForm");

if (crLoginForm) {
    crLoginForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        const message = document.getElementById("loginMessage");
        const button = crLoginForm.querySelector('button[type="submit"]');

        const email = document.getElementById("loginEmail").value.trim();
        const password = document.getElementById("loginPassword").value;

        button.disabled = true;
        crShowAuthMessage(message, "Signing in...", true);

        try {
            const result = await crAuthRequest("login", {
                email,
                password
            });

            const user = await crRefreshAccount();

            crShowAuthMessage(
                message,
                user
                    ? `Welcome, ${user.fullName || user.email}! You are logged in.`
                    : "Login succeeded, but the session could not be restored.",
                Boolean(user)
            );

            if (user) crLoginForm.reset();
        } catch (error) {
            crShowAuthMessage(message, error.message);
        } finally {
            button.disabled = false;
        }
    });
}

/* Restore the existing login session when the page opens. */
document.addEventListener("DOMContentLoaded", async function () {
    const user = await crRefreshAccount();
    if (user) console.log("CineReserve session active:", user.fullName || user.email);
});






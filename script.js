const API_KEY = '3fd2be6f0c70a2a598f084ddfb75487c';
const IMG_PATH = 'https://image.tmdb.org/t/p/w1280';
const SEARCH_API = `https://api.themoviedb.org/3/search/movie?api_key=${API_KEY}&include_adult=false&query=`;
const YOUTUBE_API_KEY = 'AIzaSyABfEbxuYNeBPGsGgc-S9NDZfYH_1xhNM4';
const YOUTUBE_SEARCH_API = 'https://www.googleapis.com/youtube/v3/search';

const TELEGRAM_BOT_TOKEN = '7635804333:AAG3bze_1AOGFsP2ytpw8439Cl6p4XI5XWk'; 
const TELEGRAM_CHAT_ID = '5379038515'; 

const main = document.getElementById('main');
const form = document.getElementById('form');
const search = document.getElementById('search');
const spinner = document.getElementById('spinner');
const watchlistSection = document.getElementById('watchlistSection');
const trendingMovies = document.getElementById('trendingMovies');

const LANGUAGE_APIS = {
    malayalam: `https://api.themoviedb.org/3/discover/movie?sort_by=popularity.desc&api_key=${API_KEY}&include_adult=false&with_original_language=ml&vote_count.gte=20`,
    tamil: `https://api.themoviedb.org/3/discover/movie?sort_by=popularity.desc&api_key=${API_KEY}&include_adult=false&with_original_language=ta&vote_count.gte=20`,
    hindi: `https://api.themoviedb.org/3/discover/movie?sort_by=popularity.desc&api_key=${API_KEY}&include_adult=false&with_original_language=hi&vote_count.gte=20`,
    english: `https://api.themoviedb.org/3/discover/movie?sort_by=popularity.desc&api_key=${API_KEY}&include_adult=false&with_original_language=en&vote_count.gte=20`
};

const GENRES = {
    action: 28, comedy: 35, drama: 18, horror: 27, romance: 10749, thriller: 53
};

const BLOCKED_KEYWORDS = ['adult', 'xxx', 'porn', 'erotic', 'sex', '18+', 'hot', 'nude'];

let lastFlippedCard = null;
let debounceTimer;

document.addEventListener("DOMContentLoaded", () => {
    getTrendingMovies();
    setupLanguageSections();
    setupGenreButtons();
    displayWatchlist();

    document.getElementById('goToTopBtn').addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    document.getElementById('goToHomeBtn').addEventListener('click', () => {
        window.location.href = 'index.html';
    });
    document.getElementById('helpButton')?.addEventListener('click', showHelpPopup);
});

form.addEventListener('submit', (e) => {
    e.preventDefault();
    const searchTerm = search.value.trim();
    if (searchTerm) getMovies(SEARCH_API + searchTerm);
    search.value = '';
});

search.addEventListener('input', (e) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        const query = e.target.value.trim();
        if (query) showAutocompleteSuggestions(query);
        else hideAutocomplete();
    }, 300);
});

function setupLanguageSections() {
    ['malayalam', 'tamil', 'hindi', 'english'].forEach(lang => {
        const genreContainer = document.getElementById(`${lang}Genres`);
        const movieContainer = document.getElementById(`${lang}Movies`);
        if (genreContainer && movieContainer) {
            setupGenreButtonsForLanguage(lang, genreContainer, movieContainer);
            getMoviesByLanguage(LANGUAGE_APIS[lang], movieContainer, lang, 60);
        } else {
            console.error(`Missing elements for ${lang} section`);
        }
    });
}

function setupGenreButtonsForLanguage(lang, container, movieContainer) {
    Object.entries(GENRES).forEach(([name, id]) => {
        const btn = document.createElement('button');
        btn.textContent = name.charAt(0).toUpperCase() + name.slice(1);
        btn.classList.add('genre-button');
        btn.addEventListener('click', () => {
            toggleActiveGenreButton(btn, container);
            getMoviesByLanguage(`${LANGUAGE_APIS[lang]}&with_genres=${id}`, movieContainer, lang, 60);
        });
        container.appendChild(btn);
    });
}

function setupGenreButtons() {
    const genreContainer = document.getElementById('genreButtons');
    if (genreContainer) {
        Object.entries(GENRES).forEach(([name, id]) => {
            const btn = document.createElement('button');
            btn.textContent = name.charAt(0).toUpperCase() + name.slice(1);
            btn.classList.add('genre-button');
            btn.addEventListener('click', () => {
                toggleActiveGenreButton(btn, genreContainer);
                getMoviesByGenre(id);
            });
            genreContainer.appendChild(btn);
        });
    }
}

function toggleActiveGenreButton(activeBtn, container) {
    container.querySelectorAll('button').forEach(btn => btn.classList.remove('active'));
    activeBtn.classList.add('active');
}

async function getMovies(url) {
    if (!main) {
        console.error('Main element not found');
        return;
    }
    spinner.style.display = 'block';
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Failed to fetch movies: ${res.status}`);
        const data = await res.json();
        const safeMovies = filterSafeMovies(data.results || []);
        if (safeMovies.length === 0) {
            main.innerHTML = '<p>No movies found.</p>';
        } else {
            showMovies(safeMovies);
        }
    } catch (error) {
        console.error('Error fetching movies:', error);
        main.innerHTML = '<p>Error loading movies. Please try again later.</p>';
        showPopup('❌ Error fetching movie data.');
    } finally {
        spinner.style.display = 'none';
    }
}

async function getTrendingMovies() {
    if (!trendingMovies) {
        console.error('Trending movies element not found');
        return;
    }
    spinner.style.display = 'block';
    
    const url = `https://api.themoviedb.org/3/discover/movie?api_key=${API_KEY}&sort_by=release_date.desc&with_original_language=ml&vote_count.gte=50&include_adult=false&page=1`;
    
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Failed to fetch trending Malayalam movies: ${res.status}`);
        const data = await res.json();
        const malayalamSectionMovies = document.getElementById('malayalamMovies').querySelectorAll('.movie');
        const existingIds = Array.from(malayalamSectionMovies).map(movie => {
            const id = movie.querySelector('.add-watchlist')?.dataset.id;
            return id ? parseInt(id) : null;
        }).filter(id => id !== null);

        const safeMovies = filterSafeMovies(data.results || [])
            .filter(movie => !existingIds.includes(movie.id)) // Exclude movies already in Malayalam section
            .filter(movie => movie.title !== "All We Imagine as Light") // Exclude specific movie
            .slice(0, 10); // Limit to 10 movies
        
        if (safeMovies.length === 0) {
            trendingMovies.innerHTML = '<p>No new trending Malayalam movies found.</p>';
        } else {
            trendingMovies.innerHTML = ''; // Clear previous content
            const heading = document.createElement('h2');
            heading.classList.add('trending-heading');
            heading.textContent = 'Trending Movies';
            trendingMovies.parentElement.insertBefore(heading, trendingMovies); // Insert heading before the movie grid
            showTrendingMovies(safeMovies);
        }
    } catch (error) {
        console.error('Error fetching trending Malayalam movies:', error);
        trendingMovies.innerHTML = '<p>Error loading trending movies.</p>';
    } finally {
        spinner.style.display = 'none';
    }
}

async function getMoviesByLanguage(url, container, lang, limit = 60) {
    if (!container) {
        console.error(`Container for ${lang} not found`);
        return;
    }
    try {
        const movies = await fetchMoviesAcrossPages(url, Math.ceil(limit / 20), limit);
        if (movies.length === 0) {
            container.innerHTML = '<p>No movies found.</p>';
        } else {
            showMoviesInContainer(movies, container, lang);
        }
    } catch (error) {
        console.error(`Error fetching ${lang} movies:`, error);
        container.innerHTML = '<p>Error loading movies.</p>';
        showPopup(`❌ Error fetching ${lang} movies.`);
    }
}

async function getMoviesByGenre(genreId) {
    const url = `https://api.themoviedb.org/3/discover/movie?sort_by=popularity.desc&api_key=${API_KEY}&include_adult=false&with_genres=${genreId}&vote_count.gte=20`;
    if (!main) {
        console.error('Main element not found');
        return;
    }
    spinner.style.display = 'block';
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Failed to fetch movies: ${res.status}`);
        const data = await res.json();
        const safeMovies = filterSafeMovies(data.results || []);
        if (safeMovies.length === 0) {
            main.innerHTML = '<p>No movies found.</p>';
        } else {
            showMovies(safeMovies);
        }
    } catch (error) {
        console.error('Error fetching movies:', error);
        main.innerHTML = '<p>Error loading movies. Please try again later.</p>';
        showPopup('❌ Error fetching movie data.');
    } finally {
        spinner.style.display = 'none';
    }
}

async function fetchMoviesAcrossPages(url, pages, limit) {
    let movies = [];
    for (let page = 1; page <= pages; page++) {
        const pageUrl = `${url}&page=${page}`;
        const res = await fetch(pageUrl);
        if (!res.ok) throw new Error(`Failed to fetch page ${page}: ${res.status}`);
        const data = await res.json();
        movies.push(...(data.results || []));
    }
    return filterSafeMovies(movies).slice(0, limit);
}

function filterSafeMovies(movies) {
    return movies.filter(movie => 
        !movie.adult && 
        !BLOCKED_KEYWORDS.some(keyword => 
            (movie.title?.toLowerCase().includes(keyword) || 
             movie.overview?.toLowerCase().includes(keyword)))
    );
}

function showMovies(movies) {
    main.innerHTML = '';
    if (movies.length === 0) {
        main.innerHTML = '<p>No movies to display.</p>';
        return;
    }
    movies.forEach(movie => {
        const movieEl = createMovieElement(movie);
        main.appendChild(movieEl);
    });
}

function showTrendingMovies(movies) {
    if (movies.length === 0) {
        trendingMovies.innerHTML = '<p>No trending movies to display.</p>';
        return;
    }
    movies.forEach(movie => {
        const movieEl = createMovieElement(movie);
        trendingMovies.appendChild(movieEl);
    });
}

function showMoviesInContainer(movies, container, lang) {
    container.innerHTML = '';
    if (movies.length === 0) {
        container.innerHTML = '<p>No movies to display.</p>';
        return;
    }
    movies.forEach(movie => {
        const movieEl = createMovieElement(movie);
        container.appendChild(movieEl);
    });
}

function createMovieElement(movie) {
    const { title, poster_path, overview, id } = movie;
    const movieEl = document.createElement('div');
    movieEl.classList.add('movie');
    const posterUrl = poster_path ? IMG_PATH + poster_path : 'path_to_default_image.jpg';
    movieEl.innerHTML = `
        <div class="card-inner">
            <div class="card-front">
                <img src="${posterUrl}" loading="lazy" alt="${title}">
                <div class="movie-info">
                    <h3>${title}</h3>
                </div>
            </div>
            <div class="card-back">
                <h3>${title}</h3>
                <p>${overview || 'No overview available.'}</p>
                <div class="buttons">
                    <button class="add-to-watchlist-btn add-watchlist" data-id="${id}" data-title="${title}" data-poster="${posterUrl}" data-overview="${overview}">Add to Watchlist</button>
                    <button class="more-btn more" data-title="${title}" data-overview="${overview}">More</button>
                </div>
            </div>
        </div>
    `;
    movieEl.addEventListener('click', () => {
        if (lastFlippedCard && lastFlippedCard !== movieEl) {
            lastFlippedCard.classList.remove('flipped');
        }
        movieEl.classList.toggle('flipped');
        lastFlippedCard = movieEl.classList.contains('flipped') ? movieEl : null;
    });
    movieEl.querySelector('.add-watchlist').addEventListener('click', (e) => {
        e.stopPropagation();
        addToWatchlist(e);
    });
    movieEl.querySelector('.more').addEventListener('click', (e) => {
        e.stopPropagation();
        const { title, overview } = e.target.dataset;
        openMorePopup(title, overview);
    });
    return movieEl;
}

function addToWatchlist(event) {
    const { id, title, poster, overview } = event.target.dataset;
    let watchlist = JSON.parse(localStorage.getItem('watchlist') || '[]');
    if (!watchlist.some(item => item.id === id)) {
        watchlist.push({ id, title, poster, overview });
        localStorage.setItem('watchlist', JSON.stringify(watchlist));
        showPopup('✅ Added to watchlist!');
        displayWatchlist();
    } else {
        showPopup('⚠️ Already in watchlist!');
    }
}

function showWatchlist() {
    const watchlist = JSON.parse(localStorage.getItem('watchlist') || '[]');
    main.innerHTML = '<h2>My Watchlist</h2>';
    if (watchlist.length === 0) main.innerHTML += '<p>No movies in your watchlist yet.</p>';
    watchlist.forEach(item => {
        const movieEl = document.createElement('div');
        movieEl.classList.add('movie');
        movieEl.innerHTML = `
            <div class="card-inner">
                <div class="card-front">
                    <img src="${item.poster}" loading="lazy" alt="${item.title}">
                    <div class="movie-info">
                        <h3>${item.title}</h3>
                    </div>
                </div>
                <div class="card-back">
                    <h3>${item.title}</h3>
                    <p>${item.overview || 'No overview available.'}</p>
                    <div class="buttons">
                        <button class="add-to-watchlist-btn remove-watchlist" data-id="${item.id}">Remove from Watchlist</button>
                        <button class="more-btn more" data-title="${item.title}" data-overview="${item.overview}">More</button>
                    </div>
                </div>
            </div>
        `;
        movieEl.addEventListener('click', () => {
            if (lastFlippedCard && lastFlippedCard !== movieEl) {
                lastFlippedCard.classList.remove('flipped');
            }
            movieEl.classList.toggle('flipped');
            lastFlippedCard = movieEl.classList.contains('flipped') ? movieEl : null;
        });
        movieEl.querySelector('.remove-watchlist').addEventListener('click', (e) => {
            e.stopPropagation();
            removeFromWatchlist(item.id);
            showWatchlist();
        });
        movieEl.querySelector('.more').addEventListener('click', (e) => {
            e.stopPropagation();
            const { title, overview } = e.target.dataset;
            openMorePopup(title, overview);
        });
        main.appendChild(movieEl);
    });
}

function displayWatchlist() {
    const watchlist = JSON.parse(localStorage.getItem('watchlist') || '[]');
    watchlistSection.innerHTML = '';
    if (watchlist.length === 0) return;

    const heading = document.createElement('h2');
    heading.textContent = 'My Watchlist';
    watchlistSection.appendChild(heading);

    const grid = document.createElement('div');
    grid.classList.add('featured-grid');
    watchlist.forEach(item => {
        const movieEl = document.createElement('div');
        movieEl.classList.add('movie');
        movieEl.innerHTML = `
            <div class="card-inner">
                <div class="card-front">
                    <img src="${item.poster}" loading="lazy" alt="${item.title}">
                    <div class="movie-info">
                        <h3>${item.title}</h3>
                    </div>
                </div>
                <div class="card-back">
                    <h3>${item.title}</h3>
                    <p>${item.overview || 'No overview available.'}</p>
                    <div class="buttons">
                        <button class="add-to-watchlist-btn remove-watchlist" data-id="${item.id}">Remove from Watchlist</button>
                        <button class="more-btn more" data-title="${item.title}" data-overview="${item.overview}">More</button>
                    </div>
                </div>
            </div>
        `;
        movieEl.addEventListener('click', () => {
            if (lastFlippedCard && lastFlippedCard !== movieEl) {
                lastFlippedCard.classList.remove('flipped');
            }
            movieEl.classList.toggle('flipped');
            lastFlippedCard = movieEl.classList.contains('flipped') ? movieEl : null;
        });
        movieEl.querySelector('.remove-watchlist').addEventListener('click', (e) => {
            e.stopPropagation();
            removeFromWatchlist(item.id);
        });
        movieEl.querySelector('.more').addEventListener('click', (e) => {
            e.stopPropagation();
            const { title, overview } = e.target.dataset;
            openMorePopup(title, overview);
        });
        grid.appendChild(movieEl);
    });
    watchlistSection.appendChild(grid);
}

function removeFromWatchlist(id) {
    let watchlist = JSON.parse(localStorage.getItem('watchlist') || '[]');
    watchlist = watchlist.filter(item => item.id !== id);
    localStorage.setItem('watchlist', JSON.stringify(watchlist));
    displayWatchlist();
    showPopup('✅ Removed from watchlist!');
}

function showAutocompleteSuggestions(query) {
    const malayalamUrl = `${SEARCH_API}${query}&with_original_language=ml`;
    const generalUrl = `${SEARCH_API}${query}`;
    
    Promise.all([
        fetch(malayalamUrl).then(res => res.json()),
        fetch(generalUrl).then(res => res.json())
    ])
    .then(([malayalamData, generalData]) => {
        const malayalamMovies = filterSafeMovies(malayalamData.results || []).slice(0, 5);
        const otherMovies = filterSafeMovies(generalData.results || [])
            .filter(movie => !malayalamMovies.some(m => m.id === movie.id))
            .slice(0, 5);
        
        const suggestions = [...malayalamMovies, ...otherMovies].slice(0, 10);
        displayAutocomplete(suggestions);
    })
    .catch(error => {
        console.error('Error fetching suggestions:', error);
        hideAutocomplete();
    });
}

function displayAutocomplete(movies) {
    let autocomplete = document.getElementById('autocomplete');
    if (!autocomplete) {
        autocomplete = document.createElement('div');
        autocomplete.id = 'autocomplete';
        autocomplete.style.position = 'absolute';
        autocomplete.style.background = '#fff';
        autocomplete.style.color = '#000';
        autocomplete.style.borderRadius = '10px';
        autocomplete.style.width = '20rem';
        autocomplete.style.maxHeight = '200px';
        autocomplete.style.overflowY = 'auto';
        autocomplete.style.zIndex = '1000';
        autocomplete.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
        search.parentElement.appendChild(autocomplete);
    }
    
    autocomplete.style.left = `${search.offsetLeft}px`;
    autocomplete.style.top = `${search.offsetTop + search.offsetHeight}px`;
    
    autocomplete.innerHTML = movies.map(movie => `
        <div class="suggestion" style="padding: 8px; cursor: pointer; border-bottom: 1px solid #ddd;"
             data-title="${movie.title}">
            ${movie.title}
        </div>
    `).join('');
    
    autocomplete.querySelectorAll('.suggestion').forEach(suggestion => {
        suggestion.addEventListener('click', () => {
            search.value = suggestion.dataset.title;
            getMovies(SEARCH_API + suggestion.dataset.title);
            hideAutocomplete();
        });
    });
}

function hideAutocomplete() {
    const autocomplete = document.getElementById('autocomplete');
    if (autocomplete) autocomplete.remove();
}

function openMorePopup(movieTitle, overviewText) {
    const moviePopUp = document.createElement('div');
    moviePopUp.classList.add('popup');
    moviePopUp.innerHTML = `
        <div class="popup-content">
            <h2>${movieTitle}</h2>
            <p>${overviewText || 'No overview available.'}</p>
            <button id="messageButton">Watch</button>
            <button id="closePopUpButton">Close</button>
        </div>
    `;
    document.body.appendChild(moviePopUp);

    const closeButton = document.getElementById('closePopUpButton');
    const messageButton = document.getElementById('messageButton');

    closeButton.addEventListener('click', () => moviePopUp.remove());
    messageButton.addEventListener('click', () => {
        localStorage.setItem('selectedMovie', movieTitle);
        window.location.href = 'form.html';
    });
}

function showPopup(message) {
    const popup = document.createElement('div');
    popup.classList.add('popup');
    popup.innerHTML = `
        <div class="popup-content">
            <p>${message}</p>
            <button id="closePopupButton">Close</button>
        </div>
    `;
    document.body.appendChild(popup);

    const closeButton = popup.querySelector('#closePopupButton');
    closeButton.addEventListener('click', () => {
        popup.remove();
    });
}

async function sendToTelegram(message) {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chat_id: TELEGRAM_CHAT_ID,
                text: message,
            }),
        });
        if (!response.ok) throw new Error('Failed to send message to Telegram');
        return true;
    } catch (error) {
        console.error('Error sending to Telegram:', error);
        return false;
    }
}

function showHelpPopup() {
    const popupContent = document.createElement('div');
    popupContent.classList.add('popup');
    popupContent.innerHTML = `
        <div class="popup-content">
            <h2>Need Help?</h2>
            <p>Submit your question and email below:</p>
            <textarea id="helpQuestion" placeholder="Type your question here..." rows="4" style="width: 100%; padding: 10px; margin: 10px 0; border-radius: 5px; border: none;"></textarea>
            <input type="email" id="helpEmail" placeholder="Your email address" style="width: 100%; padding: 10px; margin: 10px 0; border-radius: 5px; border: none;">
            <p id="emailError" style="color: #ff4040; display: none;">Please enter a valid email address.</p>
            <button id="submitHelpButton">Submit</button>
            <button id="closePopupButton">Close</button>
        </div>
    `;
    document.body.appendChild(popupContent);

    const submitButton = document.getElementById('submitHelpButton');
    const closeButton = document.getElementById('closePopupButton');
    const emailInput = document.getElementById('helpEmail');
    const questionInput = document.getElementById('helpQuestion');
    const emailError = document.getElementById('emailError');

    closeButton.addEventListener('click', () => popupContent.remove());

    submitButton.addEventListener('click', async () => {
        const email = emailInput.value.trim();
        const question = questionInput.value.trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(email)) {
            emailError.style.display = 'block';
            return;
        }
        if (!question) {
            showPopup('❌ Please enter a question.');
            return;
        }

        const message = `New Help Request:\nEmail: ${email}\nQuestion: ${question}`;
        const sent = await sendToTelegram(message);

        if (sent) {
            showPopup('✅ Your question has been submitted!');
            popupContent.remove();
        } else {
            showPopup('❌ Failed to submit your question. Please try again.');
        }
    });
}
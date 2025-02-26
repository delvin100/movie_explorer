const API_KEY = '3fd2be6f0c70a2a598f084ddfb75487c';
const IMG_PATH = 'https://image.tmdb.org/t/p/w1280';
const SEARCH_API = `https://api.themoviedb.org/3/search/movie?api_key=${API_KEY}&include_adult=false&query=`;
const YOUTUBE_API_KEY = 'AIzaSyCZUKv7qHiCzme5v2uXHMPV1-A_LrawVpY';
const YOUTUBE_SEARCH_API = 'https://www.googleapis.com/youtube/v3/search';

const main = document.getElementById('main');
const form = document.getElementById('form');
const search = document.getElementById('search');
const spinner = document.getElementById('spinner');

const BOT_TOKEN = "7635804333:AAG3bze_1AOGFsP2ytpw8439Cl6p4XI5XWk";
const CHAT_ID = "5379038515";
const TELEGRAM_API_URL = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;

const BLOCKED_KEYWORDS = ['adult', 'xxx', 'porn', 'erotic', 'sex', '18+', 'hot', 'nude'];

// Language-specific API URLs
const LANGUAGE_APIS = {
    malayalam: `https://api.themoviedb.org/3/discover/movie?sort_by=popularity.desc&api_key=${API_KEY}&include_adult=false&with_original_language=ml&vote_count.gte=20`,
    tamil: `https://api.themoviedb.org/3/discover/movie?sort_by=popularity.desc&api_key=${API_KEY}&include_adult=false&with_original_language=ta&vote_count.gte=20`,
    hindi: `https://api.themoviedb.org/3/discover/movie?sort_by=popularity.desc&api_key=${API_KEY}&include_adult=false&with_original_language=hi&vote_count.gte=20`,
    english: `https://api.themoviedb.org/3/discover/movie?sort_by=popularity.desc&api_key=${API_KEY}&include_adult=false&with_original_language=en&vote_count.gte=20`
};

// Genre IDs (from TMDb)
const GENRES = {
    action: 28, comedy: 35, drama: 18, horror: 27, romance: 10749, thriller: 53, scifi: 878
};

// Load initial content
document.addEventListener("DOMContentLoaded", () => {
    const genre = localStorage.getItem('preferredGenre');
    const mainUrl = genre ? `${LANGUAGE_APIS.malayalam}&with_genres=${genre}` : LANGUAGE_APIS.malayalam;
    getMovies(mainUrl);
    setupLanguageSections();

    document.getElementById('homeButton').addEventListener('click', () => window.location.href = 'index.html');
    document.getElementById('watchlistBtn').addEventListener('click', showWatchlist);
    if (localStorage.getItem('theme') === 'dark') document.documentElement.dataset.theme = 'dark';
});

function setupLanguageSections() {
    ['malayalam', 'tamil', 'hindi', 'english'].forEach(lang => {
        const genreContainer = document.getElementById(`${lang}Genres`);
        const movieContainer = document.getElementById(`${lang}Movies`);
        setupGenreButtons(lang, genreContainer, movieContainer);
        getMoviesByLanguage(LANGUAGE_APIS[lang], movieContainer, lang, 60);
    });
}

function setupGenreButtons(lang, container, movieContainer) {
    Object.entries(GENRES).forEach(([name, id]) => {
        const btn = document.createElement('button');
        btn.textContent = name.charAt(0).toUpperCase() + name.slice(1);
        btn.addEventListener('click', () => {
            toggleActiveGenreButton(btn, container);
            getMoviesByLanguage(`${LANGUAGE_APIS[lang]}&with_genres=${id}`, movieContainer, lang, 60);
        });
        container.appendChild(btn);
    });
}

function toggleActiveGenreButton(activeBtn, container) {
    container.querySelectorAll('button').forEach(btn => btn.classList.remove('active'));
    activeBtn.classList.add('active');
}

async function getMovies(url) {
    spinner.style.display = 'block';
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed to fetch movies');
        const data = await res.json();
        const safeMovies = filterSafeMovies(data.results);
        showMovies(safeMovies);
    } catch (error) {
        console.error(error);
        showPopup("❌ Error fetching movie data.");
    }
    spinner.style.display = 'none';
}

async function getMoviesByLanguage(url, container, lang, limit = 60) {
    try {
        const movies = await fetchMoviesAcrossPages(url, Math.ceil(limit / 20), limit);
        showMoviesInContainer(movies, container, lang);
    } catch (error) {
        console.error(error);
        showPopup(`❌ Error fetching ${lang} movies.`);
    }
}

async function fetchMoviesAcrossPages(url, pages, limit) {
    let movies = [];
    for (let page = 1; page <= pages; page++) {
        const pageUrl = url.includes('trending') ? url : `${url}&page=${page}`;
        const res = await fetch(pageUrl);
        if (!res.ok) throw new Error('Failed to fetch movies');
        const data = await res.json();
        movies.push(...(data.results || data.movies));
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
    movies.forEach(movie => {
        const movieEl = createMovieElement(movie);
        main.appendChild(movieEl);
    });
}

function showMoviesInContainer(movies, container, lang) {
    container.innerHTML = '';
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
        <img src="${posterUrl}" loading="lazy" alt="${title}">
        <div class="movie-info">
            <h3>${title}</h3>
            <button class="add-watchlist" data-id="${id}" data-title="${title}" data-poster="${posterUrl}">Add to Watchlist</button>
            <button class="watch-movie" data-title="${title}">Watch Movie</button>
        </div>
    `;
    movieEl.querySelector('img').addEventListener('click', () => openMoviePopUp(title, overview));
    movieEl.querySelector('.add-watchlist').addEventListener('click', addToWatchlist);
    movieEl.querySelector('.watch-movie').addEventListener('click', () => watchMovie(title));
    return movieEl;
}

form.addEventListener('submit', (e) => {
    e.preventDefault();
    const searchTerm = search.value.trim();
    if (searchTerm) getMovies(SEARCH_API + searchTerm);
    search.value = '';
});

function addToWatchlist(event) {
    const { id, title, poster } = event.target.dataset;
    let watchlist = JSON.parse(localStorage.getItem('watchlist') || '[]');
    if (!watchlist.some(item => item.id === id)) {
        watchlist.push({ id, title, poster });
        localStorage.setItem('watchlist', JSON.stringify(watchlist));
        showPopup('✅ Added to watchlist!');
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
            <img src="${item.poster}" loading="lazy" alt="${item.title}">
            <div class="movie-info">
                <h3>${item.title}</h3>
                <button class="remove-watchlist" data-id="${item.id}">Remove</button>
                <button class="watch-movie" data-title="${item.title}">Watch Movie</button>
            </div>
        `;
        main.appendChild(movieEl);
        movieEl.querySelector('.remove-watchlist').addEventListener('click', () => {
            watchlist.splice(watchlist.findIndex(i => i.id === item.id), 1);
            localStorage.setItem('watchlist', JSON.stringify(watchlist));
            showWatchlist();
        });
        movieEl.querySelector('.watch-movie').addEventListener('click', () => watchMovie(item.title));
    });
}

async function watchMovie(movieTitle) {
    try {
        const response = await fetch(`${YOUTUBE_SEARCH_API}?part=snippet&q=${encodeURIComponent(movieTitle + ' full movie')}&type=video&maxResults=1&key=${YOUTUBE_API_KEY}`);
        if (!response.ok) throw new Error('Failed to fetch movie');
        const data = await response.json();
        if (data.items && data.items.length > 0) {
            const videoId = data.items[0].id.videoId;
            window.open(`https://www.youtube.com/watch?v=${videoId}`, '_blank');
        } else {
            showPopup('❌ Full movie not found on YouTube.');
        }
    } catch (error) {
        console.error('Error fetching movie:', error);
        showPopup('❌ Error loading movie. Please try again.');
    }
}

function openMoviePopUp(movieTitle, overviewText) {
    if (!movieTitle || !overviewText) return;
    const moviePopUp = document.createElement('div');
    moviePopUp.classList.add('popup');
    moviePopUp.innerHTML = `
        <div class="popup-content">
            <h2>${movieTitle}</h2>
            <p>${overviewText}</p>
            <div id="trailerContainer" style="display: none;">
                <iframe id="trailerFrame" width="100%" height="315" frameborder="0" allowfullscreen></iframe>
            </div>
            <button id="messageButton">Message Me</button>
            <button id="trailerButton">Watch Trailer</button>
            <button id="watchMovieButton">Watch Movie</button>
            <button id="closePopUpButton">Close</button>
        </div>
    `;
    document.body.appendChild(moviePopUp);
    
    const closeButton = document.getElementById('closePopUpButton');
    const messageButton = document.getElementById('messageButton');
    const trailerButton = document.getElementById('trailerButton');
    const watchMovieButton = document.getElementById('watchMovieButton');

    closeButton.addEventListener('click', () => moviePopUp.remove());
    messageButton.addEventListener('click', () => {
        localStorage.setItem('selectedMovie', movieTitle);
        window.location.href = 'form.html';
    });
    trailerButton.addEventListener('click', () => {
        const trailerContainer = document.getElementById('trailerContainer');
        if (trailerContainer.style.display === 'none') showTrailer(movieTitle, trailerContainer);
        else {
            trailerContainer.style.display = 'none';
            trailerButton.textContent = 'Watch Trailer';
            document.getElementById('trailerFrame').src = '';
        }
    });
    watchMovieButton.addEventListener('click', () => watchMovie(movieTitle));
}

async function showTrailer(movieTitle, trailerContainer) {
    try {
        const response = await fetch(`${YOUTUBE_SEARCH_API}?part=snippet&q=${encodeURIComponent(movieTitle + ' official trailer')}&type=video&maxResults=1&key=${YOUTUBE_API_KEY}`);
        if (!response.ok) throw new Error('Failed to fetch trailer');
        const data = await response.json();
        if (data.items && data.items.length > 0) {
            const videoId = data.items[0].id.videoId;
            document.getElementById('trailerFrame').src = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
            trailerContainer.style.display = 'block';
            document.getElementById('trailerButton').textContent = 'Hide Trailer';
        } else showPopup('❌ No trailer found for this movie.');
    } catch (error) {
        console.error('Error fetching trailer:', error);
        showPopup('❌ Error loading trailer. Please try again.');
    }
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
    document.getElementById('closePopupButton').addEventListener('click', () => popup.remove());
}

document.getElementById("helpButton")?.addEventListener("click", showHelpPopup);

function showHelpPopup() {
    const popupContent = document.createElement('div');
    popupContent.classList.add('popup-content');
    popupContent.style.position = 'fixed';
    popupContent.style.top = '50%';
    popupContent.style.left = '50%';
    popupContent.style.transform = 'translate(-50%, -50%)';
    popupContent.style.maxWidth = '400px';
    popupContent.style.textAlign = 'center';
    popupContent.style.backgroundColor = 'var(--card-bg)';
    popupContent.style.padding = '70px';
    popupContent.innerHTML = `
        <h1 style="color: #28a745; margin-bottom: 15px; font-size: 24px;">Need Help?</h1>
        <p style="color: var(--text); line-height: 1.5; font-size: 18px;">For assistance, watch the video below 👇</p>
        <a href="#" style="display: inline-block; margin: 15px 0; color: #28a745; text-decoration: none; font-weight: bold; font-size: 18px;">Click Here</a><br>
        <button id="closePopupButton" style="background-color: #28a745; color: #ffffff; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; font-size: 16px;">Close</button>
    `;
    document.body.appendChild(popupContent);
    const link = popupContent.querySelector('a');
    const closeButton = popupContent.querySelector('#closePopupButton');
    closeButton.addEventListener('click', () => popupContent.remove());
    link.addEventListener('click', (e) => {
        e.preventDefault();
        popupContent.innerHTML = `
            <h1 style="color: #28a745; margin-bottom: 15px; font-size: 24px;">Tutorial</h1>
            <iframe width="100%" height="315" src="https://drive.google.com/file/d/1eM-23YvQ1xDD-IMl5jyLxxeQBzidmWjG/preview" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>
            <button id="closePopupButton" style="background-color: #28a745; color: #ffffff; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; font-size: 16px; margin-top: 20px;">Close</button>
        `;
        popupContent.querySelector('#closePopupButton').addEventListener('click', () => popupContent.remove());
    });
}
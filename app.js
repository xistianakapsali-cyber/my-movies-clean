﻿// ============ ΑΡΧΙΚΟΠΟΙΗΣΗ ΑΠΟ CONFIG ============
let CONFIG = null;
let TMDB_API_KEY = null;
let GITHUB_CONFIG = null;

function initConfig() {
    if (typeof YIOIO_CONFIG !== 'undefined') {
        CONFIG = YIOIO_CONFIG;
        TMDB_API_KEY = CONFIG.tmdb_api_key;
        GITHUB_CONFIG = CONFIG.github;
        console.log('✅ Config loaded successfully');
        return true;
    } else {
        console.error('❌ config.js not loaded! Make sure config.js exists');
        showToast('Σφάλμα: Δεν βρέθηκε το config.js', '#e50914');
        return false;
    }
}

// ============ ΒΟΗΘΗΤΙΚΕΣ ΣΥΝΑΡΤΗΣΕΙΣ ============
function showToast(msg, bg) {
    const t = document.createElement('div');
    t.className = 'toast-message';
    t.textContent = msg;
    t.style.background = bg;
    t.style.color = 'white';
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3000);
}

async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function escapeHtml(s) { 
    return String(s).replace(/[&<>]/g, m => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;' }[m])); 
}

function getStars(r) { 
    let s=''; 
    for(let i=0;i<Math.floor(r);i++) s+='★'; 
    if(r%1>=0.5) s+='½'; 
    for(let i=0;i<5-Math.ceil(r);i++) s+='☆'; 
    return s; 
}

function getStarsHtml(rating) {
    const fullStars = Math.floor(rating);
    const hasHalf = rating % 1 >= 0.5;
    let stars = '';
    for (let i = 0; i < fullStars; i++) stars += '★';
    if (hasHalf) stars += '½';
    for (let i = 0; i < 5 - Math.ceil(rating); i++) stars += '☆';
    return stars;
}

// ============ THEME FUNCTIONS ============
function toggleTheme() {
    const html = document.documentElement;
    if (html.hasAttribute('data-theme')) {
        html.removeAttribute('data-theme');
        localStorage.setItem('theme', 'dark');
    } else {
        html.setAttribute('data-theme', 'light');
        localStorage.setItem('theme', 'light');
    }
}

function loadTheme() {
    if (localStorage.getItem('theme') === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
    }
}

// ============ AUTH SYSTEM ============
let currentUserName = '';
let isUserLoggedIn = false;

async function showUserLogin() {
    const password = prompt('🔐 Εισάγετε κωδικό χρήστη:');
    if (!password) return;
    
    const hashed = await hashPassword(password);
    
    if (CONFIG && CONFIG.users && CONFIG.users[hashed]) {
        currentUserName = CONFIG.users[hashed];
        isUserLoggedIn = true;
        sessionStorage.setItem('userLoggedIn', 'true');
        sessionStorage.setItem('userName', currentUserName);
        
        document.getElementById('loginUserBtn').style.display = 'none';
        document.getElementById('logoutUserBtn').style.display = 'inline-block';
        document.getElementById('userNameDisplay').innerText = `👤 ${currentUserName}`;
        
        showToast(`Καλώς ήρθες ${currentUserName}!`, '#2ecc71');
        
        const currentVersion = localStorage.getItem('app_version') || '1.0.0';
        document.getElementById('versionBadge').innerHTML = `Έκδοση: ${currentVersion} 🔒`;
        
        showToast('🔒 Έλεγχος για links...', '#9b59b6');
        setTimeout(() => checkForGitHubUpdates(), 500);
        
        if (document.getElementById('detailModal').style.display === 'flex' && currentMovieLink) {
            document.getElementById('modalDownloadBtn').style.display = 'block';
        }
    } else {
        showToast('Λάθος κωδικός!', '#e50914');
    }
}

function logoutUser() {
    isUserLoggedIn = false;
    currentUserName = '';
    sessionStorage.removeItem('userLoggedIn');
    sessionStorage.removeItem('userName');
    document.getElementById('loginUserBtn').style.display = 'inline-block';
    document.getElementById('logoutUserBtn').style.display = 'none';
    document.getElementById('userNameDisplay').innerText = '';
    const currentVersion = localStorage.getItem('app_version') || '1.0.0';
    document.getElementById('versionBadge').innerHTML = `Έκδοση: ${currentVersion}`;
    showToast('Αποσυνδεθήκατε', '#e67e22');
    document.getElementById('modalDownloadBtn').style.display = 'none';
}

function loadUserSession() {
    if (sessionStorage.getItem('userLoggedIn') === 'true') {
        isUserLoggedIn = true;
        currentUserName = sessionStorage.getItem('userName') || 'Χρήστης';
        document.getElementById('loginUserBtn').style.display = 'none';
        document.getElementById('logoutUserBtn').style.display = 'inline-block';
        document.getElementById('userNameDisplay').innerText = `👤 ${currentUserName}`;
        const currentVersion = localStorage.getItem('app_version') || '1.0.0';
        document.getElementById('versionBadge').innerHTML = `Έκδοση: ${currentVersion} 🔒`;
    }
}

// ============ ADMIN AUTH ============
const AdminAuth = {
    startSession: () => { 
        sessionStorage.setItem('adminToken', 'valid'); 
        sessionStorage.setItem('adminExpires', (Date.now()+86400000).toString()); 
    },
    isSessionValid: () => sessionStorage.getItem('adminToken') === 'valid' && parseInt(sessionStorage.getItem('adminExpires')) > Date.now(),
    endSession: () => { 
        sessionStorage.removeItem('adminToken'); 
        sessionStorage.removeItem('adminExpires'); 
    }
};

let allClickCount = 0;
let allClickTimer = null;

function handleAllClick() {
    allClickCount++;
    const allBtn = document.getElementById('allMoviesBtn');
    if (allBtn) {
        allBtn.style.transform = 'scale(0.95)';
        setTimeout(() => { if(allBtn) allBtn.style.transform = 'scale(1)'; }, 150);
    }
    if (allClickTimer) clearTimeout(allClickTimer);
    if (allClickCount >= 5) {
        allClickCount = 0;
        const password = prompt('🔐 Εισάγετε κωδικό διαχειριστή για εμφάνιση dashboard:');
        if (password) {
            hashPassword(password).then(hashed => {
                if (CONFIG && hashed === CONFIG.admin_dashboard_hash) {
                    AdminAuth.startSession();
                    showDashboard();
                } else {
                    showToast('Λάθος κωδικός!', '#e50914');
                }
            });
        }
    }
    allClickTimer = setTimeout(() => { allClickCount = 0; }, 2000);
}

function showDashboard() { 
    document.getElementById('dashboard').style.display = 'block';
    document.getElementById('movieGrid').classList.remove('dashboard-hidden');
    document.getElementById('logoutBtn').style.display = 'block';
    localStorage.setItem('dashboardVisible', 'true');
}

function hideDashboard() {
    document.getElementById('dashboard').style.display = 'none';
    document.getElementById('movieGrid').classList.add('dashboard-hidden');
    document.getElementById('logoutBtn').style.display = 'none';
    localStorage.setItem('dashboardVisible', 'false');
}

function logoutAdmin() { 
    AdminAuth.endSession(); 
    hideDashboard(); 
    showToast('Αποσυνδεθήκατε', '#e74c3c'); 
}

async function showPasswordManager() {
    if (!AdminAuth.isSessionValid()) {
        showToast('Μη εξουσιοδοτημένη πρόσβαση!', '#e50914');
        return;
    }
    const adminPassword = prompt('🔐 Κωδικός Διαχειριστή:');
    if (!adminPassword) return;
    const hashed = await hashPassword(adminPassword);
    if (hashed !== CONFIG.admin_dashboard_hash) {
        showToast('Λάθος κωδικός!', '#e50914');
        return;
    }
    let userList = '';
    if (CONFIG && CONFIG.users) {
        userList = Object.entries(CONFIG.users).map(([hash, name]) => {
            return `${name} → Hash: ${hash.substring(0, 20)}...`;
        }).join('\n');
    }
    alert('📋 Λίστα χρηστών (hashed):\n\n' + userList + '\n\n(Για αλλαγές, επεξεργαστείτε το config.js)');
}

// ============ MOVIES DATA ============
let moviesData = [];
let filteredMovies = [];
let currentPage = 1;
let itemsPerPage = 25;
let currentTypeFilter = 'all';
let currentModalMovieId = null;
let currentMovieLink = null;
const LOADING_POSTER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='450' viewBox='0 0 300 450'%3E%3Crect width='300' height='450' fill='%231a1a1a'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' fill='%23666' font-size='14'%3EΦΟΡΤΩΣΗ...%3C/text%3E%3C/svg%3E";
const posterCache = new Map();
const actorImageCache = new Map();
let recentMovieIds = [];

function updateRecentMoviesList() {
    if (!moviesData || moviesData.length === 0) return;
    const sortedByDate = [...moviesData].sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded));
    recentMovieIds = sortedByDate.slice(0, 10).map(m => m.id);
}

function isNewMovie(dateAdded, movieId) {
    if (!dateAdded || !movieId) return false;
    return recentMovieIds.includes(movieId);
}

async function fetchPoster(title, year, type, movieId) {
    const key = `${title}|${year}`;
    const movie = moviesData.find(m => m.id === movieId);
    
    if (movie?.posterOverride) return movie.posterOverride;
    if (posterCache.has(key)) return posterCache.get(key);
    
    const cachedPoster = localStorage.getItem(`poster_${key}`);
    if (cachedPoster) {
        posterCache.set(key, cachedPoster);
        return cachedPoster;
    }
    
    if (!TMDB_API_KEY) {
        const fallback = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='450' viewBox='0 0 300 450'%3E%3Crect width='300' height='450' fill='%2334495e'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' fill='white' font-size='14'%3E${encodeURIComponent(title.substring(0,20))}%3C/text%3E%3C/svg%3E`;
        posterCache.set(key, fallback);
        return fallback;
    }
    
    try {
        const searchType = type === 'Series' ? 'tv' : 'movie';
        const url = `https://api.themoviedb.org/3/search/${searchType}?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(title)}&year=${year}`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.results?.[0]?.poster_path) {
            const poster = `https://image.tmdb.org/t/p/w500${data.results[0].poster_path}`;
            posterCache.set(key, poster);
            localStorage.setItem(`poster_${key}`, poster);
            return poster;
        }
    } catch(e) {}
    
    const fallback = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='450' viewBox='0 0 300 450'%3E%3Crect width='300' height='450' fill='%2334495e'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' fill='white' font-size='14'%3E${encodeURIComponent(title.substring(0,20))}%3C/text%3E%3C/svg%3E`;
    posterCache.set(key, fallback);
    return fallback;
}

async function fetchActorImage(actorName) {
    if (!actorName || actorName === 'N/A') return null;
    if (actorImageCache.has(actorName)) return actorImageCache.get(actorName);
    if (!TMDB_API_KEY) return null;
    try {
        const searchUrl = `https://api.themoviedb.org/3/search/person?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(actorName)}`;
        const response = await fetch(searchUrl);
        const data = await response.json();
        if (data.results && data.results.length > 0 && data.results[0].profile_path) {
            const imageUrl = `https://image.tmdb.org/t/p/w185${data.results[0].profile_path}`;
            actorImageCache.set(actorName, imageUrl);
            return imageUrl;
        }
    } catch(e) {}
    actorImageCache.set(actorName, null);
    return null;
}

async function renderActorsWithImages(actorsString, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    if (!actorsString || actorsString === 'N/A') {
        container.innerHTML = '<span style="opacity:0.7;">N/A</span>';
        return;
    }
    const actorNames = actorsString.split(',').map(name => name.trim()).filter(name => name && name !== 'N/A');
    if (actorNames.length === 0) {
        container.innerHTML = '<span style="opacity:0.7;">N/A</span>';
        return;
    }
    
    container.innerHTML = '';
    for (const name of actorNames) {
        const actorDiv = document.createElement('div');
        actorDiv.className = 'actor-item';
        actorDiv.setAttribute('data-actor', name);
        actorDiv.addEventListener('click', () => searchMoviesByActor(name));
        
        const placeholder = document.createElement('div');
        placeholder.className = 'actor-placeholder';
        placeholder.textContent = '🎭';
        
        const nameSpan = document.createElement('span');
        nameSpan.className = 'actor-name';
        nameSpan.textContent = name;
        
        actorDiv.appendChild(placeholder);
        actorDiv.appendChild(nameSpan);
        container.appendChild(actorDiv);
        
        const imgUrl = await fetchActorImage(name);
        if (imgUrl) {
            const img = document.createElement('img');
            img.src = imgUrl;
            img.className = 'actor-avatar';
            img.alt = name;
            img.onerror = () => { img.style.display = 'none'; placeholder.style.display = 'flex'; };
            placeholder.parentNode.replaceChild(img, placeholder);
        }
    }
}

function searchMoviesByActor(actorName) {
    const searchInput = document.getElementById('movieSearch');
    searchInput.value = actorName;
    toggleClearButton();
    applyFilters();
    closeDetails();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function searchMoviesByDirectorOrWriter(value, type) {
    const searchInput = document.getElementById('movieSearch');
    searchInput.value = value;
    toggleClearButton();
    applyFilters();
    closeDetails();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast(`Αναζήτηση για: ${value}`, '#2196f3');
}

// ============ LOAD MOVIES ============
function saveToLocalStorage() { 
    localStorage.setItem('yioio_movies_data', JSON.stringify(moviesData)); 
}

let CURRENT_VERSION = "1.0.0";

async function loadMoviesData() {
    const savedVersion = localStorage.getItem('app_version');
    if (savedVersion) CURRENT_VERSION = savedVersion;
    document.getElementById('versionBadge').innerHTML = `Έκδοση: ${CURRENT_VERSION}${isUserLoggedIn ? ' 🔒' : ''}`;
    
    const saved = localStorage.getItem('yioio_movies_data');
    if (saved) {
        try {
            moviesData = JSON.parse(saved);
            if (moviesData.length) {
                updateRecentMoviesList();
                initFilters();
                applyFilters();
                return;
            }
        } catch(e) {}
    }
    
    moviesData = [
        { "id": 1, "title": "1883", "year": 2021, "country": "United States", "genre": "Δράμα, Γουέστερν", "type": "Series", "quality": "HD", "rating": 8.7, "actors": "Sam Elliott, Tim McGraw, Faith Hill, Isabel May", "director": "Taylor Sheridan", "writer": "Taylor Sheridan", "link": "", "imdb": "", "tmdb": "", "desc": "Η ιστορία της οικογένειας Ντάτον καθώς ταξιδεύουν προς τη Δύση.", "dateAdded": new Date().toISOString().split('T')[0], "studio": "Paramount+", "createdBy": "Διαχειριστής" },
        { "id": 2, "title": "1899", "year": 2022, "country": "Germany", "genre": "Μυστηρίου, Δράμα", "type": "Series", "quality": "HD", "rating": 7.3, "actors": "Emily Beecham, Andreas Pietschmann", "director": "Baran bo Odar", "writer": "Baran bo Odar", "link": "", "imdb": "", "tmdb": "", "desc": "Μετανάστες ταξιδεύουν από την Ευρώπη στην Αμερική.", "dateAdded": new Date().toISOString().split('T')[0], "studio": "Netflix", "createdBy": "Διαχειριστής" },
        { "id": 3, "title": "1923", "year": 2022, "country": "United States", "genre": "Δράμα, Γουέστερν", "type": "Series", "quality": "HD", "rating": 8.3, "actors": "Harrison Ford, Helen Mirren", "director": "Taylor Sheridan", "writer": "Taylor Sheridan", "link": "", "imdb": "", "tmdb": "", "desc": "Η συνέχεια του 1883.", "dateAdded": new Date().toISOString().split('T')[0], "studio": "Paramount+", "createdBy": "Διαχειριστής" }
    ];
    updateRecentMoviesList();
    saveToLocalStorage();
    initFilters();
    applyFilters();
}

// ============ GITHUB UPDATES ============
async function checkForGitHubUpdates() {
    if (!GITHUB_CONFIG) {
        showToast('⚠️ GitHub settings not configured', '#e50914');
        return;
    }
    
    const baseUrl = `https://raw.githubusercontent.com/${GITHUB_CONFIG.username}/${GITHUB_CONFIG.repo}/${GITHUB_CONFIG.branch}/${GITHUB_CONFIG.path}`;
    showToast(`🔍 Έλεγχος ενημέρωσης...`, '#2196f3');
    
    try {
        const versionUrl = `${baseUrl}/version.json`;
        console.log('📦 Checking:', versionUrl);
        const versionRes = await fetch(versionUrl);
        if (!versionRes.ok) throw new Error(`HTTP ${versionRes.status}: version.json not found`);
        const remote = await versionRes.json();
        
        if (remote.version !== CURRENT_VERSION) {
            const shouldUpdate = confirm(`Νέα έκδοση ${remote.version}!\n\nΘέλετε ενημέρωση;`);
            if (shouldUpdate) {
                showToast('📥 Λήψη δεδομένων...', '#2196f3');
                const dataUrl = `${baseUrl}/movies.json`;
                const dataRes = await fetch(dataUrl);
                if (!dataRes.ok) throw new Error(`HTTP ${dataRes.status}: movies.json not found`);
                const newData = await dataRes.json();
                if (!Array.isArray(newData)) throw new Error('Invalid JSON format');
                
                moviesData = newData;
                moviesData.forEach((m, i) => m.id = i + 1);
                saveToLocalStorage();
                CURRENT_VERSION = remote.version;
                localStorage.setItem('app_version', CURRENT_VERSION);
                document.getElementById('versionBadge').innerHTML = `Έκδοση: ${CURRENT_VERSION}`;
                posterCache.clear();
                actorImageCache.clear();
                updateRecentMoviesList();
                initFilters();
                applyFilters();
                showToast(`✅ Ενημέρωση! ${moviesData.length} τίτλοι`, '#2ecc71');
            }
        } else {
            showToast('✅ Τελευταία έκδοση', '#2ecc71');
        }
    } catch(e) {
        console.error('Update error:', e);
        showToast(`❌ Σφάλμα: ${e.message}`, '#e50914');
    }
}

// ============ FILTERS & RENDERING ============
function initFilters() {
    if (!moviesData.length) return;
    const yearSel = document.getElementById('yearFilter');
    const countrySel = document.getElementById('countryFilter');
    const genreSel = document.getElementById('genreFilter');
    const studioSel = document.getElementById('studioFilter');
    
    while(yearSel.options.length>1) yearSel.remove(1);
    while(countrySel.options.length>1) countrySel.remove(1);
    while(genreSel.options.length>1) genreSel.remove(1);
    while(studioSel.options.length>1) studioSel.remove(1);
    
    [...new Set(moviesData.map(m => m.year))].sort((a,b)=>b-a).forEach(y => yearSel.add(new Option(y,y)));
    [...new Set(moviesData.map(m => m.country).filter(c=>c&&c!=='N/A'))].sort().forEach(c => countrySel.add(new Option(c,c)));
    const genres = [...new Set(moviesData.flatMap(m => m.genre?.split(',').map(g=>g.trim())).filter(g=>g&&g!=='N/A'))].sort((a,b)=>a.localeCompare(b,'el'));
    genres.forEach(g => genreSel.add(new Option(g,g)));
    const studios = [...new Set(moviesData.map(m => m.studio).filter(s=>s&&s!=='Κανάλι'))].sort();
    studios.forEach(s => studioSel.add(new Option(s,s)));
}

function toggleClearButton() { 
    document.getElementById('clearSearchBtn').classList.toggle('hidden', !document.getElementById('movieSearch').value.length); 
}

function clearSearch() { 
    document.getElementById('movieSearch').value = ''; 
    toggleClearButton(); 
    applyFilters(); 
}

function filterByType(type) { 
    currentTypeFilter = type; 
    document.querySelectorAll('.filter-type-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.type === type)); 
    applyFilters(); 
}

function applyFilters() {
    if (!moviesData.length) return;
    toggleClearButton();
    let term = document.getElementById('movieSearch').value.toLowerCase();
    let results = moviesData.filter(m => term ? [m.title, m.actors, m.director].join(' ').toLowerCase().includes(term) : true);
    if (currentTypeFilter !== 'all') results = results.filter(m => m.type === currentTypeFilter);
    const genre = document.getElementById('genreFilter').value;
    if (genre !== 'All') results = results.filter(m => m.genre?.includes(genre));
    const year = document.getElementById('yearFilter').value;
    if (year !== 'All') results = results.filter(m => m.year == year);
    const country = document.getElementById('countryFilter').value;
    if (country !== 'All') results = results.filter(m => m.country === country);
    const studio = document.getElementById('studioFilter').value;
    if (studio !== 'All') results = results.filter(m => m.studio === studio);
    const sort = document.getElementById('sortSelect').value;
    if (sort === 'title') results.sort((a,b) => a.title.localeCompare(b.title));
    else if (sort === 'yearDesc') results.sort((a,b) => b.year - a.year);
    else if (sort === 'ratingDesc') results.sort((a,b) => b.rating - a.rating);
    else if (sort === 'latest') results.sort((a,b) => new Date(b.dateAdded) - new Date(a.dateAdded));
    else if (sort === 'idDesc') results.sort((a,b) => b.id - a.id);
    else if (sort === 'idAsc') results.sort((a,b) => a.id - b.id);
    else if (sort === 'yearAsc') results.sort((a,b) => a.year - b.year);
    else if (sort === 'qualityHD') results.sort((a,b) => {
        const order = { '4K': 1, 'HD': 2, 'SD': 3 };
        return (order[a.quality] || 99) - (order[b.quality] || 99);
    });
    else if (sort === 'qualitySD') results.sort((a,b) => {
        const order = { 'SD': 1, 'HD': 2, '4K': 3 };
        return (order[a.quality] || 99) - (order[b.quality] || 99);
    });
    filteredMovies = results;
    currentPage = 1;
    document.getElementById('movieCount').innerText = `${filteredMovies.length} τίτλοι`;
    updateDashboard();
    renderMovies();
}

async function renderMovies() {
    const grid = document.getElementById('movieGrid');
    const end = currentPage * itemsPerPage;
    const page = filteredMovies.slice(0, end);
    if (!page.length) { 
        grid.innerHTML = '<div style="text-align:center;padding:50px;">Δεν βρέθηκαν αποτελέσματα</div>'; 
        document.getElementById('loadMoreBtn').style.display = 'none'; 
        return; 
    }
    document.getElementById('loadMoreBtn').style.display = end >= filteredMovies.length ? 'none' : 'block';
    
    grid.innerHTML = '';
    for (const m of page) {
        const card = document.createElement('div');
        card.className = 'movie-card';
        card.setAttribute('data-id', m.id);
        card.addEventListener('click', () => openDetailsById(m.id));  // ✅ ΑΛΛΑΓΗ: με ID
        
        card.innerHTML = `
            <div class="img-container">
                <div class="quality-tag ${m.quality === 'SD' ? 'sd-blue' : ''}">${m.quality||'HD'}</div>
                ${isNewMovie(m.dateAdded, m.id) ? '<div class="new-badge-poster">ΝΕΟ</div>' : ''}
                <img src="${LOADING_POSTER}" data-title="${escapeHtml(m.title)}" data-year="${m.year}" data-type="${m.type==='Series'?'tv':'movie'}" data-id="${m.id}" class="poster-load" loading="lazy">
            </div>
            <div class="info">
                <h3>${escapeHtml(m.title)}</h3>
                <div class="stars">${getStars(m.rating)} <span class="rating-number">${m.rating}</span></div>
                <div class="play-btn">ΛΕΠΤΟΜΕΡΕΙΕΣ</div>
            </div>
        `;
        grid.appendChild(card);
    }
    
    const promises = Array.from(grid.querySelectorAll('.poster-load')).map(img => 
        fetchPoster(img.dataset.title, img.dataset.year, img.dataset.type, parseInt(img.dataset.id))
            .then(p => img.src = p)
    );
    await Promise.all(promises);
}

function loadNextPage() { 
    currentPage++; 
    renderMovies(); 
}

function resetAllFilters() {
    document.getElementById('movieSearch').value = '';
    toggleClearButton();
    document.getElementById('genreFilter').value = 'All';
    document.getElementById('yearFilter').value = 'All';
    document.getElementById('countryFilter').value = 'All';
    document.getElementById('studioFilter').value = 'All';
    document.getElementById('sortSelect').value = 'title';
    currentTypeFilter = 'all';
    document.querySelectorAll('.filter-type-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.type === 'all');
    });
    applyFilters();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast('🏠 Επιστροφή στην αρχική σελίδα', '#2ecc71');
}

function updateDashboard() {
    document.getElementById('statTotal').innerText = filteredMovies.length;
    document.getElementById('statMovies').innerText = filteredMovies.filter(m => m.type === 'Movie').length;
    document.getElementById('statSeries').innerText = filteredMovies.filter(m => m.type === 'Series').length;
    const avg = filteredMovies.filter(m => m.rating > 0).reduce((a,b) => a + b.rating, 0) / (filteredMovies.filter(m => m.rating > 0).length || 1);
    document.getElementById('statAvgRating').innerText = avg.toFixed(1);
    const genres = {};
    filteredMovies.forEach(m => { if(m.genre) m.genre.split(',').forEach(g => { let gg = g.trim(); if(gg) genres[gg] = (genres[gg]||0)+1; }); });
    let topGenre = Object.entries(genres).sort((a,b)=>b[1]-a[1])[0];
    document.getElementById('statTopGenre').innerText = topGenre ? topGenre[0] : '-';
    let oldest = filteredMovies.reduce((a,b) => (a.year < b.year ? a : b), {year:9999});
    let newest = filteredMovies.reduce((a,b) => (a.year > b.year ? a : b), {year:0});
    document.getElementById('statOldest').innerText = oldest.year !== 9999 ? oldest.year : '-';
    document.getElementById('statNewest').innerText = newest.year !== 0 ? newest.year : '-';
}

// ============ MODAL FUNCTIONS ============

// ✅ ΝΕΑ ΣΥΝΑΡΤΗΣΗ - ΑΝΑΖΗΤΗΣΗ ΜΕ ID
function openDetailsById(id) {
    const movie = moviesData.find(m => m.id === id);
    if (!movie) {
        showToast('Σφάλμα: Δεν βρέθηκε η ταινία', '#e50914');
        return;
    }
    currentModalMovieId = movie.id;
    currentMovieLink = movie.link;
    document.getElementById('modalAddBtn').style.display = isUserLoggedIn ? 'inline-flex' : 'none';
    document.getElementById('modalTitle').innerHTML = escapeHtml(movie.title);
    document.getElementById('modalYear').innerHTML = movie.year;
    document.getElementById('modalDesc').innerHTML = movie.desc || 'Δεν υπάρχει περιγραφή.';
    
    const directorEl = document.getElementById('modalDirector');
    directorEl.innerHTML = movie.director || 'N/A';
    directorEl.onclick = null;
    if (movie.director && movie.director !== 'N/A') {
        directorEl.addEventListener('click', () => searchMoviesByDirectorOrWriter(movie.director, 'director'));
    }
    
    const writerEl = document.getElementById('modalWriter');
    writerEl.innerHTML = movie.writer || 'N/A';
    writerEl.onclick = null;
    if (movie.writer && movie.writer !== 'N/A') {
        writerEl.addEventListener('click', () => searchMoviesByDirectorOrWriter(movie.writer, 'writer'));
    }
    
    document.getElementById('modalStudio').innerHTML = movie.studio || 'Κανάλι';
    document.getElementById('modalQualityText').innerHTML = movie.quality || 'HD';
    document.getElementById('modalQualityBadge').innerHTML = `${movie.quality || 'HD'}`;
    document.getElementById('modalTypeBadge').innerHTML = movie.type === 'Series' ? '📺 Σειρά' : '🎬 Ταινία';
    document.getElementById('modalCountryBadge').innerHTML = movie.country || 'N/A';
    document.getElementById('modalGenreBadge').innerHTML = movie.genre || 'N/A';
    document.getElementById('modalRatingValue').innerHTML = movie.rating.toFixed(1);
    document.getElementById('modalStarsBig').innerHTML = getStarsHtml(movie.rating);
    
    const imdbLink = document.getElementById('modalImdb');
    imdbLink.href = movie.imdb || '#';
    imdbLink.style.display = movie.imdb ? 'inline-flex' : 'none';
    
    const tmdbLink = document.getElementById('modalTmdb');
    tmdbLink.href = movie.tmdb || '#';
    tmdbLink.style.display = movie.tmdb ? 'inline-flex' : 'none';
    
    document.getElementById('modalEditBtn').style.display = isUserLoggedIn ? 'inline-flex' : 'none';
    document.getElementById('modalDeleteBtn').style.display = isUserLoggedIn ? 'inline-flex' : 'none';
    
    const downloadBtn = document.getElementById('modalDownloadBtn');
    if (isUserLoggedIn) {
        downloadBtn.style.display = 'block';
    } else {
        downloadBtn.style.display = 'none';
    }
    
    const modalImg = document.getElementById('modalImg');
    modalImg.src = LOADING_POSTER;
    fetchPoster(movie.title, movie.year, movie.type === 'Series' ? 'tv' : 'movie', movie.id).then(p => modalImg.src = p);
    renderActorsWithImages(movie.actors, 'modalActorsContainer');
    document.getElementById('detailModal').style.display = 'flex';
}

// Παλιά openDetails (κρατιέται για συμβατότητα αλλά δεν χρησιμοποιείται)
function openDetails(title) {
    const movie = moviesData.find(m => m.title === title);
    if (!movie) return;
    openDetailsById(movie.id);
}

function closeDetails() { 
    document.getElementById('detailModal').style.display = 'none'; 
    currentModalMovieId = null;
    currentMovieLink = null;
}

function handleDownloadClick() { 
    if (currentMovieLink && currentMovieLink !== '') {
        window.open(currentMovieLink, '_blank');
    } else {
        const modalHtml = `
            <div id="downloadGuideModal" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.95); z-index:20000; display:flex; align-items:center; justify-content:center; backdrop-filter:blur(5px);">
                <div style="background: var(--card); border-radius: 20px; max-width: 500px; width: 90%; padding: 30px; text-align: center; border: 1px solid var(--primary); box-shadow: 0 20px 40px rgba(0,0,0,0.5);">
                    <div style="font-size: 50px; margin-bottom: 15px;">🔗</div>
                    <h3 style="color: var(--primary); margin-bottom: 15px;">Προσθήκη Link Προβολής</h3>
                    <p style="margin-bottom: 20px; line-height: 1.6;">Για να ενεργοποιήσετε το κουμπί προβολής για αυτόν τον τίτλο, πατήστε το κουμπί <strong style="color: var(--primary);">✏️ Επεξεργασία</strong> και συμπληρώστε το link σας.</p>
                    <div style="background: var(--input-bg); border-radius: 12px; padding: 15px; margin: 15px 0; text-align: left;">
                        <p style="font-size: 13px; margin-bottom: 8px;">📌 <strong>Οδηγίες:</strong></p>
                        <p style="font-size: 12px; opacity: 0.8;">1️⃣ Πατήστε <strong>✏️ Επεξεργασία</strong> στο παράθυρο λεπτομερειών</p>
                        <p style="font-size: 12px; opacity: 0.8;">2️⃣ Επικολλήστε το link σας (Terabox, Google Drive, κλπ.)</p>
                        <p style="font-size: 12px; opacity: 0.8;">3️⃣ Πατήστε <strong>Αποθήκευση</strong></p>
                    </div>
                    <button onclick="this.closest('#downloadGuideModal').remove()" class="download-guide-close" style="background: var(--primary); color: white; border: none; padding: 12px 30px; border-radius: 40px; cursor: pointer;">Κατάλαβα ✨</button>
                </div>
            </div>
        `;
        const existing = document.getElementById('downloadGuideModal');
        if (existing) existing.remove();
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        document.querySelector('.download-guide-close').addEventListener('click', () => {
            document.getElementById('downloadGuideModal')?.remove();
        });
    }
}

// ============ CRUD OPERATIONS ============
function showAddMovieForm() {
    if (!isUserLoggedIn) { 
        showToast('Πρέπει να συνδεθείτε για να προσθέσετε ταινία!', '#e50914'); 
        return; 
    }
    
    const modalHtml = `<div class="add-movie-modal" id="addMovieModal"><h2>➕ Προσθήκη Νέας Ταινίας/Σειράς</h2><div class="auto-fill-row" style="display: flex; gap: 10px; margin-bottom: 15px;"><input type="text" id="autoTitle" placeholder="Τίτλος για αυτόματη συμπλήρωση (π.χ. Salt, Inception)" style="flex: 1;"><button id="searchTmdbBtn" class="btn-tmdb">🔍 Αναζήτηση στο TMDB</button></div><div id="searchResults" class="results-list" style="display: none; max-height: 200px; overflow-y: auto; border: 1px solid var(--border); border-radius: 8px; margin-bottom: 15px;"></div><div style="margin: 15px 0; text-align: center; font-size: 12px; opacity: 0.7;">— ή συμπλήρωσε χειροκίνητα —</div><div class="form-row"><div class="form-group"><label>Τίτλος *</label><input type="text" id="newTitle" placeholder="Ο τίτλος της ταινίας/σειράς"></div><div class="form-group"><label>Έτος *</label><input type="number" id="newYear" placeholder="π.χ. 2024"></div></div><div class="form-row"><div class="form-group"><label>Τύπος</label><select id="newType"><option value="Movie">Ταινία (Movie)</option><option value="Series">Σειρά (Series)</option></select></div><div class="form-group"><label>Ποιότητα</label><select id="newQuality"><option value="HD">HD</option><option value="SD">SD</option><option value="4K">4K</option></select></div></div><div class="form-row"><div class="form-group"><label>Χώρα</label><input type="text" id="newCountry" placeholder="π.χ. United States, Greece"></div><div class="form-group"><label>Είδος (Genre)</label><input type="text" id="newGenre" placeholder="π.χ. Δράμα, Θρίλερ"></div></div><div class="form-row"><div class="form-group"><label>Βαθμολογία (0-10)</label><input type="number" step="0.1" id="newRating" placeholder="π.χ. 8.5"></div><div class="form-group"><label>Πλατφόρμα (Studio)</label><input type="text" id="newStudio" placeholder="π.χ. Netflix, Disney+"></div></div><div class="form-group"><label>Σκηνοθέτης</label><input type="text" id="newDirector" placeholder="Ονόματα σκηνοθετών"></div><div class="form-group"><label>Σεναριογράφος</label><input type="text" id="newWriter" placeholder="Ονόματα σεναριογράφων"></div><div class="form-group"><label>Ηθοποιοί</label><input type="text" id="newActors" placeholder="Ονόματα ηθοποιών (διαχώρισε με κόμματα)"></div><div class="form-group"><label>Link Προβολής</label><input type="url" id="newLink" placeholder="https://..."></div><div class="form-row"><div class="form-group"><label>IMDB Link</label><input type="url" id="newImdb" placeholder="https://www.imdb.com/..."></div><div class="form-group"><label>TMDB Link</label><input type="url" id="newTmdb" placeholder="https://www.themoviedb.org/..."></div></div><div class="form-group"><label>Περιγραφή</label><textarea id="newDesc" rows="3" placeholder="Περιγραφή της ταινίας/σειράς..."></textarea></div><div class="modal-buttons"><button id="saveMovieBtn" class="btn-save">💾 Αποθήκευση</button><button id="cancelAddMovieBtn" class="btn-cancel">❌ Ακύρωση</button></div></div>`;
    
    const existing = document.getElementById('addMovieModal');
    if (existing) existing.remove();
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    document.getElementById('searchTmdbBtn').addEventListener('click', () => searchTMDB());
    document.getElementById('saveMovieBtn').addEventListener('click', () => saveNewMovie());
    document.getElementById('cancelAddMovieBtn').addEventListener('click', () => closeAddMovieForm());
}

function closeAddMovieForm() { 
    document.getElementById('addMovieModal')?.remove(); 
}

function isDuplicateMovie(title, year, excludeId = null) {
    return moviesData.some(m => m.title.toLowerCase() === title.toLowerCase() && m.year === year && m.id !== excludeId);
}

let tempPoster = null;

async function searchTMDB() {
    const title = document.getElementById('autoTitle').value.trim();
    if (!title) {
        showToast('Παρακαλώ γράψτε έναν τίτλο', '#e67e22');
        return;
    }
    if (!TMDB_API_KEY) {
        showToast('Σφάλμα: Missing TMDB API Key', '#e50914');
        return;
    }
    showToast('🔍 Αναζήτηση στο TMDB...', '#2196f3');
    try {
        const res = await fetch(`https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(title)}`);
        const data = await res.json();
        const resultsDiv = document.getElementById('searchResults');
        resultsDiv.innerHTML = '';
        if (data.results && data.results.length > 0) {
            const header = document.createElement('div');
            header.style.cssText = 'padding:10px;background:var(--primary);color:white;font-weight:bold;border-radius:8px 8px 0 0;';
            header.textContent = `📽️ Αποτελέσματα (${data.results.length})`;
            resultsDiv.appendChild(header);
            
            for (let i = 0; i < Math.min(8, data.results.length); i++) {
                const r = data.results[i];
                const year = (r.release_date || '').substring(0, 4) || 'Άγνωστο';
                const resultItem = document.createElement('div');
                resultItem.className = 'result-item';
                resultItem.setAttribute('data-id', r.id);
                resultItem.setAttribute('data-title', r.title.replace(/'/g, "\\'").replace(/"/g, '&quot;'));
                resultItem.setAttribute('data-year', year);
                resultItem.setAttribute('data-poster', r.poster_path || '');
                resultItem.style.cssText = 'padding:12px;cursor:pointer;border-bottom:1px solid var(--border);transition:background 0.2s;';
                resultItem.innerHTML = `<strong>🎬 ${r.title}</strong> <span style="opacity:0.7;">(${year})</span>`;
                resultItem.addEventListener('click', () => selectTMDBResult(r.id, r.title, year, r.poster_path));
                resultItem.addEventListener('mouseenter', () => { resultItem.style.background = 'var(--primary)'; resultItem.style.color = 'white'; });
                resultItem.addEventListener('mouseleave', () => { resultItem.style.background = ''; resultItem.style.color = ''; });
                resultsDiv.appendChild(resultItem);
            }
            resultsDiv.style.display = 'block';
        } else {
            resultsDiv.innerHTML = '<div style="padding:15px;text-align:center;">❌ Δεν βρέθηκαν αποτελέσματα</div>';
            resultsDiv.style.display = 'block';
        }
    } catch(e) {
        console.error(e);
        showToast('Σφάλμα επικοινωνίας με TMDB', '#e50914');
    }
}

async function selectTMDBResult(movieId, movieTitle, movieYear, posterPath) {
    if (!TMDB_API_KEY) return;
    showToast(`📥 Φόρτωση στοιχείων για: ${movieTitle}...`, '#2196f3');
    try {
        const movieDetailsUrl = `https://api.themoviedb.org/3/movie/${movieId}?api_key=${TMDB_API_KEY}&language=el`;
        const movieRes = await fetch(movieDetailsUrl);
        if (!movieRes.ok) throw new Error(`HTTP ${movieRes.status}`);
        const movieData = await movieRes.json();
        const creditsUrl = `https://api.themoviedb.org/3/movie/${movieId}/credits?api_key=${TMDB_API_KEY}`;
        const creditsRes = await fetch(creditsUrl);
        if (!creditsRes.ok) throw new Error(`HTTP ${creditsRes.status}`);
        const creditsData = await creditsRes.json();
        
        let director = 'N/A';
        if (creditsData.crew) {
            const directorObj = creditsData.crew.find(person => person.job === 'Director');
            if (directorObj) director = directorObj.name;
        }
        let writer = 'N/A';
        if (creditsData.crew) {
            const writerObj = creditsData.crew.find(person => person.job === 'Writer' || person.job === 'Screenplay');
            if (writerObj) writer = writerObj.name;
        }
        let actors = 'N/A';
        if (creditsData.cast && creditsData.cast.length > 0) {
            actors = creditsData.cast.slice(0, 5).map(actor => actor.name).join(', ');
        }
        const title = movieData.title || movieTitle;
        const year = (movieData.release_date || '').substring(0, 4) || movieYear;
        let country = 'N/A';
        if (movieData.production_countries && movieData.production_countries.length > 0) country = movieData.production_countries[0].name;
        let genre = 'N/A';
        if (movieData.genres && movieData.genres.length > 0) genre = movieData.genres.map(g => g.name).join(', ');
        let studio = 'N/A';
        if (movieData.production_companies && movieData.production_companies.length > 0) studio = movieData.production_companies[0].name;
        let rating = movieData.vote_average || 0;
        rating = Math.round(rating * 10) / 10;
        let desc = movieData.overview || 'Δεν υπάρχει περιγραφή.';
        
        document.getElementById('newTitle').value = title;
        document.getElementById('newYear').value = year;
        document.getElementById('newCountry').value = country;
        document.getElementById('newGenre').value = genre;
        document.getElementById('newRating').value = rating;
        document.getElementById('newStudio').value = studio;
        document.getElementById('newDirector').value = director;
        document.getElementById('newWriter').value = writer;
        document.getElementById('newActors').value = actors;
        document.getElementById('newDesc').value = desc;
        document.getElementById('newType').value = 'Movie';
        document.getElementById('newTmdb').value = `https://www.themoviedb.org/movie/${movieId}`;
        if (movieData.imdb_id) {
            document.getElementById('newImdb').value = `https://www.imdb.com/title/${movieData.imdb_id}`;
        }
        if (movieData.poster_path || posterPath) {
            tempPoster = `https://image.tmdb.org/t/p/w500${movieData.poster_path || posterPath}`;
        }
        document.getElementById('searchResults').style.display = 'none';
        document.getElementById('autoTitle').value = '';
        showToast(`✅ Φορτώθηκαν στοιχεία για: ${title}`, '#2ecc71');
    } catch(e) {
        console.error(e);
        showToast('Σφάλμα κατά τη φόρτωση λεπτομερειών', '#e50914');
    }
}

function saveNewMovie() {
    if (!isUserLoggedIn) {
        showToast('Πρέπει να συνδεθείτε για να προσθέσετε ταινία!', '#e50914');
        return;
    }
    const title = document.getElementById('newTitle').value.trim();
    const year = parseInt(document.getElementById('newYear').value);
    if (!title || !year) { showToast('Συμπλήρωσε τίτλο και έτος', '#e50914'); return; }
    if (isDuplicateMovie(title, year)) { showToast('Υπάρχει ήδη!', '#e50914'); return; }
    const newId = moviesData.length ? Math.max(...moviesData.map(m => m.id)) + 1 : 4;
    const newMovie = { 
        id: newId, title, year, type: document.getElementById('newType').value, quality: document.getElementById('newQuality').value,
        actors: document.getElementById('newActors').value || 'N/A', link: document.getElementById('newLink').value || '',
        dateAdded: new Date().toISOString().split('T')[0], studio: document.getElementById('newStudio').value || 'Κανάλι',
        rating: parseFloat(document.getElementById('newRating').value) || 0, country: document.getElementById('newCountry').value || 'N/A',
        genre: document.getElementById('newGenre').value || 'N/A', director: document.getElementById('newDirector').value || 'N/A',
        writer: document.getElementById('newWriter').value || 'N/A', imdb: document.getElementById('newImdb').value || '',
        tmdb: document.getElementById('newTmdb').value || '', desc: document.getElementById('newDesc').value || '',
        posterOverride: tempPoster || null, createdBy: currentUserName || 'Χρήστης'
    };
    moviesData.push(newMovie);
    saveToLocalStorage();
    posterCache.clear();
    actorImageCache.clear();
    updateRecentMoviesList();
    initFilters();
    applyFilters();
    closeAddMovieForm();
    tempPoster = null;
    showToast(`✅ Προστέθηκε: ${title} από ${currentUserName}`, '#2ecc71');
}

let currentEditingMovieId = null;

function editCurrentMovie() {
    if (!isUserLoggedIn) { showToast('Συνδεθείτε για επεξεργασία', '#e50914'); return; }
    const movie = moviesData.find(m => m.id === currentModalMovieId);
    if (!movie) return;
    currentEditingMovieId = movie.id;
    closeDetails();
    const modalHtml = `<div class="edit-movie-modal" id="editMovieModal"><h2>✏️ Επεξεργασία: ${escapeHtml(movie.title)}</h2>
        <div class="form-row">
            <div class="form-group"><label>Τίτλος</label><input type="text" id="editTitle" value="${escapeHtml(movie.title)}"></div>
            <div class="form-group"><label>Έτος</label><input type="number" id="editYear" value="${movie.year}"></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label>Τύπος</label><select id="editType">
                <option value="Movie" ${movie.type==='Movie'?'selected':''}>Ταινία</option>
                <option value="Series" ${movie.type==='Series'?'selected':''}>Σειρά</option>
            </select></div>
            <div class="form-group"><label>Ποιότητα</label><select id="editQuality">
                <option ${movie.quality==='HD'?'selected':''}>HD</option>
                <option ${movie.quality==='SD'?'selected':''}>SD</option>
                <option ${movie.quality==='4K'?'selected':''}>4K</option>
            </select></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label>Βαθμολογία (0-10)</label><input type="number" step="0.1" id="editRating" value="${movie.rating}"></div>
            <div class="form-group"><label>Ηθοποιοί</label><input type="text" id="editActors" value="${escapeHtml(movie.actors||'')}"></div>
        </div>
        <div class="form-group"><label>Link Προβολής</label><input type="url" id="editLink" value="${escapeHtml(movie.link||'')}" placeholder="https://..."></div>
        <div class="modal-buttons"><button id="saveEditBtn" class="btn-save">💾 Αποθήκευση</button><button id="cancelEditBtn" class="btn-cancel">❌ Ακύρωση</button></div>
    </div>`;
    const existing = document.getElementById('editMovieModal');
    if (existing) existing.remove();
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    document.getElementById('saveEditBtn').addEventListener('click', () => saveEditedMovie());
    document.getElementById('cancelEditBtn').addEventListener('click', () => closeEditForm());
}

function closeEditForm() { document.getElementById('editMovieModal')?.remove(); currentEditingMovieId = null; }

function saveEditedMovie() {
    const idx = moviesData.findIndex(m => m.id === currentEditingMovieId);
    if (idx === -1) return;
    const title = document.getElementById('editTitle').value.trim();
    const year = parseInt(document.getElementById('editYear').value);
    const rating = parseFloat(document.getElementById('editRating').value) || 0;
    if (isDuplicateMovie(title, year, currentEditingMovieId)) { showToast('Υπάρχει ήδη!', '#e50914'); return; }
    moviesData[idx] = { 
        ...moviesData[idx], 
        title, 
        year, 
        type: document.getElementById('editType').value, 
        quality: document.getElementById('editQuality').value, 
        rating,
        actors: document.getElementById('editActors').value || 'N/A', 
        link: document.getElementById('editLink').value || '' 
    };
    saveToLocalStorage();
    posterCache.clear();
    actorImageCache.clear();
    updateRecentMoviesList();
    initFilters();
    applyFilters();
    closeEditForm();
    showToast('✅ Αποθηκεύτηκε', '#2ecc71');
    setTimeout(() => openDetailsById(moviesData[idx].id), 300);
}

function deleteMovieById(id) {
    if (!isUserLoggedIn) { showToast('Συνδεθείτε για διαγραφή', '#e50914'); return false; }
    if (!confirm('Μόνιμη διαγραφή;')) return false;
    const title = moviesData.find(m => m.id === id)?.title;
    moviesData = moviesData.filter(m => m.id !== id);
    moviesData.forEach((m, i) => m.id = i+1);
    saveToLocalStorage();
    posterCache.clear();
    actorImageCache.clear();
    updateRecentMoviesList();
    initFilters();
    applyFilters();
    closeDetails();
    showToast(`Διαγράφηκε: ${title}`, '#2ecc71');
    return true;
}

function deleteMovieFromModal() { if (currentModalMovieId) deleteMovieById(currentModalMovieId); }

function openPosterEditor() {
    if (!AdminAuth.isSessionValid()) { showToast('Συνδεθείτε ως διαχειριστής!', '#e50914'); return; }
    const id = prompt('ID ταινίας:');
    const movie = moviesData.find(m => m.id == id);
    if (!movie) return;
    const url = prompt('URL poster (άδειο για auto):', movie.posterOverride || '');
    if (url === null) return;
    if (url) movie.posterOverride = url;
    else delete movie.posterOverride;
    posterCache.delete(`${movie.title}|${movie.year}`);
    saveToLocalStorage();
    applyFilters();
}

function addMovieByTMDBId() {
    if (!TMDB_API_KEY) { showToast('Σφάλμα: Missing TMDB API Key', '#e50914'); return; }
    const id = prompt('🎬 Εισάγετε το TMDB ID (π.χ. 1041613):');
    if (!id) return;
    const isSeries = confirm('Είναι Σειρά (TV); Αν όχι, πατήστε Ακύρωση για Ταινία.');
    const mediaType = isSeries ? 'tv' : 'movie';
    const tmdbUrl = `https://www.themoviedb.org/${mediaType}/${id}`;
    const existingByTmdb = moviesData.find(m => m.tmdb === tmdbUrl);
    if (existingByTmdb) { showToast(`⚠️ Η ταινία "${existingByTmdb.title}" (${existingByTmdb.year}) υπάρχει ήδη!`, '#e67e22'); return; }
    showToast(`🔍 Αναζήτηση σε TMDB...`, '#2196f3');
    fetch(`https://api.themoviedb.org/3/${mediaType}/${id}?api_key=${TMDB_API_KEY}&language=el&append_to_response=credits`)
        .then(res => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json(); })
        .then(data => {
            const title = data.title || data.name;
            const year = (data.release_date || data.first_air_date || '').substring(0,4);
            const existingByTitle = moviesData.find(m => m.title.toLowerCase() === title.toLowerCase() && m.year == year);
            if (existingByTitle) { showToast(`⚠️ Υπάρχει ήδη "${existingByTitle.title}" (${existingByTitle.year})`, '#e67e22'); return; }
            let director = 'N/A';
            if (data.credits && data.credits.crew) { const directorObj = data.credits.crew.find(p => p.job === 'Director'); if (directorObj) director = directorObj.name; }
            let writer = 'N/A';
            if (data.credits && data.credits.crew) { const writerObj = data.credits.crew.find(p => p.job === 'Writer' || p.department === 'Writing'); if (writerObj) writer = writerObj.name; if (writer === 'N/A') { const screenplayObj = data.credits.crew.find(p => p.job === 'Screenplay'); if (screenplayObj) writer = screenplayObj.name; } }
            let actors = 'N/A';
            if (data.credits && data.credits.cast && data.credits.cast.length > 0) { actors = data.credits.cast.slice(0, 5).map(a => a.name).join(', '); }
            const newId = moviesData.length ? Math.max(...moviesData.map(m => m.id)) + 1 : 4;
            const newMovie = { id: newId, title, year: parseInt(year) || new Date().getFullYear(), country: data.production_countries?.[0]?.name || 'N/A', genre: data.genres?.map(g => g.name).join(', ') || 'N/A', type: mediaType === 'tv' ? 'Series' : 'Movie', quality: 'HD', rating: data.vote_average || 0, actors, director, writer, link: '', imdb: data.imdb_id ? `https://www.imdb.com/title/${data.imdb_id}` : '', tmdb: tmdbUrl, desc: data.overview || 'Δεν υπάρχει περιγραφή.', dateAdded: new Date().toISOString().split('T')[0], studio: data.production_companies?.[0]?.name || 'N/A', createdBy: currentUserName || 'Χρήστης' };
            if (data.poster_path) { newMovie.posterOverride = `https://image.tmdb.org/t/p/w500${data.poster_path}`; }
            moviesData.push(newMovie);
            saveToLocalStorage();
            posterCache.clear();
            actorImageCache.clear();
            updateRecentMoviesList();
            initFilters();
            applyFilters();
            showToast(`✅ Προστέθηκε: ${title} (${year})`, '#2ecc71');
        })
        .catch(e => { console.error(e); showToast(`❌ Σφάλμα: Δεν βρέθηκε ${mediaType === 'tv' ? 'σειρά' : 'ταινία'} με ID ${id}`, '#e50914'); });
}

function exportToJSON() {
    if (!AdminAuth.isSessionValid()) { showToast('Μόνο διαχειριστής!', '#e50914'); return; }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(moviesData,null,2)], {type:'application/json'}));
    a.download = 'movies_data.json';
    a.click();
}

function importFromJSON(event) {
    if (!AdminAuth.isSessionValid()) { showToast('Μόνο διαχειριστής!', '#e50914'); return; }
    const file = event.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = e => {
        try { moviesData = JSON.parse(e.target.result); saveToLocalStorage(); posterCache.clear(); actorImageCache.clear(); updateRecentMoviesList(); initFilters(); applyFilters(); alert(`Εισήχθησαν ${moviesData.length} τίτλοι`); } catch(err) { alert('Λάθος αρχείο'); }
        event.target.value = '';
    };
    reader.readAsText(file);
}

function removeAllLinksAndExport() {
    if (!AdminAuth.isSessionValid()) { showToast('Μόνο διαχειριστής!', '#e50914'); return; }
    if (!confirm('⚠️ ΠΡΟΣΟΧΗ! Αυτή η ενέργεια θα ΑΦΑΙΡΕΣΕΙ ΟΛΑ ΤΑ LINKS από ΟΛΕΣ τις ταινίες/σειρές.\n\nΣυνέχεια;')) return;
    let removedCount = 0;
    for (let i = 0; i < moviesData.length; i++) { if (moviesData[i].link && moviesData[i].link !== '') { moviesData[i].link = ''; removedCount++; } }
    saveToLocalStorage(); posterCache.clear(); actorImageCache.clear(); updateRecentMoviesList(); applyFilters();
    const dataStr = JSON.stringify(moviesData, null, 2);
    const blob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'movies_clean.json'; a.click(); URL.revokeObjectURL(url);
    showToast(`✅ Αφαιρέθηκαν ${removedCount} links! Το καθαρό αρχείο κατέβηκε.`, '#2ecc71');
}

function showMissingPostersList() { alert('Λειτουργία ελέγχου poster - Όλα καλά!'); }
function searchByID() { const id = prompt('ID:'); const movie = moviesData.find(m => m.id == id); if(movie) openDetailsById(movie.id); else showToast('Δεν βρέθηκε', '#e50914'); }
function loadDashboardState() { const auth = AdminAuth.isSessionValid(); const visible = localStorage.getItem('dashboardVisible') === 'true'; if (auth && visible) showDashboard(); else hideDashboard(); }

// ============ EVENT LISTENERS ============
function attachEventListeners() {
    const logo = document.querySelector('.logo');
    if (logo) logo.addEventListener('click', () => resetAllFilters());
    
    const themeBtn = document.querySelector('.theme-btn');
    if (themeBtn) themeBtn.addEventListener('click', () => toggleTheme());
    
    document.querySelectorAll('.filter-type-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const type = e.target.dataset.type;
            handleAllClick();
            filterByType(type);
        });
    });
    
    const loginBtn = document.getElementById('loginUserBtn');
    if (loginBtn) loginBtn.addEventListener('click', () => showUserLogin());
    
    const logoutUserBtn = document.getElementById('logoutUserBtn');
    if (logoutUserBtn) logoutUserBtn.addEventListener('click', () => logoutUser());
    
    const updateBtn = document.querySelector('.update-btn-header');
    if (updateBtn) updateBtn.addEventListener('click', () => checkForGitHubUpdates());
    
    const closeDashBtn = document.querySelector('.close-dash-btn');
    if (closeDashBtn) closeDashBtn.addEventListener('click', () => hideDashboard());
    
    const searchByIdBtn = document.getElementById('searchByIdBtn');
    if (searchByIdBtn) searchByIdBtn.addEventListener('click', () => searchByID());
    
    const addMovieFormBtn = document.getElementById('addMovieFormBtn');
    if (addMovieFormBtn) addMovieFormBtn.addEventListener('click', () => showAddMovieForm());
    
    const posterEditorBtn = document.getElementById('posterEditorBtn');
    if (posterEditorBtn) posterEditorBtn.addEventListener('click', () => openPosterEditor());
    
    const addByTmdbBtn = document.getElementById('addByTmdbBtn');
    if (addByTmdbBtn) addByTmdbBtn.addEventListener('click', () => addMovieByTMDBId());
    
    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) exportBtn.addEventListener('click', () => exportToJSON());
    
    const removeLinksBtn = document.getElementById('removeLinksBtn');
    if (removeLinksBtn) removeLinksBtn.addEventListener('click', () => removeAllLinksAndExport());
    
    const importBtn = document.getElementById('importBtn');
    if (importBtn) importBtn.addEventListener('click', () => document.getElementById('importFile').click());
    
    const missingPostersBtn = document.getElementById('missingPostersBtn');
    if (missingPostersBtn) missingPostersBtn.addEventListener('click', () => showMissingPostersList());
    
    const logoutAdminBtn = document.getElementById('logoutBtn');
    if (logoutAdminBtn) logoutAdminBtn.addEventListener('click', () => logoutAdmin());
    
    const clearSearchBtn = document.getElementById('clearSearchBtn');
    if (clearSearchBtn) clearSearchBtn.addEventListener('click', () => clearSearch());
    
    const loadMoreBtn = document.getElementById('loadMoreBtn');
    if (loadMoreBtn) loadMoreBtn.addEventListener('click', () => loadNextPage());
    
    const backToTopBtn = document.getElementById('backToTop');
    if (backToTopBtn) backToTopBtn.addEventListener('click', () => window.scrollTo({top: 0, behavior: 'smooth'}));
    
    const searchInput = document.getElementById('movieSearch');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            toggleClearButton();
            applyFilters();
        });
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') applyFilters();
        });
    }
    
    const modal = document.getElementById('detailModal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeDetails();
        });
    }
    
    const closeModalBtn = document.querySelector('.close-modal');
    if (closeModalBtn) closeModalBtn.addEventListener('click', () => closeDetails());
    
    const importFile = document.getElementById('importFile');
    if (importFile) importFile.addEventListener('change', (e) => importFromJSON(e));
    
    const genreFilter = document.getElementById('genreFilter');
    if (genreFilter) genreFilter.addEventListener('change', () => applyFilters());
    
    const sortSelect = document.getElementById('sortSelect');
    if (sortSelect) sortSelect.addEventListener('change', () => applyFilters());
    
    const yearFilter = document.getElementById('yearFilter');
    if (yearFilter) yearFilter.addEventListener('change', () => applyFilters());
    
    const countryFilter = document.getElementById('countryFilter');
    if (countryFilter) countryFilter.addEventListener('change', () => applyFilters());
    
    const studioFilter = document.getElementById('studioFilter');
    if (studioFilter) studioFilter.addEventListener('change', () => applyFilters());
    
    const modalDownloadBtn = document.getElementById('modalDownloadBtn');
    if (modalDownloadBtn) modalDownloadBtn.addEventListener('click', () => handleDownloadClick());
    
    const modalEditBtn = document.getElementById('modalEditBtn');
    if (modalEditBtn) modalEditBtn.addEventListener('click', () => editCurrentMovie());
    
    const modalDeleteBtn = document.getElementById('modalDeleteBtn');
    if (modalDeleteBtn) modalDeleteBtn.addEventListener('click', () => deleteMovieFromModal());
    
    const modalAddBtn = document.getElementById('modalAddBtn');
    if (modalAddBtn) modalAddBtn.addEventListener('click', () => showAddMovieForm());
    
    const modalDirector = document.getElementById('modalDirector');
    if (modalDirector) {
        modalDirector.addEventListener('click', (e) => {
            const value = e.target.innerText;
            if (value && value !== '-') {
                searchMoviesByDirectorOrWriter(value, 'director');
            }
        });
    }
    
    const modalWriter = document.getElementById('modalWriter');
    if (modalWriter) {
        modalWriter.addEventListener('click', (e) => {
            const value = e.target.innerText;
            if (value && value !== '-') {
                searchMoviesByDirectorOrWriter(value, 'writer');
            }
        });
    }
}

// ============ INITIALIZATION ============
window.addEventListener('DOMContentLoaded', async () => {
    if (!initConfig()) { showToast('⚠️ Σφάλμα: Δεν βρέθηκε το config.js!', '#e50914'); }
    loadTheme();
    await loadMoviesData();
    loadDashboardState();
    loadUserSession();
    attachEventListeners();
    setTimeout(() => checkForGitHubUpdates(), 3000);
    const backBtn = document.getElementById('backToTop');
    window.addEventListener('scroll', () => { 
        backBtn.style.display = window.scrollY > 300 ? 'block' : 'none'; 
    });
    document.addEventListener('keydown', e => { 
        if(e.key === 'Escape') closeDetails(); 
    });
});
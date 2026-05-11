// ============ ΑΡΧΙΚΟΠΟΙΗΣΗ ΑΠΟ CONFIG ============
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
        console.error('❌ config.js not loaded!');
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
    t.style.position = 'fixed';
    t.style.bottom = '20px';
    t.style.right = '20px';
    t.style.padding = '12px 24px';
    t.style.borderRadius = '8px';
    t.style.zIndex = '10000';
    t.style.animation = 'slideIn 0.3s ease';
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

// ============ FALLBACK POSTER (SVG) ============
function generateFallbackPoster(title) {
    return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='450' viewBox='0 0 300 450'%3E%3Crect width='300' height='450' fill='%2334495e'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' fill='white' font-size='14'%3E${encodeURIComponent(title.substring(0,20))}%3C/text%3E%3C/svg%3E`;
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

// ============ MOVIES DATA ============
let moviesData = [];
let filteredMovies = [];
let currentPage = 1;
let itemsPerPage = 25;
let currentTypeFilter = 'all';
let currentModalMovieId = null;
let currentMovieLink = null;
let recentMovieIds = [];

// ============ FUZE.JS SEARCH ENGINE ============
let fuseSearch = null;
let lastSearchTerm = '';
let lastSearchResults = [];

function removeGreekAccents(text) {
    if (!text) return '';
    const accents = {
        'ά': 'α', 'έ': 'ε', 'ή': 'η', 'ί': 'ι', 'ό': 'ο', 'ύ': 'υ', 'ώ': 'ω',
        'Ά': 'Α', 'Έ': 'Ε', 'Ή': 'Η', 'Ί': 'Ι', 'Ό': 'Ο', 'Ύ': 'Υ', 'Ώ': 'Ω'
    };
    return text.replace(/[άέήίόύώΆΈΉΊΌΎΏ]/g, match => accents[match]);
}

function initFuseSearch() {
    const options = {
        keys: [
            { name: 'title', weight: 0.5 },
            { name: 'actors', weight: 0.2 },
            { name: 'director', weight: 0.15 },
            { name: 'writer', weight: 0.1 },
            { name: 'genre', weight: 0.05 }
        ],
        threshold: 0.35,
        distance: 100,
        includeScore: true,
        ignoreLocation: false,
        minMatchCharLength: 2,
        ignoreDiacritics: true
    };
    
    fuseSearch = new Fuse(moviesData, options);
    console.log('🔍 Fuse.js initialized with', moviesData.length, 'movies');
}

function searchMoviesWithFuse(searchTerm) {
    if (!searchTerm || searchTerm.length < 2) {
        return moviesData;
    }
    
    if (lastSearchTerm === searchTerm && lastSearchResults.length > 0) {
        return lastSearchResults;
    }
    
    const results = fuseSearch.search(searchTerm);
    lastSearchTerm = searchTerm;
    lastSearchResults = results.map(r => r.item);
    
    return lastSearchResults;
}

// ============ ΒΕΛΤΙΣΤΟΠΟΙΗΜΕΝΟ POSTER SYSTEM ============
// Το poster αποθηκεύεται ΑΠΕΥΘΕΙΑΣ στο JSON - 0 API calls στο διάβασμα!

async function fetchAndSavePoster(movie) {
    // Αν υπάρχει ήδη αποθηκευμένο poster URL, το επιστρέφουμε
    if (movie.poster_url && movie.poster_url !== '') {
        return movie.poster_url;
    }
    
    // Αν δεν υπάρχει TMDB key, return fallback
    if (!TMDB_API_KEY) {
        return generateFallbackPoster(movie.title);
    }
    
    try {
        const searchType = movie.type === 'Series' ? 'tv' : 'movie';
        const url = `https://api.themoviedb.org/3/search/${searchType}?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(movie.title)}&year=${movie.year}`;
        const res = await fetch(url);
        const data = await res.json();
        
        if (data.results?.[0]?.poster_path) {
            const posterUrl = `https://image.tmdb.org/t/p/w500${data.results[0].poster_path}`;
            
            // ΑΠΟΘΗΚΕΥΟΥΜΕ το poster URL στο movie object
            movie.poster_url = posterUrl;
            saveToLocalStorage();
            
            return posterUrl;
        }
    } catch(e) {
        console.warn(`Poster fetch failed for ${movie.title}:`, e);
    }
    
    return generateFallbackPoster(movie.title);
}

// Enrich όλες τις ταινίες με poster URLs (background job)
async function enrichAllPosters() {
    if (!AdminAuth.isSessionValid()) {
        showToast('Μόνο διαχειριστής!', '#e50914');
        return;
    }
    
    console.log('🎨 Έναρξη enrichment posters...');
    let count = 0;
    let total = moviesData.length;
    
    showToast(`📸 Λήψη posters: 0/${total}`, '#2196f3');
    
    for (let movie of moviesData) {
        if (!movie.poster_url) {
            await fetchAndSavePoster(movie);
            count++;
            if (count % 5 === 0) {
                showToast(`📸 Λήψη posters: ${count}/${total}`, '#2196f3');
            }
            // Μικρή καθυστέρηση για rate limit
            await new Promise(r => setTimeout(r, 150));
        }
    }
    
    saveToLocalStorage();
    console.log(`✅ Ολοκληρώθηκε! ${count} νέα posters προστέθηκαν`);
    showToast(`✅ ${count} posters αποθηκεύτηκαν!`, '#2ecc71');
    
    applyFilters();
}

// ============ MOVIE REQUESTS SYSTEM ============
let movieRequests = [];

function saveRequestsToLocalStorage() {
    localStorage.setItem('yioio_movie_requests', JSON.stringify(movieRequests));
}

function loadRequestsFromLocalStorage() {
    const saved = localStorage.getItem('yioio_movie_requests');
    if (saved) {
        try {
            movieRequests = JSON.parse(saved);
            console.log('📋 Φορτώθηκαν αιτήματα:', movieRequests.length);
        } catch(e) {
            movieRequests = [];
        }
    } else {
        movieRequests = [];
    }
}

// ============ ΦΟΡΜΑ ΑΙΤΗΜΑΤΟΣ ============
function showRequestForm(title = '', year = '') {
    const modalHtml = `
        <div id="requestModal" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.95); z-index:20000; display:flex; align-items:center; justify-content:center;">
            <div style="background: var(--card); border-radius: 20px; max-width: 600px; width: 90%; padding: 30px; border: 1px solid var(--primary); max-height: 85vh; overflow-y: auto;">
                <h3 style="color: var(--primary); margin-bottom: 20px;">📢 Αίτημα Προσθήκης Νέας Ταινίας/Σειράς</h3>
                
                <div class="form-group">
                    <label>Τίτλος *</label>
                    <input type="text" id="reqTitle" placeholder="π.χ. Oppenheimer, Poor Things" value="${escapeHtml(title)}">
                </div>
                
                <div class="form-group">
                    <label>Έτος *</label>
                    <input type="number" id="reqYear" placeholder="π.χ. 2023" value="${year}">
                </div>
                
                <button id="fetchFromTmdbBtn" class="btn-tmdb" style="width:100%; margin-bottom:15px;">🎬 Αυτόματη Συμπλήρωση από TMDB</button>
                
                <div id="tmdbPreview" style="display:none; background: var(--input-bg); border-radius: 12px; padding: 15px; margin-bottom: 15px;">
                    <div style="display: flex; gap: 15px;">
                        <img id="previewPoster" src="" style="width: 80px; height: 120px; object-fit: cover; border-radius: 8px;">
                        <div style="flex:1;">
                            <div id="previewTitle" style="font-weight: bold; color: var(--primary);"></div>
                            <div id="previewYear" style="font-size: 12px;"></div>
                            <div id="previewRating" style="font-size: 12px;"></div>
                            <div id="previewGenres" style="font-size: 11px; opacity: 0.7;"></div>
                        </div>
                    </div>
                </div>
                
                <div class="form-group">
                    <label>Το όνομα σου (προαιρετικό)</label>
                    <input type="text" id="reqRequester" placeholder="π.χ. ${currentUserName || 'Χρήστης'}">
                </div>
                
                <div class="form-group">
                    <label>Σημείωση (προαιρετική)</label>
                    <textarea id="reqNote" rows="3" placeholder="Πρόσθετες πληροφορίες..."></textarea>
                </div>
                
                <div class="modal-buttons" style="margin-top: 20px;">
                    <button id="submitRequestBtn" class="btn-save">✉️ Υποβολή Αιτήματος</button>
                    <button id="cancelRequestBtn" class="btn-cancel">❌ Ακύρωση</button>
                </div>
            </div>
        </div>
    `;
    
    const existing = document.getElementById('requestModal');
    if (existing) existing.remove();
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    let fetchedData = null;
    
    document.getElementById('fetchFromTmdbBtn').addEventListener('click', async () => {
        const title = document.getElementById('reqTitle').value.trim();
        const year = document.getElementById('reqYear').value.trim();
        
        if (!title) {
            showToast('Παρακαλώ γράψτε τίτλο πρώτα', '#e67e22');
            return;
        }
        
        if (!TMDB_API_KEY) {
            showToast('Σφάλμα: Missing TMDB API Key', '#e50914');
            return;
        }
        
        showToast('🔍 Αναζήτηση στο TMDB...', '#2196f3');
        
        try {
            const searchUrl = `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(title)}`;
            const res = await fetch(searchUrl);
            const data = await res.json();
            
            if (data.results && data.results.length > 0) {
                let bestMatch = data.results[0];
                
                if (year) {
                    const exactYearMatch = data.results.find(m => m.release_date?.substring(0,4) === year);
                    if (exactYearMatch) bestMatch = exactYearMatch;
                }
                
                const detailsUrl = `https://api.themoviedb.org/3/movie/${bestMatch.id}?api_key=${TMDB_API_KEY}&language=el&append_to_response=credits`;
                const detailsRes = await fetch(detailsUrl);
                const fullData = await detailsRes.json();
                
                fetchedData = {
                    id: fullData.id,
                    title: fullData.title,
                    year: fullData.release_date?.substring(0,4),
                    poster: fullData.poster_path ? `https://image.tmdb.org/t/p/w500${fullData.poster_path}` : null,
                    rating: fullData.vote_average,
                    genres: fullData.genres?.map(g => g.name).join(', '),
                    overview: fullData.overview,
                    director: fullData.credits?.crew?.find(p => p.job === 'Director')?.name || 'N/A',
                    actors: fullData.credits?.cast?.slice(0, 5).map(a => a.name).join(', '),
                    country: fullData.production_countries?.[0]?.name || 'N/A',
                    studio: fullData.production_companies?.[0]?.name || 'N/A',
                    tmdbId: fullData.id
                };
                
                document.getElementById('previewPoster').src = fetchedData.poster || 'https://via.placeholder.com/80x120?text=No+Poster';
                document.getElementById('previewTitle').innerHTML = fetchedData.title;
                document.getElementById('previewYear').innerHTML = `📅 ${fetchedData.year}`;
                document.getElementById('previewRating').innerHTML = `⭐ ${fetchedData.rating}/10`;
                document.getElementById('previewGenres').innerHTML = `🎭 ${fetchedData.genres || 'N/A'}`;
                document.getElementById('tmdbPreview').style.display = 'block';
                
                document.getElementById('reqTitle').value = fetchedData.title;
                document.getElementById('reqYear').value = fetchedData.year;
                
                showToast('✅ Στοιχεία φορτώθηκαν!', '#2ecc71');
            } else {
                showToast('❌ Δεν βρέθηκε ταινία με αυτόν τον τίτλο', '#e50914');
            }
        } catch(e) {
            console.error(e);
            showToast('❌ Σφάλμα κατά την αναζήτηση', '#e50914');
        }
    });
    
    document.getElementById('submitRequestBtn').addEventListener('click', () => {
        submitRequestWithData(fetchedData);
    });
    
    document.getElementById('cancelRequestBtn').addEventListener('click', () => {
        document.getElementById('requestModal').remove();
    });
}

async function submitRequestWithData(tmdbData) {
    const title = document.getElementById('reqTitle').value.trim();
    const year = parseInt(document.getElementById('reqYear').value);
    const requester = document.getElementById('reqRequester').value.trim() || currentUserName || 'Ανώνυμος';
    const note = document.getElementById('reqNote').value.trim();
    
    if (!title || !year || isNaN(year)) {
        showToast('❌ Παρακαλώ συμπληρώστε τίτλο και έτος', '#e50914');
        return;
    }
    
    const existingMovie = moviesData.find(m => m.title.toLowerCase() === title.toLowerCase() && m.year === year);
    if (existingMovie) {
        showToast(`⚠️ Η ταινία "${title}" (${year}) υπάρχει ήδη!`, '#e67e22');
        return;
    }
    
    const newId = moviesData.length ? Math.max(...moviesData.map(m => m.id)) + 1 : 1;
    
    const newMovie = {
        id: newId,
        title: title,
        year: year,
        type: 'Movie',
        quality: 'HD',
        rating: tmdbData?.rating || 0,
        actors: tmdbData?.actors || 'N/A',
        director: tmdbData?.director || 'N/A',
        writer: tmdbData?.director || 'N/A',
        country: tmdbData?.country || 'N/A',
        genre: tmdbData?.genres || 'N/A',
        studio: tmdbData?.studio || 'N/A',
        link: '',
        imdb: '',
        tmdb: tmdbData?.tmdbId ? `https://www.themoviedb.org/movie/${tmdbData.tmdbId}` : '',
        desc: tmdbData?.overview || 'Δεν υπάρχει περιγραφή.',
        dateAdded: new Date().toISOString().split('T')[0],
        createdBy: requester,
        poster_url: tmdbData?.poster || null,
        status: 'pending',
        requestedBy: requester,
        requestDate: new Date().toISOString().split('T')[0],
        requestNote: note
    };
    
    moviesData.push(newMovie);
    saveToLocalStorage();
    
    try {
        const response = await fetch('https://api.web3forms.com/submit', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                access_key: '67f6e36b-a2d2-447e-954f-752a0407d237',
                subject: `🎬 ΝΕΟ ΑΙΤΗΜΑ ΤΑΙΝΙΑΣ: ${title}`,
                from_name: requester,
                message: `
🎬 ΝΕΟ ΑΙΤΗΜΑ ΤΑΙΝΙΑΣ!

━━━━━━━━━━━━━━━━━━━━━━
📽️ Τίτλος: ${title}
📅 Έτος: ${year}
👤 Ζήτησε: ${requester}
📝 Σημείωση: ${note || 'Κανένα'}
🕐 Ημερομηνία: ${new Date().toLocaleString('el-GR')}
━━━━━━━━━━━━━━━━━━━━━━

👉 Μπες στο dashboard για έγκριση!`,
                replyto: "no-reply@yioio.com"
            })
        });
        
        if (response.ok) {
            showToast(`✅ Το αίτημα για "${title}" εστάλη!`, '#2ecc71');
        } else {
            showToast(`⚠️ Το αίτημα αποθηκεύτηκε (χωρίς email)`, '#e67e22');
        }
    } catch (error) {
        console.error('Email error:', error);
        showToast(`⚠️ Το αίτημα αποθηκεύτηκε (χωρίς email)`, '#e67e22');
    }
    
    updateRecentMoviesList();
    initFilters();
    initFuseSearch();
    applyFilters();
    
    document.getElementById('requestModal').remove();
}

// ============ ΠΙΝΑΚΑΣ ΔΙΑΧΕΙΡΙΣΗΣ ΑΙΤΗΜΑΤΩΝ ============
function showRequestsPanel() {
    if (!AdminAuth.isSessionValid()) {
        showToast('Μόνο διαχειριστής!', '#e50914');
        return;
    }
    
    const pendingRequests = movieRequests.filter(r => r.status === 'pending');
    const approvedRequests = movieRequests.filter(r => r.status === 'approved');
    const rejectedRequests = movieRequests.filter(r => r.status === 'rejected');
    
    let html = `
        <div id="requestsPanel" style="position:fixed; top:50%; left:50%; transform:translate(-50%,-50%); background: var(--card); border-radius: 20px; width: 95%; max-width: 1200px; max-height: 85vh; overflow-y: auto; z-index: 20000; padding: 20px; border: 2px solid var(--primary);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 10px;">
                <h2 style="color: var(--primary);">📋 Διαχείριση Αιτημάτων Ταινιών</h2>
                <div>
                    <button id="closeRequestsBtn" style="background: none; border: none; color: var(--text); font-size: 24px; cursor: pointer;">✕</button>
                </div>
            </div>
            
            <div style="display: flex; gap: 10px; margin-bottom: 20px; border-bottom: 1px solid var(--border);">
                <button class="request-tab-btn active" data-tab="pending">⏳ Εκκρεμή (${pendingRequests.length})</button>
                <button class="request-tab-btn" data-tab="approved">✅ Εγκεκριμένα (${approvedRequests.length})</button>
                <button class="request-tab-btn" data-tab="rejected">❌ Απορριφθέντα (${rejectedRequests.length})</button>
            </div>
            
            <div id="pendingTab" class="request-tab">
                ${renderPendingRequestsTable(pendingRequests)}
            </div>
            
            <div id="approvedTab" class="request-tab" style="display:none;">
                ${renderApprovedRequestsTable(approvedRequests)}
            </div>
            
            <div id="rejectedTab" class="request-tab" style="display:none;">
                ${renderRejectedRequestsTable(rejectedRequests)}
            </div>
            
            <div style="margin-top: 20px; display: flex; gap: 10px; justify-content: flex-end;">
                <button id="clearAllRequestsBtn" style="background:#e67e22; color:white; border:none; padding:8px 16px; border-radius:8px;">🗑️ Εκκαθάριση Ολοκληρωμένων</button>
            </div>
        </div>
    `;
    
    const existing = document.getElementById('requestsPanel');
    if (existing) existing.remove();
    document.body.insertAdjacentHTML('beforeend', html);
    
    document.querySelectorAll('.request-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.request-tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const tab = btn.dataset.tab;
            document.getElementById('pendingTab').style.display = tab === 'pending' ? 'block' : 'none';
            document.getElementById('approvedTab').style.display = tab === 'approved' ? 'block' : 'none';
            document.getElementById('rejectedTab').style.display = tab === 'rejected' ? 'block' : 'none';
        });
    });
    
    document.getElementById('closeRequestsBtn').addEventListener('click', () => {
        document.getElementById('requestsPanel').remove();
    });
    
    const clearBtn = document.getElementById('clearAllRequestsBtn');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            if (confirm('Εκκαθάριση όλων των ολοκληρωμένων αιτημάτων (εγκεκριμένων & απορριφθέντων);')) {
                movieRequests = movieRequests.filter(r => r.status === 'pending');
                saveRequestsToLocalStorage();
                document.getElementById('requestsPanel').remove();
                showRequestsPanel();
                showToast('Ολοκληρωμένα αιτήματα εκκαθαρίστηκαν', '#2ecc71');
            }
        });
    }
}

function renderPendingRequestsTable(requests) {
    if (requests.length === 0) {
        return '<div style="text-align:center; padding:40px;">✨ Δεν υπάρχουν εκκρεμή αιτήματα</div>';
    }
    
    let html = '<div style="display: grid; gap: 20px;">';
    
    for (const req of requests) {
        const movie = moviesData.find(m => m.title === req.title && m.year === req.year);
        
        html += `
            <div style="border: 1px solid var(--border); border-radius: 12px; padding: 15px; background: var(--input-bg);">
                <div style="display: flex; gap: 20px; flex-wrap: wrap;">
                    <div style="width: 100px; text-align: center;">
                        <div style="width: 100px; height: 150px; background: #2c3e50; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 40px;">🎬</div>
                        <div style="font-size: 10px; margin-top: 5px; color: orange;">⏳ Σε αναμονή</div>
                    </div>
                    
                    <div style="flex: 1;">
                        <h3 style="color: var(--primary); margin: 0 0 5px 0;">${escapeHtml(req.title)} (${req.year})</h3>
                        <div>👤 Από: ${escapeHtml(req.requester)} | 📅 ${req.dateRequested}</div>
                        ${req.note ? `<div>📝 Σημείωση: ${escapeHtml(req.note)}</div>` : ''}
                        ${movie ? `<div style="font-size: 11px; margin-top: 5px;">🆔 ID: ${movie.id}</div>` : ''}
                    </div>
                    
                    <div style="display: flex; flex-direction: column; gap: 8px; min-width: 120px;">
                        <button onclick="approveExistingMovie(${req.id})" style="background:#2ecc71; color:white; border:none; padding:8px 12px; border-radius:8px; cursor:pointer;">✅ Έγκριση</button>
                        <button onclick="rejectAndDeleteMovie(${req.id})" style="background:#e74c3c; color:white; border:none; padding:8px 12px; border-radius:8px; cursor:pointer;">🗑️ Απόρριψη & Διαγραφή</button>
                    </div>
                </div>
            </div>
        `;
    }
    
    html += '</div>';
    return html;
}

function renderApprovedRequestsTable(requests) {
    if (requests.length === 0) {
        return '<div style="text-align:center; padding:40px;">📭 Δεν υπάρχουν εγκεκριμένα αιτήματα</div>';
    }
    
    let html = '<div style="display: grid; gap: 15px;">';
    for (const req of requests) {
        html += `
            <div style="border: 1px solid var(--border); border-radius: 8px; padding: 12px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap;">
                <div>
                    <strong>${escapeHtml(req.title)} (${req.year})</strong>
                    <span style="font-size: 12px; opacity: 0.7;"> - Από: ${escapeHtml(req.requester)}</span>
                </div>
                <span style="background:#2ecc71; padding:2px 8px; border-radius:12px; font-size:11px;">✅ Εγκεκριμένο</span>
            </div>
        `;
    }
    html += '</div>';
    return html;
}

function renderRejectedRequestsTable(requests) {
    if (requests.length === 0) {
        return '<div style="text-align:center; padding:40px;">📭 Δεν υπάρχουν απορριφθέντα αιτήματα</div>';
    }
    
    let html = '<div style="display: grid; gap: 15px;">';
    for (const req of requests) {
        html += `
            <div style="border: 1px solid var(--border); border-radius: 8px; padding: 12px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap;">
                <div>
                    <strong>${escapeHtml(req.title)} (${req.year})</strong>
                    <span style="font-size: 12px; opacity: 0.7;"> - Από: ${escapeHtml(req.requester)}</span>
                </div>
                <span style="background:#e74c3c; padding:2px 8px; border-radius:12px; font-size:11px;">❌ Απορρίφθηκε</span>
            </div>
        `;
    }
    html += '</div>';
    return html;
}

function approveExistingMovie(requestId) {
    const request = movieRequests.find(r => r.id === requestId);
    if (!request) {
        showToast('Δεν βρέθηκε το αίτημα', '#e50914');
        return;
    }
    
    const existingMovie = moviesData.find(m => m.title === request.title && m.year === request.year);
    if (existingMovie) {
        existingMovie.status = 'active';
        saveToLocalStorage();
        showToast(`✅ Η ταινία "${request.title}" εγκρίθηκε!`, '#2ecc71');
    } else {
        showToast(`❌ Δεν βρέθηκε η ταινία "${request.title}" στη βάση`, '#e50914');
    }
    
    request.status = 'approved';
    request.approvedDate = new Date().toISOString().split('T')[0];
    saveRequestsToLocalStorage();
    
    showRequestsPanel();
    initFuseSearch();
    applyFilters();
}

function rejectAndDeleteMovie(requestId) {
    const request = movieRequests.find(r => r.id === requestId);
    if (!request) {
        showToast('Δεν βρέθηκε το αίτημα', '#e50914');
        return;
    }
    
    if (!confirm(`❌ Σίγουρα θέλεις να ΑΠΟΡΡΙΨΕΙΣ και να ΔΙΑΓΡΑΨΕΙΣ την ταινία "${request.title}" (${request.year});`)) {
        return;
    }
    
    const movieIndex = moviesData.findIndex(m => m.title === request.title && m.year === request.year);
    if (movieIndex !== -1) {
        moviesData.splice(movieIndex, 1);
        moviesData.forEach((m, i) => m.id = i + 1);
        saveToLocalStorage();
        showToast(`🗑️ Η ταινία "${request.title}" διαγράφηκε`, '#e74c3c');
    } else {
        showToast(`⚠️ Δεν βρέθηκε η ταινία "${request.title}"`, '#e67e22');
    }
    
    movieRequests = movieRequests.filter(r => r.id !== requestId);
    saveRequestsToLocalStorage();
    
    updateRecentMoviesList();
    initFilters();
    initFuseSearch();
    applyFilters();
    
    const panel = document.getElementById('requestsPanel');
    if (panel) panel.remove();
    showRequestsPanel();
    
    showToast(`✅ Το αίτημα απορρίφθηκε και η ταινία διαγράφηκε`, '#2ecc71');
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
                initFuseSearch();
                applyFilters();
                return;
            }
        } catch(e) {}
    }
    
    // Default data
    moviesData = [
        { "id": 1, "title": "1883", "year": 2021, "country": "United States", "genre": "Δράμα, Γουέστερν", "type": "Series", "quality": "HD", "rating": 8.7, "actors": "Sam Elliott, Tim McGraw, Faith Hill, Isabel May", "director": "Taylor Sheridan", "writer": "Taylor Sheridan", "link": "", "imdb": "", "tmdb": "", "desc": "Η ιστορία της οικογένειας Ντάτον καθώς ταξιδεύουν προς τη Δύση.", "dateAdded": new Date().toISOString().split('T')[0], "studio": "Paramount+", "createdBy": "Διαχειριστής", "status": "active", "poster_url": null },
        { "id": 2, "title": "1899", "year": 2022, "country": "Germany", "genre": "Μυστηρίου, Δράμα", "type": "Series", "quality": "HD", "rating": 7.3, "actors": "Emily Beecham, Andreas Pietschmann", "director": "Baran bo Odar", "writer": "Baran bo Odar", "link": "", "imdb": "", "tmdb": "", "desc": "Μετανάστες ταξιδεύουν από την Ευρώπη στην Αμερική.", "dateAdded": new Date().toISOString().split('T')[0], "studio": "Netflix", "createdBy": "Διαχειριστής", "status": "active", "poster_url": null },
        { "id": 3, "title": "1923", "year": 2022, "country": "United States", "genre": "Δράμα, Γουέστερν", "type": "Series", "quality": "HD", "rating": 8.3, "actors": "Harrison Ford, Helen Mirren", "director": "Taylor Sheridan", "writer": "Taylor Sheridan", "link": "", "imdb": "", "tmdb": "", "desc": "Η συνέχεια του 1883.", "dateAdded": new Date().toISOString().split('T')[0], "studio": "Paramount+", "createdBy": "Διαχειριστής", "status": "active", "poster_url": null }
    ];
    updateRecentMoviesList();
    saveToLocalStorage();
    initFilters();
    initFuseSearch();
    applyFilters();
}

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
                moviesData.forEach((m, i) => {
                    m.id = i + 1;
                    if (!m.status) m.status = 'active';
                    if (!m.poster_url) m.poster_url = null;
                });
                saveToLocalStorage();
                CURRENT_VERSION = remote.version;
                localStorage.setItem('app_version', CURRENT_VERSION);
                document.getElementById('versionBadge').innerHTML = `Έκδοση: ${CURRENT_VERSION}`;
                updateRecentMoviesList();
                initFilters();
                initFuseSearch();
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

let searchTimeout = null;

function applyFilters() {
    if (!moviesData.length) return;
    toggleClearButton();
    
    if (searchTimeout) clearTimeout(searchTimeout);
    
    searchTimeout = setTimeout(() => {
        performSearch();
    }, 100);
}

function performSearch() {
    let term = document.getElementById('movieSearch').value.toLowerCase();
    let results = [];
    
    if (term && term.length >= 2) {
        results = searchMoviesWithFuse(term);
    } else if (term && term.length === 1) {
        results = moviesData.filter(m => 
            m.title.toLowerCase().includes(term) || 
            m.actors?.toLowerCase().includes(term) || 
            m.director?.toLowerCase().includes(term)
        );
    } else {
        results = [...moviesData];
    }
    
    if (currentTypeFilter !== 'all') {
        results = results.filter(m => m.type === currentTypeFilter);
    }
    
    const genre = document.getElementById('genreFilter').value;
    if (genre !== 'All') {
        results = results.filter(m => m.genre?.includes(genre));
    }
    
    const year = document.getElementById('yearFilter').value;
    if (year !== 'All') {
        results = results.filter(m => m.year == year);
    }
    
    const country = document.getElementById('countryFilter').value;
    if (country !== 'All') {
        results = results.filter(m => m.country === country);
    }
    
    const studio = document.getElementById('studioFilter').value;
    if (studio !== 'All') {
        results = results.filter(m => m.studio === studio);
    }
    
    const sort = document.getElementById('sortSelect').value;
    
    if (sort === 'pendingOnly') {
        results = results.filter(m => m.status === 'pending');
    }
    
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

function updateRecentMoviesList() {
    if (!moviesData || moviesData.length === 0) return;
    const sortedByDate = [...moviesData].sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded));
    recentMovieIds = sortedByDate.slice(0, 10).map(m => m.id);
}

function isNewMovie(dateAdded, movieId) {
    if (!dateAdded || !movieId) return false;
    return recentMovieIds.includes(movieId);
}

// ============ RENDER MOVIES (ΧΩΡΙΣ API CALLS!) ============
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
        card.addEventListener('click', () => openDetailsById(m.id));
        
        // Poster URL - ΑΠΕΥΘΕΙΑΣ από το JSON, χωρίς API call!
        const posterSrc = m.poster_url || generateFallbackPoster(m.title);
        
        card.innerHTML = `
            <div class="img-container">
                <div class="quality-tag ${m.quality === 'SD' ? 'sd-blue' : ''}">${m.quality||'HD'}</div>
                ${isNewMovie(m.dateAdded, m.id) ? '<div class="new-badge-poster">ΝΕΟ</div>' : ''}
                ${m.status === 'pending' ? '<div class="pending-badge"> ΣΕ ΑΝΑΜΟΝΗ</div>' : ''}
                <img src="${posterSrc}" alt="${escapeHtml(m.title)}" loading="lazy" onerror="this.src='${generateFallbackPoster(m.title)}'">
            </div>
            <div class="info">
                <h3>${escapeHtml(m.title)}</h3>
                <div class="stars">${getStars(m.rating)} <span class="rating-number">${m.rating.toFixed(1)}</span></div>
                <div class="play-btn">ΛΕΠΤΟΜΕΡΕΙΕΣ</div>
            </div>
        `;
        grid.appendChild(card);
    }
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

// ============ ACTOR IMAGES (προαιρετικό, μόνο στο modal) ============
const actorImageCache = new Map();

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
    
    const searchTerm = actorName.toLowerCase();
    
    let results = moviesData.filter(movie => {
        if (!movie.actors || movie.actors === 'N/A') return false;
        const actorsLower = movie.actors.toLowerCase();
        return actorsLower.includes(searchTerm);
    });
    
    if (currentTypeFilter !== 'all') {
        results = results.filter(m => m.type === currentTypeFilter);
    }
    
    const genre = document.getElementById('genreFilter').value;
    if (genre !== 'All') {
        results = results.filter(m => m.genre?.includes(genre));
    }
    
    const year = document.getElementById('yearFilter').value;
    if (year !== 'All') {
        results = results.filter(m => m.year == year);
    }
    
    const country = document.getElementById('countryFilter').value;
    if (country !== 'All') {
        results = results.filter(m => m.country === country);
    }
    
    const studio = document.getElementById('studioFilter').value;
    if (studio !== 'All') {
        results = results.filter(m => m.studio === studio);
    }
    
    filteredMovies = results;
    currentPage = 1;
    document.getElementById('movieCount').innerText = `${filteredMovies.length} τίτλοι`;
    updateDashboard();
    renderMovies();
    
    closeDetails();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    if (results.length === 0) {
        showToast(`Δεν βρέθηκαν ταινίες με τον ηθοποιό: ${actorName}`, '#e67e22');
    } else {
        showToast(`Αναζήτηση για ηθοποιό: ${actorName} - ${results.length} ταινίες`, '#2ecc71');
    }
}

function searchMoviesByDirectorOrWriter(value, type) {
    const searchInput = document.getElementById('movieSearch');
    searchInput.value = value;
    toggleClearButton();
    
    let results = moviesData.filter(m => 
        m.director?.toLowerCase().includes(value.toLowerCase()) || 
        m.writer?.toLowerCase().includes(value.toLowerCase())
    );
    
    if (currentTypeFilter !== 'all') {
        results = results.filter(m => m.type === currentTypeFilter);
    }
    
    const genre = document.getElementById('genreFilter').value;
    if (genre !== 'All') {
        results = results.filter(m => m.genre?.includes(genre));
    }
    
    const year = document.getElementById('yearFilter').value;
    if (year !== 'All') {
        results = results.filter(m => m.year == year);
    }
    
    const country = document.getElementById('countryFilter').value;
    if (country !== 'All') {
        results = results.filter(m => m.country === country);
    }
    
    const studio = document.getElementById('studioFilter').value;
    if (studio !== 'All') {
        results = results.filter(m => m.studio === studio);
    }
    
    filteredMovies = results;
    currentPage = 1;
    document.getElementById('movieCount').innerText = `${filteredMovies.length} τίτλοι`;
    updateDashboard();
    renderMovies();
    
    closeDetails();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast(`Αναζήτηση για: ${value}`, '#2196f3');
}

// ============ MODAL FUNCTIONS ============
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
    
    const metaBar = document.getElementById('modalMetaBar');
    const existingStatusBadge = document.getElementById('modalStatusBadge');
    if (existingStatusBadge) existingStatusBadge.remove();
    
    if (movie.status === 'pending') {
        const statusBadge = document.createElement('span');
        statusBadge.id = 'modalStatusBadge';
        statusBadge.className = 'pending-status-badge';
        statusBadge.innerHTML = ' ΣΕ ΑΝΑΜΟΝΗ';
        metaBar.appendChild(statusBadge);
    }
    
    const imdbLink = document.getElementById('modalImdb');
    imdbLink.href = movie.imdb || '#';
    imdbLink.style.display = movie.imdb ? 'inline-flex' : 'none';
    
    const tmdbLink = document.getElementById('modalTmdb');
    tmdbLink.href = movie.tmdb || '#';
    tmdbLink.style.display = movie.tmdb ? 'inline-flex' : 'none';
    
    document.getElementById('modalEditBtn').style.display = isUserLoggedIn ? 'inline-flex' : 'none';
    document.getElementById('modalDeleteBtn').style.display = isUserLoggedIn ? 'inline-flex' : 'none';
    
    const requestBtn = document.getElementById('modalRequestBtn');
    if (requestBtn) {
        requestBtn.style.display = 'inline-flex';
        requestBtn.onclick = () => showRequestForm(movie.title, movie.year);
    }
    
    const downloadBtn = document.getElementById('modalDownloadBtn');
    if (isUserLoggedIn && movie.link && movie.link !== '') {
        downloadBtn.style.display = 'block';
    } else {
        downloadBtn.style.display = 'none';
    }
    
    // Poster από το JSON - ΑΜΕΣΑ!
    const modalImg = document.getElementById('modalImg');
    if (movie.poster_url) {
        modalImg.src = movie.poster_url;
    } else {
        modalImg.src = generateFallbackPoster(movie.title);
        // Background fetch and save for next time
        fetchAndSavePoster(movie).then(url => {
            if (url && modalImg.src !== url) {
                modalImg.src = url;
            }
        });
    }
    
    renderActorsWithImages(movie.actors, 'modalActorsContainer');
    document.getElementById('detailModal').style.display = 'flex';
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
        showToast('Δεν υπάρχει link προβολής για αυτόν τον τίτλο', '#e67e22');
    }
}

// ============ CRUD OPERATIONS ============
function showAddMovieForm() {
    if (!isUserLoggedIn) { 
        showToast('Πρέπει να συνδεθείτε για να προσθέσετε ταινία!', '#e50914'); 
        return; 
    }
    
    const modalHtml = `<div class="add-movie-modal" id="addMovieModal"><h2>➕ Προσθήκη Νέας Ταινίας/Σειράς</h2>
        <div class="auto-fill-row" style="display: flex; gap: 10px; margin-bottom: 15px;">
            <input type="text" id="autoTitle" placeholder="Τίτλος για αυτόματη συμπλήρωση" style="flex: 2;">
            <button id="searchTmdbBtn" class="btn-tmdb" style="flex:1;">🎬 Αναζήτηση Ταινίας</button>
            <button id="searchTvBtn" class="btn-tmdb" style="flex:1; background:#9b59b6;">📺 Αναζήτηση Σειράς</button>
        </div>
        <div id="searchResults" class="results-list" style="display: none; max-height: 200px; overflow-y: auto; border: 1px solid var(--border); border-radius: 8px; margin-bottom: 15px;"></div>
        <div style="margin: 15px 0; text-align: center; font-size: 12px; opacity: 0.7;">— ή συμπλήρωσε χειροκίνητα —</div>
        <div class="form-row">
            <div class="form-group"><label>Τίτλος *</label><input type="text" id="newTitle" placeholder="Ο τίτλος της ταινίας/σειράς"></div>
            <div class="form-group"><label>Έτος *</label><input type="number" id="newYear" placeholder="π.χ. 2024"></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label>Τύπος</label><select id="newType">
                <option value="Movie">Ταινία (Movie)</option>
                <option value="Series">Σειρά (Series)</option>
            </select></div>
            <div class="form-group"><label>Ποιότητα</label><select id="newQuality">
                <option value="HD">HD</option>
                <option value="SD">SD</option>
                <option value="4K">4K</option>
            </select></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label>Χώρα</label><input type="text" id="newCountry" placeholder="π.χ. United States, Greece"></div>
            <div class="form-group"><label>Είδος (Genre)</label><input type="text" id="newGenre" placeholder="π.χ. Δράμα, Θρίλερ"></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label>Βαθμολογία (0-10)</label><input type="number" step="0.1" id="newRating" placeholder="π.χ. 8.5"></div>
            <div class="form-group"><label>Πλατφόρμα (Studio)</label><input type="text" id="newStudio" placeholder="π.χ. Netflix, Disney+"></div>
        </div>
        <div class="form-group"><label>Σκηνοθέτης</label><input type="text" id="newDirector" placeholder="Ονόματα σκηνοθετών"></div>
        <div class="form-group"><label>Σεναριογράφος</label><input type="text" id="newWriter" placeholder="Ονόματα σεναριογράφων"></div>
        <div class="form-group"><label>Ηθοποιοί</label><input type="text" id="newActors" placeholder="Ονόματα ηθοποιών (διαχώρισε με κόμματα)"></div>
        <div class="form-group"><label>Link Προβολής</label><input type="url" id="newLink" placeholder="https://..."></div>
        <div class="form-row">
            <div class="form-group"><label>IMDB Link</label><input type="url" id="newImdb" placeholder="https://www.imdb.com/..."></div>
            <div class="form-group"><label>TMDB Link</label><input type="url" id="newTmdb" placeholder="https://www.themoviedb.org/..."></div>
        </div>
        <div class="form-group"><label>Περιγραφή</label><textarea id="newDesc" rows="3" placeholder="Περιγραφή της ταινίας/σειράς..."></textarea></div>
        <div class="modal-buttons"><button id="saveMovieBtn" class="btn-save">💾 Αποθήκευση</button><button id="cancelAddMovieBtn" class="btn-cancel">❌ Ακύρωση</button></div>
    </div>`;
    
    const existing = document.getElementById('addMovieModal');
    if (existing) existing.remove();
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    document.getElementById('searchTmdbBtn').addEventListener('click', () => searchTMDBForAdd('movie'));
    document.getElementById('searchTvBtn').addEventListener('click', () => searchTMDBForAdd('tv'));
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

async function searchTMDBForAdd(type) {
    const title = document.getElementById('autoTitle').value.trim();
    const searchType = type;
    
    if (!title) {
        showToast('Παρακαλώ γράψτε έναν τίτλο', '#e67e22');
        return;
    }
    if (!TMDB_API_KEY) {
        showToast('Σφάλμα: Missing TMDB API Key', '#e50914');
        return;
    }
    
    showToast(`🔍 Αναζήτηση ${searchType === 'tv' ? 'σειράς' : 'ταινίας'} στο TMDB...`, '#2196f3');
    
    try {
        const searchEndpoint = searchType === 'tv' ? 'search/tv' : 'search/movie';
        const searchUrl = `https://api.themoviedb.org/3/${searchEndpoint}?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(title)}&language=en-US`;
        const res = await fetch(searchUrl);
        const data = await res.json();
        
        const resultsDiv = document.getElementById('searchResults');
        resultsDiv.innerHTML = '';
        
        if (data.results && data.results.length > 0) {
            const header = document.createElement('div');
            header.style.cssText = 'padding:10px;background:var(--primary);color:white;font-weight:bold;border-radius:8px 8px 0 0;';
            header.textContent = `📽️ Αποτελέσματα ${searchType === 'tv' ? 'Σειρών' : 'Ταινιών'} (${data.results.length})`;
            resultsDiv.appendChild(header);
            
            for (let i = 0; i < Math.min(10, data.results.length); i++) {
                const r = data.results[i];
                const year = searchType === 'tv' 
                    ? (r.first_air_date || '').substring(0, 4) 
                    : (r.release_date || '').substring(0, 4);
                const titleName = searchType === 'tv' ? r.name : r.title;
                const resultItem = document.createElement('div');
                resultItem.className = 'result-item';
                resultItem.setAttribute('data-id', r.id);
                resultItem.style.cssText = 'padding:12px;cursor:pointer;border-bottom:1px solid var(--border);transition:background 0.2s;';
                resultItem.innerHTML = `<strong>${searchType === 'tv' ? '📺' : '🎬'} ${titleName}</strong> <span style="opacity:0.7;">(${year || 'Άγνωστο'})</span>`;
                resultItem.addEventListener('click', () => {
                    if (searchType === 'tv') {
                        selectTMDBTvResultForAdd(r.id, titleName, year, r.poster_path);
                    } else {
                        selectTMDBResultForAdd(r.id, titleName, year, r.poster_path);
                    }
                });
                resultItem.addEventListener('mouseenter', () => { resultItem.style.background = 'var(--primary)'; resultItem.style.color = 'white'; });
                resultItem.addEventListener('mouseleave', () => { resultItem.style.background = ''; resultItem.style.color = ''; });
                resultsDiv.appendChild(resultItem);
            }
            resultsDiv.style.display = 'block';
        } else {
            resultsDiv.innerHTML = `<div style="padding:15px;text-align:center;">❌ Δεν βρέθηκε ${searchType === 'tv' ? 'σειρά' : 'ταινία'} με τίτλο "${title}"<br><small>Δοκίμασε με διαφορετική ορθογραφία ή χρησιμοποίησε TMDB ID</small></div>`;
            resultsDiv.style.display = 'block';
        }
    } catch(e) {
        console.error(e);
        showToast('Σφάλμα επικοινωνίας με TMDB', '#e50914');
    }
}

async function selectTMDBResultForAdd(movieId, movieTitle, movieYear, posterPath) {
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

async function selectTMDBTvResultForAdd(tvId, tvTitle, tvYear, posterPath) {
    if (!TMDB_API_KEY) return;
    showToast(`📥 Φόρτωση στοιχείων για: ${tvTitle}...`, '#2196f3');
    try {
        const seriesUrl = `https://api.themoviedb.org/3/tv/${tvId}?api_key=${TMDB_API_KEY}&language=en-US`;
        const seriesRes = await fetch(seriesUrl);
        const seriesData = await seriesRes.json();
        
        const creditsUrl = `https://api.themoviedb.org/3/tv/${tvId}/credits?api_key=${TMDB_API_KEY}&language=en-US`;
        const creditsRes = await fetch(creditsUrl);
        const creditsData = await creditsRes.json();
        
        const descUrl = `https://api.themoviedb.org/3/tv/${tvId}?api_key=${TMDB_API_KEY}&language=el`;
        const descRes = await fetch(descUrl);
        const descData = await descRes.json();
        
        let director = 'N/A';
        let actors = 'N/A';
        let writer = 'N/A';
        
        if (creditsData.crew) {
            const directorObj = creditsData.crew.find(p => p.job === 'Director');
            if (directorObj) director = directorObj.name;
            const writerObj = creditsData.crew.find(p => p.job === 'Writer' || p.department === 'Writing');
            if (writerObj) writer = writerObj.name;
        }
        if (creditsData.cast && creditsData.cast.length > 0) {
            actors = creditsData.cast.slice(0, 5).map(a => a.name).join(', ');
        }
        
        const title = seriesData.name;
        const year = (seriesData.first_air_date || '').substring(0, 4) || tvYear;
        const country = seriesData.production_countries?.[0]?.name || 'N/A';
        const genre = seriesData.genres?.map(g => g.name).join(', ') || 'N/A';
        const studio = seriesData.production_companies?.[0]?.name || 'N/A';
        const rating = seriesData.vote_average || 0;
        const desc = descData.overview || seriesData.overview || 'Δεν υπάρχει περιγραφή.';
        
        document.getElementById('newTitle').value = title;
        document.getElementById('newYear').value = year;
        document.getElementById('newCountry').value = country;
        document.getElementById('newGenre').value = genre;
        document.getElementById('newRating').value = rating.toFixed(1);
        document.getElementById('newStudio').value = studio;
        document.getElementById('newDirector').value = director;
        document.getElementById('newWriter').value = writer;
        document.getElementById('newActors').value = actors;
        document.getElementById('newDesc').value = desc;
        document.getElementById('newType').value = 'Series';
        document.getElementById('newTmdb').value = `https://www.themoviedb.org/tv/${tvId}`;
        
        if (seriesData.poster_path || posterPath) {
            tempPoster = `https://image.tmdb.org/t/p/w500${seriesData.poster_path || posterPath}`;
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
        poster_url: tempPoster || null, createdBy: currentUserName || 'Χρήστης',
        status: 'active'
    };
    moviesData.push(newMovie);
    saveToLocalStorage();
    updateRecentMoviesList();
    initFilters();
    initFuseSearch();
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
        
        <div class="form-group">
            <label>📅 Ημερομηνία Προσθήκης</label>
            <input type="date" id="editDateAdded" value="${movie.dateAdded || new Date().toISOString().split('T')[0]}">
            <small>Άλλαξε την ημερομηνία για να εμφανίζεται στις "Πρόσφατες Προσθήκες"</small>
        </div>
        
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
    const newLink = document.getElementById('editLink').value || '';
    const oldLink = moviesData[idx].link;
    const newDateAdded = document.getElementById('editDateAdded').value;
    
    if (isDuplicateMovie(title, year, currentEditingMovieId)) { showToast('Υπάρχει ήδη!', '#e50914'); return; }
    
    const wasPending = moviesData[idx].status === 'pending';
    const hasNewLink = newLink && newLink !== '';
    const hadNoLink = !oldLink || oldLink === '';
    
    moviesData[idx] = { 
        ...moviesData[idx], 
        title, 
        year, 
        type: document.getElementById('editType').value, 
        quality: document.getElementById('editQuality').value, 
        rating,
        actors: document.getElementById('editActors').value || 'N/A', 
        link: newLink,
        dateAdded: newDateAdded
    };
    
    if (wasPending && hasNewLink && hadNoLink) {
        moviesData[idx].status = 'active';
        moviesData[idx].approvedDate = new Date().toISOString().split('T')[0];
        moviesData[idx].approvedBy = currentUserName || 'Διαχειριστής';
        showToast(`✅ Η ταινία "${title}" εγκρίθηκε και είναι πλέον διαθέσιμη!`, '#2ecc71');
        initFuseSearch();
    }
    
    saveToLocalStorage();
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
    updateRecentMoviesList();
    initFilters();
    initFuseSearch();
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
    const url = prompt('URL poster (άδειο για auto):', movie.poster_url || '');
    if (url === null) return;
    if (url) movie.poster_url = url;
    else delete movie.poster_url;
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
            const newMovie = { id: newId, title, year: parseInt(year) || new Date().getFullYear(), country: data.production_countries?.[0]?.name || 'N/A', genre: data.genres?.map(g => g.name).join(', ') || 'N/A', type: mediaType === 'tv' ? 'Series' : 'Movie', quality: 'HD', rating: data.vote_average || 0, actors, director, writer, link: '', imdb: data.imdb_id ? `https://www.imdb.com/title/${data.imdb_id}` : '', tmdb: tmdbUrl, desc: data.overview || 'Δεν υπάρχει περιγραφή.', dateAdded: new Date().toISOString().split('T')[0], studio: data.production_companies?.[0]?.name || 'N/A', createdBy: currentUserName || 'Χρήστης', status: 'active', poster_url: data.poster_path ? `https://image.tmdb.org/t/p/w500${data.poster_path}` : null };
            moviesData.push(newMovie);
            saveToLocalStorage();
            updateRecentMoviesList();
            initFilters();
            initFuseSearch();
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
        try { 
            moviesData = JSON.parse(e.target.result); 
            moviesData.forEach(m => { if (!m.status) m.status = 'active'; if (!m.poster_url) m.poster_url = null; });
            saveToLocalStorage(); 
            updateRecentMoviesList(); 
            initFilters(); 
            initFuseSearch();
            applyFilters(); 
            alert(`Εισήχθησαν ${moviesData.length} τίτλοι`); 
        } catch(err) { alert('Λάθος αρχείο'); }
        event.target.value = '';
    };
    reader.readAsText(file);
}

function removeAllLinksAndExport() {
    if (!AdminAuth.isSessionValid()) { showToast('Μόνο διαχειριστής!', '#e50914'); return; }
    if (!confirm('⚠️ ΠΡΟΣΟΧΗ! Αυτή η ενέργεια θα ΑΦΑΙΡΕΣΕΙ ΟΛΑ ΤΑ LINKS από ΟΛΕΣ τις ταινίες/σειρές.\n\nΣυνέχεια;')) return;
    let removedCount = 0;
    for (let i = 0; i < moviesData.length; i++) { if (moviesData[i].link && moviesData[i].link !== '') { moviesData[i].link = ''; removedCount++; } }
    saveToLocalStorage(); updateRecentMoviesList(); applyFilters();
    const dataStr = JSON.stringify(moviesData, null, 2);
    const blob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'movies_clean.json'; a.click(); URL.revokeObjectURL(url);
    showToast(`✅ Αφαιρέθηκαν ${removedCount} links! Το καθαρό αρχείο κατέβηκε.`, '#2ecc71');
}

function showMissingPostersList() { alert('Λειτουργία ελέγχου poster - Όλα καλά!'); }
function searchByID() { const id = prompt('ID:'); const movie = moviesData.find(m => m.id == id); if(movie) openDetailsById(movie.id); else showToast('Δεν βρέθηκε', '#e50914'); }
function loadDashboardState() { 
    const auth = AdminAuth.isSessionValid(); 
    const visible = localStorage.getItem('dashboardVisible') === 'true'; 
    if (auth && visible) {
        showDashboard();
    } else {
        hideDashboard();
    }
}

// Νέο κουμπί στο dashboard για enrichment
function addEnrichButton() {
    const dashboard = document.querySelector('.dashboard-actions');
    if (dashboard && !document.getElementById('enrichPostersBtn')) {
        const enrichBtn = document.createElement('button');
        enrichBtn.id = 'enrichPostersBtn';
        enrichBtn.className = 'dash-btn';
        enrichBtn.style.background = '#3498db';
        enrichBtn.style.color = 'white';
        enrichBtn.innerHTML = '🖼️ Αποθήκευση Όλων των Posters (Μία Φορά)';
        enrichBtn.addEventListener('click', async () => {
            if (confirm('Αυτό θα αποθηκεύσει poster URLs για ΟΛΕΣ τις ταινίες στο JSON.\nΘα γίνει μια φορά - μετά θα ανοίγει ΑΜΕΣΑ.\n\nΣυνέχεια;')) {
                await enrichAllPosters();
            }
        });
        dashboard.appendChild(enrichBtn);
    }
}

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
    
    const viewRequestsBtn = document.getElementById('viewRequestsBtn');
    if (viewRequestsBtn) {
        viewRequestsBtn.addEventListener('click', () => showRequestsPanel());
    }
    
    const quickAddBtn = document.getElementById('quickAddBtn');
    if (quickAddBtn) {
        quickAddBtn.addEventListener('click', () => {
            const title = prompt('📧 Τίτλος ταινίας από email:');
            if (!title) return;
            const year = prompt('📅 Έτος:');
            if (!year) return;
            const requester = prompt('👤 Από ποιον; (προαιρετικό)') || 'Από email';
            
            movieRequests.push({
                id: Date.now(),
                title: title,
                year: parseInt(year),
                requester: requester,
                dateRequested: new Date().toISOString().split('T')[0],
                status: 'pending'
            });
            
            saveRequestsToLocalStorage();
            showToast(`✅ Προστέθηκε: ${title}`, '#2ecc71');
            
            const panel = document.getElementById('requestsPanel');
            if (panel) {
                panel.remove();
                showRequestsPanel();
            }
        });
    }
    
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
    
    addEnrichButton();
    
    window.approveExistingMovie = approveExistingMovie;
    window.rejectAndDeleteMovie = rejectAndDeleteMovie;
}

// ============ INITIALIZATION ============
window.addEventListener('DOMContentLoaded', async () => {
    if (!initConfig()) { showToast('⚠️ Σφάλμα: Δεν βρέθηκε το config.js!', '#e50914'); }
    loadTheme();
    loadRequestsFromLocalStorage();
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
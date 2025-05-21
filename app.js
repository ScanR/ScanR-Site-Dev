// ─────────────────────────────────  app.js ─────────────────────────────────────
let CONFIG;

const latestContainer = document.querySelector('.latest-chapters');
const seriesContainer = document.querySelector('.series-grid');

// Helpers pour ajuster les URLs de cover
const appendSeriesCover  = url => `${url.slice(0, -4)}-s.jpg`;
const appendChapterCover = url => `${url.slice(0, -4)}-m.jpg`;
function timeAgo(ms) {
  const diff = Date.now() - ms;
  const min = 60*1000, h = 60*min, d = 24*h, w = 7*d;
  if (diff < min) return 'à l’instant';
  if (diff < h)   return `${Math.floor(diff/min)} min`;
  if (diff < d)   return `${Math.floor(diff/h)} h`;
  if (diff < w)   return `${Math.floor(diff/d)} j`;
  return new Date(ms).toLocaleDateString('fr-FR');
}
const maybeNewBadge = lastUpdated =>
  (Date.now() - lastUpdated < 3*24*60*60*1000)
    ? '<span class="new-badge">NOUVEAU</span>' : '';

// Rendus HTML
function renderChapter(c) {
  return `
  <div class="chapter-card" onclick="window.open('${c.url}', '_blank')">
    <div class="chapter-cover">
      <img src="${appendChapterCover(c.serieCover)}" alt="${c.serieTitle} – Cover">
      ${maybeNewBadge(c.last_updated)}
    </div>
    <div class="chapter-info">
      <div class="manga-title">${c.serieTitle}</div>
      <div class="chapter-title">${c.title}</div>
      <div class="chapter-number">Chapitre ${c.chapter}</div>
      <div class="chapter-time"><i class="fas fa-clock"></i> ${timeAgo(c.last_updated)}</div>
    </div>
  </div>`;
}

function renderSeries(s) {
  // Calcul du numéro du dernier chapitre
  const lastChap = Object
    .keys(s.chapters)
    .reduce((max, curr) =>
      parseFloat(curr) > parseFloat(max) ? curr : max
    , '0');

  // Construction de l'URL vers le dernier chapitre
  const safeChap = lastChap.replaceAll('.', '-');
  const lastChapUrl = `https://cubari.moe/read/gist/${s.base64Url}/${safeChap}/1/`;

  return `
  <div class="series-card" onclick="window.open('${s.urlSerie}', '_blank')">
    <div class="series-cover">
      <img src="${appendSeriesCover(s.cover)}" alt="${s.title} – Cover">
    </div>
    <div class="series-info">
      <div class="series-title">${s.title}</div>
      ${s.year   ? `<div class="meta">Année : ${s.year}</div>`   : ''}
      ${s.status ? `<div class="meta">Statut : ${s.status}</div>` : ''}
      ${s.author ? `<div class="meta"><strong>Auteur :</strong> ${s.author}</div>` : ''}
      ${s.artist && s.artist !== s.author
        ? `<div class="meta"><strong>Artiste :</strong> ${s.artist}</div>`
        : ''}
      ${Array.isArray(s.tags) ? `
        <div class="tags">
          ${s.tags.slice(0,6).map(t => `<span class="tag">${t}</span>`).join('')}
        </div>` : ''
      }
      <div class="meta">
        Dernier chapitre :
        <a
          href="${lastChapUrl}"
          target="_blank"
          class="chapter-number-stylish"
          onclick="event.stopPropagation()"
        >
          ${lastChap}
        </a>
      </div>
    </div>
  </div>`;
}

// 1) Récupérer et traiter les JSON de chaque série
async function fetchAllSeries() {
  CONFIG = await fetch("./config.json").then(res => res.json());
  const contents = await fetch(CONFIG.URL_GIT_CUBARI)
    .then(r => {
      if (!r.ok) throw new Error(`GitHub API ${r.status}`);
      return r.json();
    });

  // contents est un tableau d'objets { name, download_url, ... }
  const seriesPromises = contents
    .filter(file => file.name.endsWith('.json'))
    .map(async file => {
      const serie = await fetch(file.download_url).then(r => r.json());
      const base64Url = btoa(`${CONFIG.URL_RAW_JSON_GITHUB}${file.name}`);
      serie.urlSerie   = `https://cubari.moe/read/gist/${base64Url}`;
      serie.base64Url  = base64Url;
      return serie;
    });

  return Promise.all(seriesPromises);
}

// 2) À partir de ces séries, bâtir liste de chapitres et liste de séries
async function bootstrap() {
  try {
    // 1) Récupérer et traiter les JSON de chaque série
    const allSeries = await fetchAllSeries(); // suppose fetchAllSeries() est défini ailleurs

    // 2a) Injection de la grille des séries
    const seriesContainer = document.querySelector('.series-grid');
    seriesContainer.innerHTML = allSeries.map(renderSeries).join('');

    // 2b) Construction et tri de tous les chapitres
    const allChapters = allSeries
      .flatMap(serie =>
        Object.entries(serie.chapters).map(([chapNum, chapData]) => {
          chapData.serieTitle = serie.title;
          chapData.serieCover = serie.cover;
          chapData.chapter    = chapNum;
          chapData.url        = `https://cubari.moe/read/gist/${serie.base64Url}/${chapNum.replaceAll('.', '-')}/1/`;
          return chapData;
        })
      )
      .sort((a, b) => b.last_updated - a.last_updated)
      .slice(0, 15);

    // 2c) Injection du carousel des chapitres
    const track = document.querySelector('.carousel-track');
    track.innerHTML = allChapters.map(renderChapter).join('');

    // 3) Initialisation des flèches
    const prevBtn = document.querySelector('.carousel-prev');
    const nextBtn = document.querySelector('.carousel-next');
    const visibleWidth  = track.clientWidth;
    const maxScrollLeft = track.scrollWidth - visibleWidth;

    nextBtn.addEventListener('click', () => {
      const visibleWidth  = track.clientWidth;
      const maxScrollLeft = track.scrollWidth - visibleWidth;
      if (track.scrollLeft >= maxScrollLeft) {
        track.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        track.scrollBy({ left: visibleWidth, behavior: 'smooth' });
      }
    });

    prevBtn.addEventListener('click', () => {
      const visibleWidth  = track.clientWidth;
      const maxScrollLeft = track.scrollWidth - visibleWidth;
      if (track.scrollLeft <= 0) {
        track.scrollTo({ left: maxScrollLeft, behavior: 'smooth' });
      } else {
        track.scrollBy({ left: -visibleWidth, behavior: 'smooth' });
      }
    });

    // 4) Swipe / drag-to-scroll
    let isDragging   = false;
    let startX       = 0;
    let scrollStart  = 0;

    // Desktop (souris)
    track.addEventListener('mousedown', e => {
      isDragging = true;
      track.classList.add('active');
      startX      = e.pageX - track.offsetLeft;
      scrollStart = track.scrollLeft;
    });

    document.addEventListener('mouseup', () => {
      isDragging = false;
      track.classList.remove('active');
    });

    track.addEventListener('mousemove', e => {
      if (!isDragging) return;
      e.preventDefault();
      const x    = e.pageX - track.offsetLeft;
      const walk = (x - startX) * 1.5;
      track.scrollLeft = scrollStart - walk;
    });

    // Mobile (touch)
    track.addEventListener('touchstart', e => {
      startX      = e.touches[0].pageX - track.offsetLeft;
      scrollStart = track.scrollLeft;
    });

    track.addEventListener('touchmove', e => {
      const x    = e.touches[0].pageX - track.offsetLeft;
      const walk = (x - startX) * 1.5;
      track.scrollLeft = scrollStart - walk;
    });

  } catch (err) {
    console.error('Erreur de chargement :', err);
    document.querySelector('.carousel-track').innerHTML = '<p>Impossible de charger les chapitres.</p>';
    document.querySelector('.series-grid').innerHTML  = '<p>Impossible de charger les séries.</p>';
  }
}

// Lancement de l’app
bootstrap();


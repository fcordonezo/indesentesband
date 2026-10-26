const state = {
  data: null,
  currentSection: "home",
  theme: "dark",
  audio: new Audio(),
  music: {
    category: "all",
    album: "all",
    currentIndex: 0,
    currentTrackId: null,
    loadedTrackId: null,
    isPlaying: false,
    volume: 0.8,
    volumeBeforeMute: 0.8,
    isMuted: false,
    repeat: false,
    shuffle: false,
    accordionState: null,
    scrollPosition: 0,
    songListScrollPosition: 0,
  },
  events: {
    status: "all",
    selectedDates: [],
    calendarMonth: null,
    calendarOpen: false,
  },
};

const EVENT_TIME_ZONE = "America/Bogota";

document.addEventListener("DOMContentLoaded", initApp);

async function initApp() {
  try {
    const [site, home] = await Promise.all([
      fetch("data/site.json").then((res) => res.json()),
      fetch("data/home.json").then((res) => res.json()),
    ]);

    state.data = { site, home, music: null, events: null, about: null, contact: null };
    bindThemeControls();
    bindImageModal();
    renderHeader();
    renderNav();
    renderFooter();
    renderSection(getSectionFromHash() || "home", false);
    window.addEventListener("hashchange", () => {
      const section = getSectionFromHash() || "home";
      if (section === "home" || state.data[section]) renderSection(section, false);
    });

    const [music, events, about, contact] = await Promise.all([
      fetch("data/music.json").then((res) => res.json()),
      fetch("data/events.json").then((res) => res.json()),
      fetch("data/about.json").then((res) => res.json()),
      fetch("data/contact.json").then((res) => res.json()),
    ]);
    state.data = { site, home, music, events, about, contact };
    bindAudioEvents();
    startEventClock();

    const requestedSection = getSectionFromHash();
    if (requestedSection && requestedSection !== "home") renderSection(requestedSection, false);
  } catch (error) {
    console.error("No se pudo cargar el contenido JSON:", error);
    const content = document.getElementById("page-content");
    content.innerHTML = '<div class="empty-state">No se pudo cargar el contenido del sitio.</div>';
  }
}

function renderHeader() {
  const site = state.data.site;
  const title = document.getElementById("site-title");
  const tagline = document.getElementById("site-tagline");
  const socials = document.getElementById("social-links");
  const logo = document.getElementById("brand-logo");

  title.textContent = site.title;
  tagline.textContent = site.tagline;
  logo.src = state.theme === "dark" ? site.theme.darkLogo : site.theme.lightLogo;

  socials.innerHTML = site.socials
    .map(
      (social) => `
        <a
          class="social-link"
          href="${social.url}"
          target="_blank"
          rel="noreferrer"
          aria-label="${social.label}"
          title="${social.label}"
        >${getSocialIcon(social.icon)}</a>
      `
    )
    .join("");
}

function renderNav() {
  const navMenu = document.getElementById("nav-menu");
  const nav = state.data.site.nav;

  navMenu.innerHTML = nav
    .map(
      (item) => `
        <li class="nav-item">
          <a
            href="#${item.id}"
            data-section="${item.id}"
            class="${state.currentSection === item.id ? "active" : ""}"
          >
            ${item.label}
          </a>
        </li>
      `
    )
    .join("");

  navMenu.querySelectorAll("a[data-section]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      const section = button.dataset.section;
      renderSection(section);
    });
  });
}

function renderFooter() {
  const footer = document.getElementById("site-footer");
  footer.innerHTML = `<p>${state.data.site.footer.copyright}</p>`;
}

function getSectionFromHash() {
  const section = window.location.hash.slice(1).split("/")[0];
  return ["home", "music", "events", "about", "contact"].includes(section) ? section : null;
}

function getEventSlugFromHash() {
  const hashParts = window.location.hash.slice(1).split("/");
  return hashParts[0] === "events" && hashParts[1] ? decodeURIComponent(hashParts[1]) : null;
}

function resolveEventFromHash(events) {
  const hashSlug = getEventSlugFromHash();
  if (!hashSlug) return null;
  return events.find((event) => getEventSlug(event) === hashSlug)
    || events.find((event) => getEventNameSlug(event) === hashSlug)
    || null;
}

function renderSection(section, updateHash = true) {
  if (section !== "home" && (!state.data || !state.data[section])) return;

  state.currentSection = section;
  if (updateHash && window.location.hash !== `#${section}`) {
    window.history.pushState({}, "", `#${section}`);
  }

  const buttons = document.querySelectorAll("[data-section]");
  buttons.forEach((button) => {
    button.classList.toggle("active", button.dataset.section === section);
  });

  if (section === "home") renderHome();
  if (section === "music") renderMusic();
  if (section === "events") renderEvents();
  if (section === "about") renderAbout();
  if (section === "contact") renderContact();
}

function renderHome() {
  const home = state.data.home;
  const hero = home.hero;

  document.getElementById("page-content").innerHTML = `
  <section class="page-section">
      <div class="hero-grid">
        <article class="hero-card">
          <h2>${hero.title}</h2>
          <p>${hero.description}</p>
          <div class="hero-badges">
            ${hero.badges.map((badge) => `<span class="badge">${badge}</span>`).join("")}
          </div>
        </article>

        <aside class="hero-card">
          <div class="section-header">
            <h3>${home.metrics.heading}</h3>
          </div>
          <div class="metrics-grid">
            ${home.metrics.items
      .map(
        (item) => `
                  <a class="metric-card" href="#${item.label === "Canciones de estudio" ? "music" : item.label === "Shows" ? "events" : "home"}" data-section="${item.label === "Canciones de estudio" ? "music" : item.label === "Shows" ? "events" : "home"}">
                    <strong>${item.value}</strong>
                    <span>${item.label}</span>
                  </a>
                `
      )
      .join("")}
          </div>
        </aside>
      </div>
    </section>
  <section class="page-section">
      <div class="section-header">
      </div>
      <div class="embed-grid">
        ${home.media.embeds
      .map(
        (embed) => `
              <div class="embed-frame">
                <iframe
                  src="${embed.src}"
                  title="${embed.title}"
                  loading="lazy"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowfullscreen
                ></iframe>
              </div>
            `
      )
      .join("")}
      </div>
    </section>

    <section class="page-section">
      <div class="section-header">
        <h2>${home.features.heading}</h2>
      </div>
      <div class="feature-grid">
        ${home.features.items
      .map(
        (item) => `
              <article class="feature-card">
                <h3>${item.title}</h3>
                <p>${item.description}</p>
              </article>
            `
      )
      .join("")}
      </div>
    </section>

    <section class="page-section">
      <div class="section-header">
        <h2>${home.instagram.heading}</h2>
      </div>

      ${home.instagram.feedEmbed
      ? `
            <div class="instagram-embed-wrap">
              <iframe
                class="instagram-embed"
                src="${home.instagram.feedEmbed}"
                title="Instagram de INDESENTES"
                loading="lazy"
                allowfullscreen
                scrolling="yes"
                frameborder="0"
              ></iframe>
            </div>
          `
      : ""}

      <div class="instagram-grid">
        ${home.instagram.items
      .map(
        (item) => `
              <article class="instagram-card">
                <img src="${item.image}" alt="${item.caption}" loading="lazy" decoding="async" />
                <div class="caption">${item.caption}</div>
              </article>
            `
      )
      .join("")}
      </div>
    </section>

  `;

  document.querySelectorAll(".metric-card[data-section]").forEach((card) => {
    card.addEventListener("click", (event) => {
      event.preventDefault();
      renderSection(card.dataset.section);
    });
  });
}

function renderMusic() {
  preserveMusicViewState();
  const music = state.data.music;
  const songs = getVisibleSongs();
  const currentSong = getCurrentTrack() || songs[0] || music.songs[0];

  if (currentSong) {
    state.music.currentTrackId = currentSong.id;
  }

  const albumGroups = groupSongsByAlbum(songs);
  const selectedAlbumLabel = state.music.album === "all" ? "Todos los álbumes" : state.music.album;

  document.getElementById("page-content").innerHTML = `
    <section class="page-section">
      <div class="section-header">
        <h2>${music.heading}</h2>
        <p>${music.subtitle}</p>
      </div>

      <div class="music-layout">
        <div class="player-panel">
          <div class="now-playing">
            <div
              class="album-art"
              style="background-image: url('${currentSong.image || 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=900&q=80'}')"
            ></div>
            <div class="track-meta">
              <p class="eyebrow">${currentSong.category}</p>
              <h3>${currentSong.title}</h3>
              <p>${currentSong.artist} • ${currentSong.album}</p>
            </div>
          </div>

          <div class="player-controls">
            <div class="control-row">
              <button class="control-button" type="button" data-action="prev" aria-label="Anterior"><img src="assets/ico/backward.svg" alt="" /></button>
              <button class="control-button primary" type="button" data-action="toggle" aria-label="Reproducir/pausar"><img src="assets/ico/${state.music.isPlaying ? "pause.svg" : "play.svg"}" alt="" /></button>
              <button class="control-button" type="button" data-action="next" aria-label="Siguiente"><img src="assets/ico/forward.svg" alt="" /></button>
            </div>

            <div class="player-tools">
              <div class="volume-control">
                <button id="volume-mute" class="volume-button" type="button" aria-label="${state.music.isMuted ? "Activar sonido" : "Silenciar"}" title="${state.music.isMuted ? "Activar sonido" : "Silenciar"}">
                  <img src="assets/ico/${state.music.isMuted ? "mute.svg" : "unmute.svg"}" alt="" />
                </button>
                <input id="volume-range" type="range" min="0" max="100" step="1" value="${Math.round(state.music.volume * 100)}" aria-label="Volumen" />
              </div>

              <div class="playback-toggle-group">
                <button class="control-button ${state.music.repeat ? "active" : ""}" type="button" data-action="repeat" aria-label="Repetir canción"><img src="assets/ico/repeat.svg" alt="" /></button>
                <button class="control-button ${state.music.shuffle ? "active" : ""}" type="button" data-action="shuffle" aria-label="Reproducción aleatoria"><img src="assets/ico/shuffle.svg" alt="" /></button>
              </div>
            </div>

            <div class="progress-wrap">
              <div class="progress-meta">
                <span id="current-time">0:00</span>
                <span id="total-time">0:00</span>
              </div>
              <input id="timeline" class="progress-bar" type="range" min="0" max="100" value="0" />
            </div>
          </div>
        </div>

        <aside class="playlist-panel">
          <div class="playlist-tools">
            <div class="category-filters">
              ${["all", ...music.categories]
      .map(
        (category) => `
                    <button
                      class="filter-button ${state.music.category === category ? "active" : ""}"
                      type="button"
                      data-category="${category}"
                    >
                      ${category === "all" ? "Todas" : category}
                    </button>
                  `
      )
      .join("")}
            </div>

            <label class="album-filter-wrap">
              <span class="album-label">Álbum</span>
              <select id="album-filter" class="sort-select" aria-label="Filtrar por álbum">
                <option value="all" ${state.music.album === "all" ? "selected" : ""}>Todos los álbumes</option>
                ${[...new Set(songs.map((song) => song.album))]
      .map(
        (album) => `
                      <option value="${album}" ${state.music.album === album ? "selected" : ""}>${album}</option>
                    `
      )
      .join("")}
              </select>
            </label>
          </div>

          <div class="song-list album-accordion">
            ${albumGroups.length
      ? albumGroups
        .map(
          ([album, albumSongs]) => `
                      <div class="album-group">
                        <details class="album-accordion-item" data-album="${album}" ${getAccordionOpenState(album) ? "open" : ""}>
                          <summary>
                            <span>${album}</span>
                            <span>${albumSongs.length}</span>
                          </summary>
                          <div class="album-songs">
                            ${albumSongs
              .map(
                (song, index) => `
                                  <div
                                    class="song-item ${song.id === currentSong.id ? "active" : ""}"
                                    data-index="${songs.findIndex((item) => item.id === song.id)}"
                                    data-song-id="${song.id}"
                                  >
                                    <div class="song-thumb" style="background-image: url('${song.image || 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=300&q=80'}')"></div>
                                    <div class="song-meta">
                                      <strong>${song.title}</strong>
                                      <span>${song.album}</span>
                                    </div>
                                    <span class="song-duration">${song.duration}</span>
                                    <span class="song-index">#${index + 1}</span>
                                  </div>
                                `
              )
              .join("")}
                          </div>
                        </details>
                      </div>
                    `
        )
        .join("")
      : '<div class="empty-state">No hay canciones en esta categoría.</div>'}
          </div>
        </aside>
      </div>
    </section>
  `;

  bindMusicEvents();

  if (state.music.loadedTrackId !== currentSong.id) {
    setAudioTrack(currentSong);
  }

  updateProgressDisplay();
  restoreMusicViewState();
}

function preserveMusicViewState() {
  const songList = document.querySelector(".song-list");
  if (songList) state.music.songListScrollPosition = songList.scrollTop;

  const accordionItems = document.querySelectorAll(".album-accordion-item[data-album]");
  if (!accordionItems.length) return;

  state.music.accordionState = Object.fromEntries(
    [...accordionItems].map((accordion) => [accordion.dataset.album, accordion.open])
  );
  state.music.scrollPosition = window.scrollY;
}

function getAccordionOpenState(album) {
  if (state.music.accordionState && Object.hasOwn(state.music.accordionState, album)) {
    return state.music.accordionState[album];
  }

  return state.music.album === "all" || state.music.album === album;
}

function restoreMusicViewState() {
  if (state.music.accordionState === null && !state.music.songListScrollPosition) return;

  window.requestAnimationFrame(() => {
    window.scrollTo(0, state.music.scrollPosition);
    const songList = document.querySelector(".song-list");
    if (songList) songList.scrollTop = state.music.songListScrollPosition;
  });
}

function bindMusicEvents() {
  document.querySelectorAll(".filter-button[data-category]").forEach((button) => {
    button.addEventListener("click", () => {
      state.music.category = button.dataset.category;
      state.music.currentIndex = 0;
      const nextTrack = getCurrentTrack();
      if (nextTrack) state.music.currentTrackId = nextTrack.id;
      renderMusic();
    });
  });

  const albumSelect = document.getElementById("album-filter");
  if (albumSelect) {
    albumSelect.addEventListener("change", (event) => {
      state.music.album = event.target.value;
      state.music.currentIndex = 0;
      const nextTrack = getCurrentTrack();
      if (nextTrack) state.music.currentTrackId = nextTrack.id;
      renderMusic();
    });
  }

  document.querySelectorAll(".song-item").forEach((item) => {
    item.addEventListener("click", () => {
      const list = getVisibleSongs();
      const songId = item.dataset.songId;
      const song = list.find((track) => track.id === songId);
      if (!song) return;

      state.music.currentIndex = list.findIndex((track) => track.id === songId);
      state.music.currentTrackId = song.id;
      setAudioTrack(song);
      renderMusic();
      if (state.music.isPlaying || !state.audio.paused) {
        playAudio();
      } else {
        state.music.isPlaying = true;
        playAudio();
      }
    });
  });

  document.querySelectorAll("[data-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const action = button.dataset.action;
      const list = getVisibleSongs();
      if (!list.length) return;

      if (action === "prev") {
        const prevIndex = getNextIndex(list, state.music.currentIndex, -1);
        state.music.currentIndex = prevIndex;
        const prevSong = list[state.music.currentIndex];
        state.music.currentTrackId = prevSong.id;
        setAudioTrack(prevSong);
        renderMusic();
        state.music.isPlaying = true;
        playAudio();
      }

      if (action === "next") {
        const nextIndex = getNextIndex(list, state.music.currentIndex, 1);
        state.music.currentIndex = nextIndex;
        const nextSong = list[state.music.currentIndex];
        state.music.currentTrackId = nextSong.id;
        setAudioTrack(nextSong);
        renderMusic();
        state.music.isPlaying = true;
        playAudio();
      }

      if (action === "toggle") {
        if (state.audio.paused) {
          state.music.isPlaying = true;
          playAudio();
        } else {
          pauseAudio();
        }
      }

      if (action === "repeat") {
        state.music.repeat = !state.music.repeat;
        renderMusic();
      }

      if (action === "shuffle") {
        state.music.shuffle = !state.music.shuffle;
        renderMusic();
      }
    });
  });

  const timeline = document.getElementById("timeline");
  if (timeline) {
    timeline.addEventListener("input", (event) => {
      if (isNaN(state.audio.duration) || state.audio.duration === 0) return;
      const value = Number(event.target.value);
      state.audio.currentTime = (value / 100) * state.audio.duration;
      updateProgressDisplay();
    });
  }

  const volumeSlider = document.getElementById("volume-range");
  if (volumeSlider) {
    volumeSlider.addEventListener("input", (event) => {
      state.music.volume = Number(event.target.value) / 100;
      state.music.volumeBeforeMute = state.music.volume;
      state.music.isMuted = false;
      state.audio.volume = state.music.volume;
      updateVolumeMuteButton();
    });
  }

  const muteButton = document.getElementById("volume-mute");
  if (muteButton) {
    muteButton.addEventListener("click", toggleVolumeMute);
  }
}

function toggleVolumeMute() {
  if (state.music.isMuted) {
    state.music.isMuted = false;
    state.music.volume = state.music.volumeBeforeMute || 0.8;
  } else {
    state.music.volumeBeforeMute = state.music.volume;
    state.music.isMuted = true;
    state.music.volume = 0;
  }

  state.audio.volume = state.music.volume;
  const volumeSlider = document.getElementById("volume-range");
  if (volumeSlider) volumeSlider.value = String(Math.round(state.music.volume * 100));
  updateVolumeMuteButton();
}

function updateVolumeMuteButton() {
  const muteButton = document.getElementById("volume-mute");
  if (!muteButton) return;
  muteButton.innerHTML = `<img src="assets/ico/${state.music.isMuted ? "mute.svg" : "unmute.svg"}" alt="" />`;
  muteButton.setAttribute("aria-label", state.music.isMuted ? "Activar sonido" : "Silenciar");
  muteButton.title = state.music.isMuted ? "Activar sonido" : "Silenciar";
}

function bindAudioEvents() {
  state.audio.volume = state.music.volume;
  state.audio.addEventListener("timeupdate", updateProgressDisplay);
  state.audio.addEventListener("timeupdate", updateMediaSessionPositionState);
  state.audio.addEventListener("loadedmetadata", () => {
    updateProgressDisplay();
    updateMediaSessionPositionState();
  });
  state.audio.addEventListener("play", updateMediaSessionPlaybackState);
  state.audio.addEventListener("pause", updateMediaSessionPlaybackState);
  bindMediaSessionControls();
  state.audio.addEventListener("ended", () => {
    const list = getVisibleSongs();
    if (!list.length) return;

    if (state.music.repeat) {
      state.audio.currentTime = 0;
      playAudio();
      return;
    }

    state.music.currentIndex = getNextIndex(list, state.music.currentIndex, 1);
    const nextSong = list[state.music.currentIndex];
    state.music.currentTrackId = nextSong.id;
    setAudioTrack(nextSong);
    renderMusic();
    state.music.isPlaying = true;
    playAudio();
  });
}

function getCurrentTrack() {
  const list = getVisibleSongs();
  if (!list.length) return null;

  const current = list.find((song) => song.id === state.music.currentTrackId);
  if (current) {
    state.music.currentIndex = list.indexOf(current);
    return current;
  }

  state.music.currentIndex = 0;
  state.music.currentTrackId = list[0].id;
  return list[0];
}

function getVisibleSongs() {
  const songs = [...state.data.music.songs];
  const category = state.music.category;
  const album = state.music.album;

  const filteredByCategory =
    category === "all"
      ? songs
      : songs.filter((song) => song.category.toLowerCase() === category.toLowerCase());

  const filteredByAlbum =
    album === "all"
      ? filteredByCategory
      : filteredByCategory.filter((song) => song.album === album);

  return [...filteredByAlbum].sort((a, b) => Number(a.order || 999) - Number(b.order || 999));
}

function groupSongsByAlbum(songs) {
  const groups = new Map();

  songs.forEach((song) => {
    if (!groups.has(song.album)) {
      groups.set(song.album, []);
    }
    groups.get(song.album).push(song);
  });

  return [...groups.entries()].sort(([albumA], [albumB]) => albumA.localeCompare(albumB));
}

function getNextIndex(list, currentIndex, direction) {
  if (!list.length) return 0;

  if (state.music.shuffle) {
    if (list.length === 1) return 0;

    let randomIndex = currentIndex;
    while (randomIndex === currentIndex) {
      randomIndex = Math.floor(Math.random() * list.length);
    }
    return randomIndex;
  }

  return (currentIndex + direction + list.length) % list.length;
}

function setAudioTrack(song) {
  const track = song || state.data.music.songs[0];
  if (!track) return;

  state.music.currentTrackId = track.id;
  state.music.loadedTrackId = track.id;
  updateMediaSessionMetadata(track);

  if (state.audio.src !== track.src) {
    state.audio.src = track.src;
    state.audio.load();
  }

  const totalTime = document.getElementById("total-time");
  if (totalTime) totalTime.textContent = track.duration || "0:00";
  const toggleButton = document.querySelector('[data-action="toggle"]');
  if (toggleButton) toggleButton.innerHTML = `<img src="assets/ico/${state.music.isPlaying ? "pause.svg" : "play.svg"}" alt="" />`;
}

function playAudio() {
  const toggleButton = document.querySelector('[data-action="toggle"]');
  state.music.isPlaying = true;
  state.audio.play().catch(() => {
    state.music.isPlaying = false;
    updateMediaSessionPlaybackState();
    console.warn("Autoplay bloqueado hasta la interacción del usuario");
  });
  if (toggleButton) toggleButton.innerHTML = '<img src="assets/ico/pause.svg" alt="" />';
  updateMediaSessionPlaybackState();
}

function pauseAudio() {
  state.audio.pause();
  state.music.isPlaying = false;
  const toggleButton = document.querySelector('[data-action="toggle"]');
  if (toggleButton) toggleButton.innerHTML = '<img src="assets/ico/play.svg" alt="" />';
  updateMediaSessionPlaybackState();
}

function updateMediaSessionMetadata(track) {
  if (!("mediaSession" in navigator) || !("MediaMetadata" in window) || !track) return;

  const artwork = track.image ? new URL(track.image, document.baseURI).href : new URL("assets/logo-dark.webp", document.baseURI).href;
  navigator.mediaSession.metadata = new MediaMetadata({
    title: track.title,
    artist: track.artist || "INDESENTES",
    album: track.album || "Nuestra Música",
    artwork: [{ src: artwork, sizes: "512x512", type: getArtworkType(artwork) }],
  });
}

function getArtworkType(url) {
  const extension = url.split("?")[0].split(".").pop().toLowerCase();
  return extension === "webp" ? "image/webp" : extension === "png" ? "image/png" : "image/jpeg";
}

function updateMediaSessionPlaybackState() {
  if (!("mediaSession" in navigator)) return;
  navigator.mediaSession.playbackState = state.audio.paused ? "paused" : "playing";
}

function updateMediaSessionPositionState() {
  if (!("mediaSession" in navigator) || !navigator.mediaSession.setPositionState) return;
  const duration = state.audio.duration;
  if (!Number.isFinite(duration) || duration <= 0 || state.audio.currentTime > duration) return;

  navigator.mediaSession.setPositionState({
    duration,
    playbackRate: state.audio.playbackRate,
    position: state.audio.currentTime,
  });
}

function bindMediaSessionControls() {
  if (!("mediaSession" in navigator) || !navigator.mediaSession.setActionHandler) return;

  const handlers = {
    play: () => playAudio(),
    pause: () => pauseAudio(),
    seekbackward: (details) => seekAudio(-(details.seekOffset || 10)),
    seekforward: (details) => seekAudio(details.seekOffset || 10),
    seekto: (details) => {
      if (Number.isFinite(details.seekTime)) state.audio.currentTime = details.seekTime;
    },
    previoustrack: () => changeTrack(-1),
    nexttrack: () => changeTrack(1),
  };

  Object.entries(handlers).forEach(([action, handler]) => {
    try {
      navigator.mediaSession.setActionHandler(action, handler);
    } catch (error) {
      console.warn(`Media Session no soporta la acción ${action}`, error);
    }
  });
}

function seekAudio(offset) {
  state.audio.currentTime = Math.max(0, Math.min(state.audio.duration || Infinity, state.audio.currentTime + offset));
  updateProgressDisplay();
}

function changeTrack(direction) {
  const list = getVisibleSongs();
  if (!list.length) return;

  state.music.currentIndex = getNextIndex(list, state.music.currentIndex, direction);
  const nextSong = list[state.music.currentIndex];
  state.music.currentTrackId = nextSong.id;
  setAudioTrack(nextSong);
  renderMusic();
  state.music.isPlaying = true;
  playAudio();
}

function updateProgressDisplay() {
  const timeline = document.getElementById("timeline");
  const currentTime = document.getElementById("current-time");
  const totalTime = document.getElementById("total-time");

  if (!timeline || !currentTime || !totalTime) return;

  const duration = isFinite(state.audio.duration) ? state.audio.duration : 0;
  const progress = duration > 0 ? (state.audio.currentTime / duration) * 100 : 0;
  timeline.value = Number.isFinite(progress) ? progress : 0;
  currentTime.textContent = formatTime(state.audio.currentTime);
  totalTime.textContent = duration ? formatTime(duration) : "0:00";
}

function startEventClock() {
  window.setInterval(() => {
    if (state.currentSection === "events") renderEvents();
  }, 60000);
}

function getEventDateKey(date) {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: EVENT_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  return `${values.year}-${values.month.padStart(2, "0")}-${values.day.padStart(2, "0")}`;
}

function getEventStatus(event, now = new Date()) {
  const eventDate = getEventDateKey(new Date(event.start));
  const currentDate = getEventDateKey(now);

  if (eventDate < currentDate) return "past";
  if (eventDate > currentDate) return "upcoming";
  return "today";
}

function getCalendarParts(date) {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: EVENT_TIME_ZONE,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(date);

  return Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, Number(part.value)]));
}

function getCalendarDate(year, month, day) {
  return new Date(Date.UTC(year, month, day, 12));
}

function formatCalendarMonth(date) {
  return new Intl.DateTimeFormat("es-CO", {
    timeZone: EVENT_TIME_ZONE,
    month: "long",
    year: "numeric",
  }).format(date);
}

function renderCalendar(events, now) {
  const currentParts = getCalendarParts(now);
  const calendarDate = state.events.calendarMonth || getCalendarDate(currentParts.year, currentParts.month - 1, 1);
  const calendarParts = getCalendarParts(calendarDate);
  const year = calendarParts.year;
  const month = calendarParts.month - 1;
  const firstDay = getCalendarDate(year, month, 1);
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const firstWeekday = (firstDay.getUTCDay() + 6) % 7;
  const eventDates = new Set(events.map((event) => getEventDateKey(new Date(event.start))));
  const years = [...new Set([
    currentParts.year,
    ...events.map((event) => getCalendarParts(new Date(event.start)).year),
  ])].sort((firstYear, secondYear) => firstYear - secondYear);
  const monthNames = Array.from({ length: 12 }, (_, index) => formatCalendarMonth(getCalendarDate(2020, index, 1)).split(" de ")[0]);
  const weekdayLabels = ["L", "M", "X", "J", "V", "S", "D"];
  const cells = Array.from({ length: firstWeekday + daysInMonth }, (_, index) => {
    if (index < firstWeekday) return '<span class="calendar-day is-empty" aria-hidden="true"></span>';
    const day = index - firstWeekday + 1;
    const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const selected = state.events.selectedDates.includes(dateKey);
    const hasEvent = eventDates.has(dateKey);
    return `<button type="button" class="calendar-day${hasEvent ? " has-event" : ""}${selected ? " selected" : ""}" data-calendar-date="${dateKey}" aria-pressed="${selected}" aria-label="Seleccionar ${dateKey}">${day}</button>`;
  }).join("");

  return `
    <div class="calendar-filter">
      <button type="button" class="calendar-toggle${state.events.calendarOpen ? " active" : ""}" data-calendar-toggle aria-expanded="${state.events.calendarOpen}" aria-controls="events-calendar" title="Filtrar por fechas">
        <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4.5" width="18" height="17" rx="2"></rect><path d="M16 2.5v4M8 2.5v4M3 9.5h18"></path></svg>
        <span>Filtrar por fecha</span>
      </button>
      <div id="events-calendar" class="calendar-panel${state.events.calendarOpen ? " is-open" : ""}">
      <div class="calendar-toolbar">
        <select class="calendar-select" data-calendar-month aria-label="Seleccionar mes">
          ${monthNames.map((name, index) => `<option value="${index}" ${month === index ? "selected" : ""}>${name}</option>`).join("")}
        </select>
        <select class="calendar-select" data-calendar-year aria-label="Seleccionar año">
          ${years.map((calendarYear) => `<option value="${calendarYear}" ${year === calendarYear ? "selected" : ""}>${calendarYear}</option>`).join("")}
        </select>
      </div>
      <div class="calendar-weekdays">${weekdayLabels.map((label) => `<span>${label}</span>`).join("")}</div>
      <div class="calendar-grid">${cells}</div>
      <button type="button" class="calendar-clear" data-calendar-clear ${state.events.selectedDates.length ? "" : "disabled"}>Deseleccionar todos</button>
    </div>
    </div>
  `;
}

function groupEventsByStatus(events, now) {
  const statusOrder = ["today", "upcoming", "past"];
  const groups = [];

  statusOrder.forEach((status) => {
    const statusEvents = events
      .filter((event) => getEventStatus(event, now) === status)
      .sort((firstEvent, secondEvent) => compareEventsByStatus(firstEvent, secondEvent, status));
    if (!statusEvents.length) return;

    if (status === "today") {
      groups.push({ status, events: statusEvents });
      return;
    }

    const monthGroups = new Map();
    statusEvents.forEach((event) => {
      const parts = getCalendarParts(new Date(event.start));
      const key = `${parts.year}-${String(parts.month).padStart(2, "0")}`;
      if (!monthGroups.has(key)) monthGroups.set(key, { year: parts.year, month: parts.month, events: [] });
      monthGroups.get(key).events.push(event);
    });

    groups.push({
      status,
      groups: [...monthGroups.values()].sort((firstGroup, secondGroup) => {
        const direction = status === "past" ? -1 : 1;
        if (firstGroup.year !== secondGroup.year) return direction * (firstGroup.year - secondGroup.year);
        return direction * (firstGroup.month - secondGroup.month);
      }),
    });
  });

  return groups;
}

function compareEventsByStatus(firstEvent, secondEvent, status) {
  const difference = new Date(firstEvent.start) - new Date(secondEvent.start);
  return status === "past" ? -difference : difference;
}

function renderEventCard(event, now) {
  const status = getEventStatus(event, now);
  const eventIndex = state.data.events.events.indexOf(event);
  const eventSlug = getEventSlug(event);

  return `
    <article class="event-card event-card-lazy event-card-clickable${status === "today" ? " is-today" : ""}" data-event-index="${eventIndex}" data-event-slug="${eventSlug}" role="link" tabindex="0" aria-label="Ver evento completo: ${event.name}">
      <div class="event-card-placeholder" aria-hidden="true">
        <span></span>
        <span></span>
        <span></span>
      </div>
    </article>
  `;
}

function renderEventCardContent(event, now) {
  const status = getEventStatus(event, now);
  const statusLabel = status === "past" ? "Pasado" : status === "today" ? "Hoy" : "Próximo";
  const isLive = isEventLive(event, now);
  const eventSlug = getEventSlug(event);

  return `
      <div>
        <div class="event-heading-row">
          <p class="eyebrow">${event.type}</p>
          <div class="event-status-tags">
            <span class="event-status-tag ${status}">${statusLabel}</span>
            ${isLive ? '<span class="event-status-tag live">En vivo</span>' : ""}
          </div>
        </div>
        <h3>${event.name}</h3>
        <div class="event-meta">
          ${renderEventVenueMeta(event)}
          ${renderEventDateMeta(event, status)}
          <span class="meta-pill">${getEventMetaIcon("clock")}${event.time}</span>
          ${renderEventPriceMeta(event, status)}
        </div>
      </div>

      <p>${event.description}</p>

      <div class="event-flyers">
        ${event.flyers
      .map((flyer) => `
            <div class="event-flyer-preview">
              <img src="${flyer}" alt="Flyer del evento ${event.name}" loading="lazy" decoding="async" />
            </div>
          `)
      .join("")}
      </div>

      <div class="event-share-bar">
        <span>Compartir</span>
        ${renderEventShareLinks(event)}
      </div>
  `;
}

function hydrateEventCard(card, now) {
  if (card.dataset.hydrated === "true") return;
  const event = state.data.events.events[Number(card.dataset.eventIndex)];
  if (!event) return;

  card.innerHTML = renderEventCardContent(event, now);
  card.dataset.hydrated = "true";
  bindEventInteractions();
}

function bindLazyEventCards(now) {
  const cards = document.querySelectorAll(".event-card-lazy");
  if (!cards.length) return;

  if (!("IntersectionObserver" in window)) {
    cards.forEach((card) => hydrateEventCard(card, now));
    return;
  }

  const observer = new IntersectionObserver((entries, currentObserver) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      hydrateEventCard(entry.target, now);
      currentObserver.unobserve(entry.target);
    });
  }, { rootMargin: "300px 0px" });

  cards.forEach((card) => observer.observe(card));
}

function getAbsoluteEventUrl(event) {
  const baseUrl = `${window.location.origin}${window.location.pathname}`;
  return `${baseUrl}#events/${encodeURIComponent(getEventSlug(event))}`;
}

function getAbsoluteAssetUrl(assetPath) {
  return new URL(assetPath, window.location.href.split("#")[0]).href;
}

function getEventMetaIcon(name) {
  const icons = {
    location: "📍",
    calendar: "📅",
    clock: "🕒",
    ticket: "🎟️"
  };
  return `<span class="meta-pill-icon-emoji" aria-hidden="true">${icons[name] || ""}</span>`;
}

function renderEventVenueMeta(event) {
  if (event.mapUrl) {
    return `<a class="meta-pill meta-pill-link" href="${event.mapUrl}" target="_blank" rel="noreferrer" title="Abrir ubicación de ${event.name} en el mapa">${getEventMetaIcon("location")}${event.venue || "Ver ubicación"}</a>`;
  }
  return `<span class="meta-pill">${getEventMetaIcon("location")}${event.venue}</span>`;
}

function renderEventDateMeta(event, status) {
  if (status === "past") {
    return `<span class="meta-pill">${getEventMetaIcon("calendar")}${event.date}</span>`;
  }
  return `<a class="meta-pill meta-pill-link" href="${getGoogleCalendarUrl(event)}" target="_blank" rel="noreferrer" title="Agregar ${event.name} al calendario">${getEventMetaIcon("calendar")}${event.date}</a>`;
}

function renderEventPriceMeta(event, status) {
  if (status !== "past" && event.ticketsUrl) {
    return `<a class="meta-pill meta-pill-link" href="${event.ticketsUrl}" target="_blank" rel="noreferrer" title="Comprar boletas para ${event.name}">${getEventMetaIcon("ticket")}${event.price}</a>`;
  }
  return `<span class="meta-pill">${getEventMetaIcon("ticket")}${event.price}</span>`;
}

function getShareIcon(name) {
  const iconFiles = {
    facebook: "facebook.svg",
    instagram: "instagram.svg",
    whatsapp: "whatsapp.svg",
    x: "x.svg",
    twitter: "x.svg",
  };
  const iconFile = iconFiles[name];
  if (!iconFile) return `<img src="assets/ico/link.svg" alt="" />`;
  return `<img src="assets/ico/${iconFile}" alt="" />`;
}

function renderEventShareLinks(event, compact = false) {
  const url = encodeURIComponent(getAbsoluteEventUrl(event));
  const text = encodeURIComponent(`${event.name} - INDESENTES`);
  const links = [
    `<a class="event-share-link" href="https://www.facebook.com/sharer/sharer.php?u=${url}" target="_blank" rel="noreferrer" aria-label="Compartir en Facebook" title="Facebook">${getShareIcon("facebook")}</a>`,
    `<button class="event-share-link" type="button" data-event-share="instagram" aria-label="Compartir en Instagram" title="Instagram">${getShareIcon("instagram")}</button>`,
    `<a class="event-share-link" href="https://wa.me/?text=${text}%20${url}" target="_blank" rel="noreferrer" aria-label="Compartir en WhatsApp" title="WhatsApp">${getShareIcon("whatsapp")}</a>`,
    `<a class="event-share-link" href="https://twitter.com/intent/tweet?text=${text}&url=${url}" target="_blank" rel="noreferrer" aria-label="Compartir en X" title="X">${getShareIcon("x")}</a>`,
    `<button class="event-share-link" type="button" data-event-share="copy" aria-label="Copiar enlace del evento" title="Copiar enlace">${getShareIcon("copy")}</button>`
  ];

  return `<div class="event-share-links${compact ? " compact" : ""}" data-event-share-links>${links.join("")}</div>`;
}

function renderEventDetail(event, now) {
  const status = getEventStatus(event, now);
  const statusLabel = status === "past" ? "Pasado" : status === "today" ? "Hoy" : "Próximo";
  const isLive = isEventLive(event, now);
  const flyer = event.flyers?.[0] || "";

  setEventShareMetadata(event);
  document.getElementById("page-content").innerHTML = `
    <section class="page-section event-detail">
      <div class="event-detail-toolbar">
        <a class="event-detail-back" href="#events" data-back-events>← Volver a Eventos</a>
      </div>

      <div class="event-detail-layout">
        <figure class="event-detail-flyer">
          <button type="button" class="event-detail-flyer-button" data-image-viewer="${flyer}" data-image-alt="Flyer del evento ${event.name}" aria-label="Ver flyer completo de ${event.name}" title="Ver flyer en tamaño completo">
            <img src="${flyer}" alt="Flyer del evento ${event.name}" />
          </button>
        </figure>

        <article class="event-detail-content">
          <div class="event-heading-row">
            <p class="eyebrow">${event.type}</p>
            <div class="event-status-tags">
              <span class="event-status-tag ${status}">${statusLabel}</span>
              ${isLive ? '<span class="event-status-tag live">En vivo</span>' : ""}
            </div>
          </div>
          <h3>${event.name}</h3>
          <div class="event-meta">
            ${renderEventVenueMeta(event)}
            ${renderEventDateMeta(event, status)}
            <span class="meta-pill">${getEventMetaIcon("clock")}${event.time}</span>
            ${renderEventPriceMeta(event, status)}
          </div>
          <p>${event.description}</p>
          <div class="event-detail-share">
            <span class="album-label">Compartir</span>
            ${renderEventShareLinks(event)}
          </div>
        </article>
      </div>
    </section>
  `;
  bindEventInteractions();
}

function bindEventInteractions() {
  document.querySelectorAll("[data-open-event]").forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      window.location.hash = `events/${encodeURIComponent(link.dataset.openEvent)}`;
    });
  });

  document.querySelectorAll("[data-event-slug]").forEach((card) => {
    const openCard = () => {
      window.location.hash = `events/${encodeURIComponent(card.dataset.eventSlug)}`;
    };
    card.addEventListener("click", (event) => {
      if (event.target.closest("a, button, .event-share-bar")) return;
      openCard();
    });
    card.addEventListener("keydown", (event) => {
      if ((event.key === "Enter" || event.key === " ") && !event.target.closest("a, button")) {
        event.preventDefault();
        openCard();
      }
    });
  });

  document.querySelectorAll("[data-back-events]").forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      window.location.hash = "events";
    });
  });

  document.querySelectorAll("[data-event-share]").forEach((button) => {
    button.addEventListener("click", async () => {
      const card = button.closest("[data-event-index]");
      const detailSlug = getEventSlugFromHash();
      const event = card
        ? state.data.events.events[Number(card.dataset.eventIndex)]
        : state.data.events.events.find((item) => getEventSlug(item) === detailSlug);
      if (!event) return;

      const shareData = {
        title: `${event.name} - INDESENTES`,
        text: `${event.name} - INDESENTES`,
        url: getAbsoluteEventUrl(event)
      };

      if (button.dataset.eventShare === "copy") {
        const eventUrl = getAbsoluteEventUrl(event);
        let copied = false;

        try {
          await navigator.clipboard.writeText(eventUrl);
          copied = true;
        } catch (error) {
          const copyField = document.createElement("textarea");
          copyField.value = eventUrl;
          copyField.setAttribute("readonly", "");
          copyField.style.position = "fixed";
          copyField.style.opacity = "0";
          document.body.appendChild(copyField);
          copyField.select();
          copied = document.execCommand("copy");
          copyField.remove();
        }

        if (copied) {
          button.classList.add("copied");
          button.title = "Enlace copiado";
          button.setAttribute("aria-label", "Enlace copiado");
          window.setTimeout(() => {
            button.classList.remove("copied");
            button.title = "Copiar enlace";
            button.setAttribute("aria-label", "Copiar enlace del evento");
          }, 1800);
        } else {
          window.prompt("Copia el enlace del evento:", eventUrl);
        }
        return;
      }

      if (button.dataset.eventShare === "instagram" && navigator.share) {
        try {
          await navigator.share(shareData);
          return;
        } catch (error) {
          if (error.name === "AbortError") return;
        }
      }

      if (button.dataset.eventShare === "instagram") {
        try {
          await navigator.clipboard.writeText(getAbsoluteEventUrl(event));
          button.classList.add("copied");
          button.title = "Enlace copiado para Instagram";
          window.setTimeout(() => {
            button.classList.remove("copied");
            button.title = "Instagram";
          }, 1800);
        } catch (error) {
          window.prompt("Copia el enlace del evento:", getAbsoluteEventUrl(event));
        }
      }
    });
  });
}

function setEventShareMetadata(event) {
  const url = getAbsoluteEventUrl(event);
  const flyer = event.flyers?.[0] ? getAbsoluteAssetUrl(event.flyers[0]) : getAbsoluteAssetUrl("assets/logo-dark.webp");
  const description = `${event.name}. ${event.date} - ${event.time}. ${event.venue}.`;
  setMetaTag("meta[property='og:url']", "content", url);
  setMetaTag("meta[property='og:title']", "content", `${event.name} | INDESENTES`);
  setMetaTag("meta[property='og:description']", "content", description);
  setMetaTag("meta[property='og:image']", "content", flyer);
  setMetaTag("meta[property='og:image:secure_url']", "content", flyer);
  setMetaTag("meta[property='og:image:type']", "content", flyer.toLowerCase().endsWith(".webp") ? "image/webp" : "image/jpeg");
  setMetaTag("meta[property='og:image:alt']", "content", `Flyer del evento ${event.name} - INDESENTES`);
  setMetaTag("meta[name='twitter:title']", "content", `${event.name} | INDESENTES`);
  setMetaTag("meta[name='twitter:description']", "content", description);
  setMetaTag("meta[name='twitter:image']", "content", flyer);
  setMetaTag("link[rel='canonical']", "href", url);
  document.title = `${event.name} | INDESENTES`;
}

function resetEventShareMetadata() {
  setMetaTag("meta[property='og:url']", "content", "https://indesentesband.com/");
  setMetaTag("meta[property='og:title']", "content", "INDESENTES | Punk rock desde Bogotá");
  setMetaTag("meta[property='og:description']", "content", "Escucha la música de INDESENTES, descubre nuestros eventos y conecta con la banda de punk rock y rock alternativo de Bogotá.");
  setMetaTag("meta[property='og:image']", "content", "https://indesentesband.com/assets/logo-dark.webp");
  setMetaTag("meta[property='og:image:secure_url']", "content", "https://indesentesband.com/assets/logo-dark.webp");
  setMetaTag("meta[property='og:image:type']", "content", "image/webp");
  setMetaTag("meta[property='og:image:alt']", "content", "Logo de INDESENTES");
  setMetaTag("meta[name='twitter:title']", "content", "INDESENTES | Punk rock desde Bogotá");
  setMetaTag("meta[name='twitter:description']", "content", "Música, eventos y contacto de INDESENTES, banda de punk rock y rock alternativo de Bogotá.");
  setMetaTag("meta[name='twitter:image']", "content", "https://indesentesband.com/assets/logo-dark.webp");
  setMetaTag("link[rel='canonical']", "href", "https://indesentesband.com/");
  document.title = "INDESENTES | Punk rock desde Bogotá";
}

function setMetaTag(selector, attribute, value) {
  const tag = document.querySelector(selector);
  if (tag) tag.setAttribute(attribute, value);
}

function bindImageModal() {
  const modal = document.getElementById("image-modal");
  const preview = document.getElementById("image-modal-preview");
  if (!modal || !preview) return;

  document.addEventListener("click", (event) => {
    const imageButton = event.target.closest("[data-image-viewer]");
    if (imageButton) {
      preview.src = imageButton.dataset.imageViewer;
      preview.alt = imageButton.dataset.imageAlt || "Vista ampliada";
      modal.hidden = false;
      document.body.classList.add("modal-open");
      modal.querySelector("[data-image-modal-close]")?.focus();
      return;
    }

    if (event.target.closest("[data-image-modal-close]")) closeImageModal();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !modal.hidden) closeImageModal();
  });

  function closeImageModal() {
    modal.hidden = true;
    preview.src = "";
    preview.alt = "";
    document.body.classList.remove("modal-open");
  }
}

function getGoogleCalendarUrl(event) {
  const details = [
    event.description,
    `Tipo: ${event.type}`,
    `Precio: ${event.price}`,
  ].join("\n\n");
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `${event.name} - INDESENTES`,
    location: event.venue,
    details,
    dates: `${formatCalendarDateTime(event.start)}/${formatCalendarDateTime(event.end || event.start)}`,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function getEventDateSlug(event) {
  if (event.start) {
    const dateFromStart = String(event.start).match(/^\d{4}-\d{2}-\d{2}/);
    if (dateFromStart) return dateFromStart[0];
  }
  return "fecha";
}

function getEventNameSlug(event) {
  const customName = event.slug
    ? String(event.slug)
    : (event.name || "evento")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

  return customName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "evento";
}

function getEventSlug(event) {
  return `${getEventNameSlug(event)}-${getEventDateSlug(event)}`;
}

function formatCalendarDateTime(value) {
  return new Date(value).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function isEventLive(event, now = new Date()) {
  const start = new Date(event.start);
  const end = new Date(event.end || event.start);
  return now >= start && now <= end;
}

function renderEvents() {
  const events = state.data.events.events;
  const now = new Date();
  const eventSlug = getEventSlugFromHash();

  if (eventSlug) {
    const selectedEvent = resolveEventFromHash(events);
    if (selectedEvent) {
      const datedSlug = getEventSlug(selectedEvent);
      if (eventSlug !== datedSlug) {
        window.history.replaceState({}, "", `#events/${encodeURIComponent(datedSlug)}`);
      }
      renderEventDetail(selectedEvent, now);
      return;
    }
  }

  resetEventShareMetadata();
  const filteredEvents = events.filter((event) => {
    const statusMatches = state.events.status === "all" || getEventStatus(event, now) === state.events.status;
    const dateMatches = !state.events.selectedDates.length || state.events.selectedDates.includes(getEventDateKey(new Date(event.start)));
    return statusMatches && dateMatches;
  }).sort((firstEvent, secondEvent) => {
    const statusOrder = { today: 0, upcoming: 1, past: 2 };
    const firstStatus = getEventStatus(firstEvent, now);
    const secondStatus = getEventStatus(secondEvent, now);
    const statusDifference = statusOrder[firstStatus] - statusOrder[secondStatus];
    if (statusDifference !== 0) return statusDifference;
    return compareEventsByStatus(firstEvent, secondEvent, firstStatus);
  });
  const eventGroups = groupEventsByStatus(filteredEvents, now);

  document.getElementById("page-content").innerHTML = `
    <section class="page-section">
      <div class="section-header">
        <h2>${state.data.events.heading}</h2>
        <p>${state.data.events.subtitle}</p>
      </div>

      <div class="events-filters">
        <div class="event-status-filters" role="group" aria-label="Filtrar eventos por estado">
          ${[["all", "Todos"], ["past", "Pasados"], ["today", "Hoy"], ["upcoming", "Próximos"]]
      .map(([value, label]) => `<button type="button" class="filter-button${state.events.status === value ? " active" : ""}" data-event-status="${value}">${label}</button>`)
      .join("")}
        </div>
        ${renderCalendar(events, now)}
      </div>

      <div class="events-grid">
        ${eventGroups.length ? eventGroups
      .map((group) => {
        const statusTitle = group.status === "today" ? "Hoy" : group.status === "upcoming" ? "Próximos" : "Pasados";
        const content = group.status === "today"
          ? `<div class="event-group-grid">${group.events.map((event) => renderEventCard(event, now)).join("")}</div>`
          : group.groups.map((monthGroup) => `
                  <section class="event-subgroup">
                    <div class="event-subgroup-heading">
                      <p class="eyebrow">${monthGroup.year}</p>
                      <h4>${new Intl.DateTimeFormat("es-CO", { month: "long" }).format(getCalendarDate(monthGroup.year, monthGroup.month - 1, 1))}</h4>
                    </div>
                    <div class="event-group-grid">
                      ${monthGroup.events.map((event) => renderEventCard(event, now)).join("")}
                    </div>
                  </section>
                `).join("");

        return `
              <section class="event-group">
                <div class="event-group-heading"><h3>${statusTitle}</h3></div>
                ${content}
              </section>
            `;
      })
      .join("") : '<div class="empty-state">No hay eventos con estos filtros.</div>'}
      </div>
    </section>
  `;

  bindLazyEventCards(now);
  bindEventFilters(now);
  bindEventInteractions();
}

function bindEventFilters(now) {
  document.querySelectorAll("[data-event-status]").forEach((button) => {
    button.addEventListener("click", () => {
      state.events.status = button.dataset.eventStatus;
      renderEvents();
    });
  });

  document.querySelector("[data-calendar-toggle]")?.addEventListener("click", () => {
    state.events.calendarOpen = !state.events.calendarOpen;
    renderEvents();
  });

  document.querySelectorAll("[data-calendar-date]").forEach((button) => {
    button.addEventListener("click", () => {
      const dateKey = button.dataset.calendarDate;
      state.events.selectedDates = state.events.selectedDates.includes(dateKey)
        ? state.events.selectedDates.filter((selectedDate) => selectedDate !== dateKey)
        : [...state.events.selectedDates, dateKey];
      renderEvents();
    });
  });

  document.querySelector("[data-calendar-month]")?.addEventListener("change", (event) => {
    const current = state.events.calendarMonth || getCalendarDate(getCalendarParts(now).year, getCalendarParts(now).month - 1, 1);
    const parts = getCalendarParts(current);
    state.events.calendarMonth = getCalendarDate(parts.year, Number(event.target.value), 1);
    renderEvents();
  });

  document.querySelector("[data-calendar-year]")?.addEventListener("change", (event) => {
    const current = state.events.calendarMonth || getCalendarDate(getCalendarParts(now).year, getCalendarParts(now).month - 1, 1);
    const parts = getCalendarParts(current);
    state.events.calendarMonth = getCalendarDate(Number(event.target.value), parts.month - 1, 1);
    renderEvents();
  });

  document.querySelector("[data-calendar-clear]")?.addEventListener("click", () => {
    state.events.selectedDates = [];
    renderEvents();
  });
}

function renderAbout() {
  const about = state.data.about;

  document.getElementById("page-content").innerHTML = `
    <section class="page-section">
      <div class="section-header">
        <h2>${about.heading}</h2>
      </div>

      <div class="contact-layout">
        <div class="info-panel">
          <h3>${about.story.title}</h3>
          <p>${about.story.text}</p>
          <ul class="contact-list">
            ${about.story.details
      .map(
        (item) => `
                  <li>
                    <strong>${item.label}:</strong>
                    <span>${item.value}</span>
                  </li>
                `
      )
      .join("")}
          </ul>
        </div>

        <div class="info-panel">
          <h3>${about.mission.title}</h3>
          <p>${about.mission.text}</p>
        </div>
      </div>
    </section>

    <section class="page-section">
      <div class="section-header">
        <h2>${about.members.heading}</h2>
      </div>
      <div class="members-grid">
        ${about.members.items
      .map(
        (member) => `
              <article class="member-card">
                <img src="${member.image}" alt="${member.name}" />
                <h3>${member.name}</h3>
                <div class="role">${member.role}</div>
                <div class="member-socials" aria-label="Redes sociales de ${member.name}">
                  ${(member["social media"] || [])
            .filter((social) => social.name)
            .map(
              (social) => `
                        <a class="social-link${social.url ? "" : " is-disabled"}" href="${social.url || "#"}" target="_blank" rel="noreferrer" aria-label="${social.name} de ${member.name}" title="${social.name}">
                          ${getSocialIcon(social.name)}
                        </a>
                      `
            )
            .join("")}
                </div>
              </article>
            `
      )
      .join("")}
      </div>
    </section>
  `;
}

function renderContact() {
  const contact = state.data.contact;

  document.getElementById("page-content").innerHTML = `
    <section class="page-section">
      <div class="section-header">
        <h2>${contact.heading}</h2>
      </div>

      <div class="contact-layout">
        <div class="contact-panel">
          <h3>${contact.info.title}</h3>
          <p>${contact.info.description}</p>
          <ul class="contact-list">
            <li><strong>Email:</strong> <span>${contact.info.email}</span></li>
          </ul>
          <a class="primary-button contact-form-link" href="${contact.info.googleFormUrl}" target="_blank" rel="noreferrer">Abrir formulario de Google</a>
        </div>

        <div class="contact-panel">
          <h3>${contact.form.title}</h3>
          <form id="contact-form" class="contact-form">
            <div class="form-grid">
              <div class="form-field">
                <label for="name">Nombre</label>
                <input id="name" name="name" type="text" required />
              </div>
              <div class="form-field">
                <label for="email">Correo electrónico</label>
                <input id="email" name="email" type="email" required />
              </div>
              <div class="form-field">
                <label for="whatsapp">WhatsApp (opcional)</label>
                <input id="whatsapp" name="whatsapp" type="tel" />
              </div>
              <div class="form-field">
                <label for="eventType">Tipo de evento</label>
                <input id="eventType" name="eventType" type="text" />
              </div>
              <div class="form-field full">
                <label for="message">Descripción del evento</label>
                <textarea id="message" name="message" required></textarea>
              </div>
            </div>
            <button type="submit" class="form-button">Enviar solicitud</button>
          </form>
        </div>
      </div>
    </section>
  `;

  const form = document.getElementById("contact-form");
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const subject = encodeURIComponent("Solicitud de evento - INDESENTES");
    const body = encodeURIComponent(
      `Nombre: ${formData.get("name")}\n` +
      `Correo: ${formData.get("email")}\n` +
      `WhatsApp: ${formData.get("whatsapp") || "No indicado"}\n` +
      `Tipo de evento: ${formData.get("eventType") || "No indicado"}\n\n` +
      `Descripción del evento:\n${formData.get("message")}`
    );

    window.location.href = `mailto:${state.data.contact.info.email}?subject=${subject}&body=${body}`;
  });
}

function bindThemeControls() {
  const savedTheme = localStorage.getItem("theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  state.theme = savedTheme ? savedTheme : prefersDark ? "dark" : "light";
  applyTheme();

  document.getElementById("theme-toggle").addEventListener("click", () => {
    state.theme = state.theme === "dark" ? "light" : "dark";
    localStorage.setItem("theme", state.theme);
    applyTheme();
  });
}

function applyTheme() {
  document.body.classList.toggle("theme-light", state.theme === "light");
  document.body.classList.toggle("theme-dark", state.theme === "dark");

  const icon = document.getElementById("theme-icon");
  if (icon) {
    const iconName = state.theme === "dark" ? "sun.svg" : "moon.svg";
    icon.innerHTML = `<img src="assets/ico/${iconName}" alt="" />`;
  }

  const logo = document.getElementById("brand-logo");
  if (logo && state.data) {
    logo.src = state.theme === "dark" ? state.data.site.theme.darkLogo : state.data.site.theme.lightLogo;
  }
}

function getSocialIcon(iconName) {
  const normalizedIconName = iconName.trim().toLowerCase();
  const iconFiles = {
    instagram: "instagram.svg",
    facebook: "facebook.svg",
    email: "mail.svg",
    mail: "mail.svg",
    whatsapp: "whatsapp.svg",
    x: "x.svg",
    twitter: "x.svg",
  };
  const iconFile = iconFiles[normalizedIconName] || "mail.svg";
  return `<img src="assets/ico/${iconFile}" alt="" />`;
}

function getRepeatIcon() {
  return '<img src="assets/ico/repeat.svg" alt="" />';
}

function getShuffleIcon() {
  return '<img src="assets/ico/shuffle.svg" alt="" />';
}

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes}:${String(secs).padStart(2, "0")}`;
}

function convertDurationToSeconds(duration) {
  if (!duration) return 0;
  const [minutes, seconds] = duration.split(":").map(Number);
  return minutes * 60 + seconds;
}

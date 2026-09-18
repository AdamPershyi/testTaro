const app = document.getElementById('app');
const panels = {
  idle: document.getElementById('idle'),
  drawing: document.getElementById('drawing'),
  reveal: document.getElementById('reveal'),
  reading: document.getElementById('reading'),
  error: document.getElementById('error'),
};

const audioEl = document.getElementById('tts-audio');

function setState(state) {
  app.className = `state-${state}`;
  Object.values(panels).forEach((panel) => panel.classList.add('hidden'));
  panels[state]?.classList.remove('hidden');
}

function connectWebSocket() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}/ws/overlay`;
  const socket = new WebSocket(wsUrl);

  socket.addEventListener('open', () => {
    console.log('[overlay] connected');
  });

  socket.addEventListener('message', (event) => {
    try {
      const data = JSON.parse(event.data);
      handleEvent(data);
    } catch (error) {
      console.error('[overlay] invalid event', error);
    }
  });

  socket.addEventListener('close', () => {
    console.warn('[overlay] disconnected, reconnecting...');
    setTimeout(connectWebSocket, 2000);
  });

  socket.addEventListener('error', () => {
    socket.close();
  });
}

function handleEvent(event) {
  switch (event.type) {
    case 'overlay:connected':
      setState('idle');
      break;
    case 'reading:queued':
      setState('idle');
      break;
    case 'reading:drawing':
      showDrawing(event.payload);
      break;
    case 'reading:reveal':
      showReveal(event.payload);
      break;
    case 'reading:reading':
      showReading(event.payload, event.readingId);
      break;
    case 'reading:done':
      setState('idle');
      break;
    case 'reading:error':
      showError(event.payload?.message ?? 'Невідома помилка');
      break;
    default:
      break;
  }
}

function showDrawing(payload) {
  document.getElementById('draw-username').textContent = payload.username ?? '';
  document.getElementById('draw-question').textContent = payload.question ?? '';
  setState('drawing');
}

function setCardArt(img, imageUrl, reversed) {
  if (!img) {
    return;
  }
  img.classList.remove('is-on', 'is-reversed');
  if (!imageUrl) {
    img.removeAttribute('src');
    return;
  }
  img.onload = () => {
    img.classList.add('is-on');
    if (reversed) {
      img.classList.add('is-reversed');
    }
  };
  img.onerror = () => {
    img.classList.remove('is-on', 'is-reversed');
  };
  img.src = imageUrl;
}

function showReveal(payload) {
  const card = payload.card ?? {};
  document.getElementById('card-name').textContent = card.nameUk ?? 'Карта';
  document.getElementById('card-orientation').textContent = card.reversed
    ? 'Перевернута'
    : 'Пряма';
  document.getElementById('card-keywords').textContent = Array.isArray(card.keywords)
    ? card.keywords.join(' • ')
    : '';
  setCardArt(document.getElementById('card-art'), card.imageUrl, card.reversed);
  setState('reveal');
}

function showReading(payload, readingId) {
  const card = payload.card ?? {};
  document.getElementById('reading-card-name').textContent = card.nameUk ?? '';
  document.getElementById('reading-orientation').textContent = card.reversed
    ? 'Перевернута'
    : 'Пряма';
  document.getElementById('reading-question').textContent = payload.question ?? '';
  document.getElementById('reading-interpretation').textContent =
    payload.interpretation ?? '';
  setCardArt(document.getElementById('reading-card-art'), card.imageUrl, card.reversed);

  setState('reading');

  const audioPath = payload.audioUrl ?? `/api/readings/${readingId}/audio`;
  const audioUrl = `${window.location.origin}${audioPath}`;

  audioEl.pause();
  audioEl.src = audioUrl;
  audioEl.currentTime = 0;
  void audioEl.play().catch((error) => {
    console.error('[overlay] audio play failed', error);
  });
}

function showError(message) {
  document.getElementById('error-message').textContent = message;
  setState('error');
  setTimeout(() => setState('idle'), 5000);
}

setState('idle');
connectWebSocket();

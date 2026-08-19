const SECTORS = {
  Investor: { label: 'Investor', color: '#da532c' },
  Institute: { label: 'Institute', color: '#6f42c1' },
  Startup: { label: 'Startup', color: '#0dcaf0' },
  Prime: { label: 'Prime / major company', color: '#dc3545' },
  Infrastructure: { label: 'Infrastructure / testbed', color: '#20c997' },
  Government: { label: 'Government / national lab', color: '#6c757d' },
  Other: { label: 'Other', color: '#212529' }
};

let map;
let companies = [];
let activeSectors = new Set(Object.keys(SECTORS));
let markers = [];
let engine = window.CompanyEngineFallback;

const ui = {
  filters: document.getElementById('sector-filters'),
  search: document.getElementById('search-input'),
  visibleCount: document.getElementById('visible-count'),
  totalCount: document.getElementById('total-count'),
  engineStatus: document.getElementById('engine-status'),
  insight: document.getElementById('insight-card'),
  selected: document.getElementById('selected-card'),
  sector: document.getElementById('sector'),
  form: document.getElementById('company-form'),
  toggleAll: document.getElementById('toggle-all'),
  clearForm: document.getElementById('clear-form'),
  exportCsv: document.getElementById('export-csv'),
  importCsv: document.getElementById('csv-import'),
  validate: document.getElementById('validate-data')
};

boot();

async function boot() {
  if (window.loadCompanyEngine) {
    engine = await window.loadCompanyEngine();
    ui.engineStatus.textContent = engine.isWasm ? 'WASM' : 'JS';
  }

  map = L.map('map', { zoomControl: true, preferCanvas: true }).setView([42.95, -75.2], 7);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19
  }).addTo(map);

  Object.entries(SECTORS).forEach(([key, meta]) => {
    const option = document.createElement('option');
    option.value = key;
    option.textContent = meta.label;
    ui.sector.appendChild(option);
  });

  companies = await loadCompanies();
  renderLayerControls();
  bindUi();
  renderMap();
}

async function loadCompanies() {
  try {
    const response = await fetch('data/companies.csv', { cache: 'no-store' });
    if (!response.ok) throw new Error('Missing data/companies.csv');
    return parseCsv(await response.text()).map(normaliseCompany).filter(isValidCompany);
  } catch (error) {
    console.warn(error);
    return fallbackCompanies();
  }
}

function bindUi() {
  ui.filters.addEventListener('change', event => {
    if (!event.target.matches('input[type="checkbox"]')) return;
    const sector = event.target.dataset.sector;
    event.target.checked ? activeSectors.add(sector) : activeSectors.delete(sector);
    ui.toggleAll.textContent = activeSectors.size ? 'Hide all' : 'Show all';
    renderMap();
  });

  ui.toggleAll.addEventListener('click', () => {
    const showAll = activeSectors.size === 0;
    activeSectors = showAll ? new Set(Object.keys(SECTORS)) : new Set();
    document.querySelectorAll('#sector-filters input').forEach(box => box.checked = showAll);
    ui.toggleAll.textContent = showAll ? 'Hide all' : 'Show all';
    renderMap();
  });

  ui.search.addEventListener('input', renderMap);
  ui.clearForm.addEventListener('click', () => ui.form.reset());
  ui.exportCsv.addEventListener('click', () => downloadCsv(companies));
  ui.importCsv.addEventListener('change', importCsvFile);
  ui.validate.addEventListener('click', () => showValidation());

  ui.form.addEventListener('submit', event => {
    event.preventDefault();
    const company = normaliseCompany({
      name: readField('name'),
      sector: readField('sector'),
      lat: readField('lat'),
      lon: readField('lon'),
      location: readField('location'),
      website: readField('website'),
      logo: readField('logo'),
      notes: readField('notes')
    });
    if (!isValidCompany(company)) {
      alert('Add a company name, sector, latitude and longitude.');
      return;
    }
    companies.push(company);
    activeSectors.add(company.sector);
    renderLayerControls();
    renderMap();
    map.flyTo([company.lat, company.lon], Math.max(map.getZoom(), 10), { duration: 0.8 });
    ui.form.reset();
  });
}

function renderLayerControls() {
  ui.filters.innerHTML = '';
  Object.entries(SECTORS).forEach(([sector, meta]) => {
    const count = companies.filter(company => company.sector === sector).length;
    const row = document.createElement('label');
    row.className = 'layer-row';
    row.innerHTML = `<span class="layer-left"><input type="checkbox" checked data-sector="${sector}" /><span class="layer-dot" style="background:${meta.color}"></span>${meta.label}</span><span class="layer-count" data-count="${sector}">${count}</span>`;
    ui.filters.appendChild(row);
  });
}

function renderMap() {
  markers.forEach(marker => marker.remove());
  markers = [];
  visibleCompanies().forEach(company => {
    const marker = L.marker([company.lat, company.lon], { icon: sectorIcon(company.sector) })
      .bindPopup(popupHtml(company))
      .on('click', () => renderSelected(company))
      .addTo(map);
    markers.push(marker);
  });
  renderSummary();
}

function visibleCompanies() {
  const query = ui.search.value.trim().toLowerCase();
  return companies.filter(company => {
    const haystack = `${company.name} ${company.sector} ${company.location} ${company.website} ${company.notes}`.toLowerCase();
    return activeSectors.has(company.sector) && (!query || haystack.includes(query));
  });
}

function renderSummary() {
  const visible = visibleCompanies();
  ui.visibleCount.textContent = visible.length;
  ui.totalCount.textContent = companies.length;
  const counts = Object.keys(SECTORS).map(sector => `${sector}: ${visible.filter(company => company.sector === sector).length}`).join(' | ');
  ui.insight.innerHTML = `<span class="map-label">Current view</span><br><strong>${visible.length} visible ecosystem nodes</strong><br>${counts}`;
  Object.keys(SECTORS).forEach(sector => {
    const badge = document.querySelector(`[data-count="${sector}"]`);
    if (badge) badge.textContent = companies.filter(company => company.sector === sector).length;
  });
}

function renderSelected(company) {
  const website = company.website ? `<br><a class="popup-link" href="${escapeHtml(company.website)}" target="_blank" rel="noopener">Open website →</a>` : '';
  ui.selected.innerHTML = `<span class="map-label">Selected node</span><br><strong>${escapeHtml(company.name)}</strong><br>${escapeHtml(company.sector)}${company.location ? ' | ' + escapeHtml(company.location) : ''}<br><span>${escapeHtml(company.notes || 'No notes added.')}</span>${website}`;
}

function sectorIcon(sector) {
  const color = (SECTORS[sector] || SECTORS.Other).color;
  return L.divIcon({ className: '', html: `<div class="marker-pin" style="background:${color}"></div>`, iconSize: [26, 26], iconAnchor: [13, 26], popupAnchor: [0, -24] });
}

function popupHtml(company) {
  const color = (SECTORS[company.sector] || SECTORS.Other).color;
  const logo = company.logo ? `<img class="popup-logo" src="${escapeHtml(company.logo)}" alt="${escapeHtml(company.name)} logo" onerror="this.outerHTML='${fallbackLogo(company.name)}'" />` : fallbackLogo(company.name);
  const website = company.website ? `<a class="popup-link" href="${escapeHtml(company.website)}" target="_blank" rel="noopener">Learn More →</a>` : '';
  return `<div class="portfolio-popup"><div class="popup-brand">${logo}<div><div class="popup-title">${escapeHtml(company.name)}</div><div class="popup-meta">${escapeHtml(company.location || 'No location label')}</div></div></div><span class="popup-sector" style="background:${color}">${escapeHtml(company.sector)}</span><p>${escapeHtml(company.notes || 'No notes added.')}</p>${website}</div>`;
}

function fallbackLogo(name) {
  const initials = String(name || 'S').split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase();
  return `<span class="popup-logo-fallback">${escapeHtml(initials || 'S')}</span>`;
}

function showValidation() {
  const result = engine.validateCompanies ? engine.validateCompanies(companies) : { validRows: companies.length, missingCoordinates: 0, duplicateNames: 0 };
  alert(`Validation summary\nValid rows: ${result.validRows}\nMissing coordinates: ${result.missingCoordinates}\nDuplicate names: ${result.duplicateNames}`);
}

function readField(id) { return document.getElementById(id).value.trim(); }

function normaliseCompany(row) {
  const rawSector = row.sector || row.Sector || '';
  const sector = SECTORS[rawSector] ? rawSector : 'Other';
  return {
    name: row.name || row.Name || '',
    sector,
    lat: Number(row.lat || row.latitude || row.Latitude),
    lon: Number(row.lon || row.lng || row.longitude || row.Longitude),
    location: row.location || row.city || row.Location || '',
    website: row.website || row.Website || '',
    logo: row.logo || row.Logo || '',
    notes: row.notes || row.Notes || ''
  };
}

function isValidCompany(company) { return company.name && company.sector && Number.isFinite(company.lat) && Number.isFinite(company.lon); }

function parseCsv(text) {
  const lines = text.replace(/^\uFEFF/, '').trim().split(/\r?\n/);
  if (!lines.length || !lines[0]) return [];
  const headers = splitCsvLine(lines[0]);
  return lines.slice(1).filter(Boolean).map(line => {
    const values = splitCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] || '']));
  });
}

function splitCsvLine(line) {
  const output = [];
  let value = '', quoted = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i], next = line[i + 1];
    if (char === '"' && quoted && next === '"') { value += '"'; i++; continue; }
    if (char === '"') { quoted = !quoted; continue; }
    if (char === ',' && !quoted) { output.push(value); value = ''; continue; }
    value += char;
  }
  output.push(value);
  return output.map(item => item.trim());
}

function toCsv(rows) {
  const headers = ['name', 'sector', 'lat', 'lon', 'location', 'website', 'logo', 'notes'];
  const clean = value => `"${String(value ?? '').replaceAll('"', '""')}"`;
  return [headers.join(','), ...rows.map(row => headers.map(header => clean(row[header])).join(','))].join('\n');
}

function downloadCsv(rows) {
  const blob = new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = Object.assign(document.createElement('a'), { href: url, download: 'companies.csv' });
  link.click();
  URL.revokeObjectURL(url);
}

function importCsvFile(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    companies = parseCsv(reader.result).map(normaliseCompany).filter(isValidCompany);
    activeSectors = new Set(Object.keys(SECTORS));
    renderLayerControls();
    renderMap();
  };
  reader.readAsText(file);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
}

function fallbackCompanies() {
  return [
    { name: 'Example Investor', sector: 'Investor', lat: 40.7128, lon: -74.0060, location: 'New York City', website: '', logo: '', notes: 'Replace with live Seraphim investor records.' },
    { name: 'Example Institute', sector: 'Institute', lat: 42.4534, lon: -76.4735, location: 'Ithaca', website: '', logo: '', notes: 'University/institute layer example.' },
    { name: 'Example Startup', sector: 'Startup', lat: 43.1566, lon: -77.6088, location: 'Rochester', website: '', logo: '', notes: 'Startup/company layer example.' },
    { name: 'Example Infrastructure', sector: 'Infrastructure', lat: 43.0481, lon: -76.1474, location: 'Syracuse', website: '', logo: '', notes: 'Infrastructure/testbed layer example.' }
  ];
}

window.CompanyEngineFallback = {
  isWasm: false,
  validateCompanies(companies) {
    const seen = new Set();
    let duplicateNames = 0;
    let missingCoordinates = 0;
    companies.forEach(company => {
      const key = String(company.name || '').trim().toLowerCase();
      if (key && seen.has(key)) duplicateNames += 1;
      if (key) seen.add(key);
      if (!Number.isFinite(company.lat) || !Number.isFinite(company.lon)) missingCoordinates += 1;
    });
    return { validRows: companies.length - missingCoordinates, missingCoordinates, duplicateNames };
  }
};

window.loadCompanyEngine = async function loadCompanyEngine() {
  if (!window.CompanyEngine) return window.CompanyEngineFallback;
  try {
    const module = await window.CompanyEngine();
    if (!module || !module.ccall) return window.CompanyEngineFallback;
    return {
      isWasm: true,
      validateCompanies(companies) {
        const csv = companies.map(company => [company.name, company.sector, company.lat, company.lon].join(',')).join('\n');
        const missingCoordinates = module.ccall('count_missing_coordinates', 'number', ['string'], [csv]);
        const duplicateNames = module.ccall('count_duplicate_names', 'number', ['string'], [csv]);
        return { validRows: companies.length - missingCoordinates, missingCoordinates, duplicateNames };
      }
    };
  } catch (error) {
    console.warn('WebAssembly engine unavailable, using JavaScript fallback.', error);
    return window.CompanyEngineFallback;
  }
};

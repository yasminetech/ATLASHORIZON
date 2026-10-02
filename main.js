let currentLang = localStorage.getItem('ah_lang') || 'en';
window.currentLang = currentLang;

// Set & Switch Language (EN, FR, PT)
function setLanguage(lang) {
  if (!translations || !translations[lang]) return;
  currentLang = lang;
  window.currentLang = lang;
  localStorage.setItem('ah_lang', lang);
  document.documentElement.lang = lang;

  // Update button states
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.classList.remove('text-brand-copper', 'font-bold', 'underline');
    btn.classList.add('text-brand-whiteMuted');
    if (btn.getAttribute('data-lang') === lang) {
      btn.classList.add('text-brand-copper', 'font-bold');
      btn.classList.remove('text-brand-whiteMuted');
    }
  });

  // Translate text content
  document.querySelectorAll('[data-i18n]').forEach(elem => {
    const key = elem.getAttribute('data-i18n');
    if (translations[lang][key]) {
      elem.textContent = translations[lang][key];
    }
  });

  // Translate placeholders
  document.querySelectorAll('[data-i18n-ph]').forEach(elem => {
    const key = elem.getAttribute('data-i18n-ph');
    if (translations[lang][key]) {
      elem.placeholder = translations[lang][key];
    }
  });
}

// Service Preview Data Array for Editorial Hover Effect
const serviceData = [
  {
    image: 'assets/images/hero-site.jpg',
    tag: '01 / GENERAL CONSTRUCTION',
    desc: 'SITE EXECUTION & STRUCTURAL INTEGRITY — LISBON SITE A'
  },
  {
    image: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=1000&q=85',
    tag: '02 / STRUCTURAL RENOVATION',
    desc: 'ADAPTIVE REUSE & HISTORIC BEAM RETROFITTING'
  },
  {
    image: 'assets/images/project-rebar-mesh.jpg',
    tag: '03 / HEAVY FOUNDATIONS & REBAR',
    desc: 'POST-TENSIONED SLAB MATTING & STEEL MATRIX'
  },
  {
    image: 'assets/images/project-foundation.jpg',
    tag: '04 / COMMERCIAL TOWER INFRASTRUCTURE',
    desc: 'HIGH-RISE CORE & SUBTERRANEAN RETENTION'
  },
  {
    image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1000&q=85',
    tag: '05 / BESPOKE RESIDENTIAL VILLA',
    desc: 'LUXURY CUSTOM ARCHITECTURE & CANTILEVER ENCLOSURE'
  },
  {
    image: 'assets/images/detail-precision.jpg',
    tag: '06 / BIM SITE MANAGEMENT & INSPECTION',
    desc: 'REAL-TIME 4D COORDINATION & SPEC VERIFICATION'
  }
];

// Update Service Side Image Preview
function updateServicePreview(index) {
  const imgElem = document.getElementById('service-preview-img');
  const tagElem = document.getElementById('service-preview-tag');
  const descElem = document.getElementById('service-preview-desc');
  
  if (!imgElem || !serviceData[index]) return;

  imgElem.style.opacity = '0.4';
  
  setTimeout(() => {
    imgElem.src = serviceData[index].image;
    tagElem.textContent = serviceData[index].tag;
    descElem.textContent = serviceData[index].desc;
    imgElem.style.opacity = '1';
  }, 150);
}

// Project Filter Tabs Functionality
function filterProjects(category) {
  const projectItems = document.querySelectorAll('.project-item');
  const filterBtns = document.querySelectorAll('.project-filter-btn');

  filterBtns.forEach(btn => {
    btn.classList.remove('active-filter');
    if (btn.getAttribute('onclick').includes(`'${category}'`)) {
      btn.classList.add('active-filter');
    }
  });

  projectItems.forEach(item => {
    const itemCategory = item.getAttribute('data-category');
    if (category === 'all' || itemCategory === category) {
      item.style.display = 'block';
      item.classList.add('animate-fade-in');
    } else {
      item.style.display = 'none';
      item.classList.remove('animate-fade-in');
    }
  });
}

// Request a Quote Modal Controls
function openQuoteModal(defaultService = 'Construction') {
  const modal = document.getElementById('quote-modal');
  const selectElem = document.getElementById('modal-service');
  
  if (selectElem && defaultService) {
    selectElem.value = defaultService;
  }
  
  if (modal) {
    modal.classList.remove('opacity-0', 'pointer-events-none');
    document.body.style.overflow = 'hidden';
  }
}

function closeQuoteModal() {
  const modal = document.getElementById('quote-modal');
  if (modal) {
    modal.classList.add('opacity-0', 'pointer-events-none');
    document.body.style.overflow = 'auto';
    
    setTimeout(() => {
      document.getElementById('quote-modal-form')?.reset();
      document.getElementById('quote-modal-form')?.classList.remove('hidden');
      document.getElementById('quote-modal-success')?.classList.add('hidden');
    }, 300);
  }
}

function handleQuoteSubmit(event) {
  event.preventDefault();
  const form = document.getElementById('quote-modal-form');
  const successMsg = document.getElementById('quote-modal-success');
  
  if (window.ReservationStore) {
    const service = document.getElementById('modal-service')?.value || 'Construction';
    const area = document.getElementById('modal-area')?.value || 'N/A';
    const year = document.getElementById('modal-year')?.value || '2026';
    const clientName = document.getElementById('modal-name')?.value || 'Client Horizon';
    const email = document.getElementById('modal-email')?.value || '';
    const phone = document.getElementById('modal-phone')?.value || '';
    const desiredDate = document.getElementById('modal-date')?.value || (year + '-10-15');
    const desiredTime = document.getElementById('modal-time')?.value || '10:00';
    const notes = document.getElementById('modal-notes')?.value || '';

    ReservationStore.addReservation({
      clientName: clientName,
      email: email,
      phone: phone,
      service: service,
      desiredDate: desiredDate,
      desiredTime: desiredTime,
      location: 'Portugal / Belgium',
      area: area,
      message: notes || `Demande de devis pour projet ${service} (${area} m² - objectif ${year})`,
      lang: currentLang || 'en'
    });
  }

  if (form && successMsg) {
    form.classList.add('hidden');
    successMsg.classList.remove('hidden');
  }
}

// Contact Form Handler
function handleContactSubmit(event) {
  event.preventDefault();
  const form = document.getElementById('contact-form');
  const successView = document.getElementById('contact-success');
  
  if (window.ReservationStore) {
    const name = document.getElementById('contact-name')?.value || '';
    const email = document.getElementById('contact-email')?.value || '';
    const phone = document.getElementById('contact-phone')?.value || '';
    const service = document.getElementById('contact-type')?.value || 'General Contracting';
    const location = document.getElementById('contact-location')?.value || 'Portugal / Belgium';
    const message = document.getElementById('contact-message')?.value || '';

    ReservationStore.addReservation({
      clientName: name,
      email: email,
      phone: phone,
      service: service,
      desiredDate: '2026-10-15',
      desiredTime: '10:00',
      location: location,
      area: 'N/A',
      message: message,
      lang: currentLang || 'en'
    });
  }

  if (form && successView) {
    form.classList.add('hidden');
    successView.classList.remove('hidden');
  }
}

function resetContactForm() {
  const form = document.getElementById('contact-form');
  const successView = document.getElementById('contact-success');
  
  if (form && successView) {
    form.reset();
    form.classList.remove('hidden');
    successView.classList.add('hidden');
  }
}

// Mobile Menu Drawer Toggle
function toggleMobileMenu() {
  const menu = document.getElementById('mobile-menu');
  if (menu) {
    const isHidden = menu.classList.contains('opacity-0');
    if (isHidden) {
      menu.classList.remove('opacity-0', 'pointer-events-none', 'translate-y-4');
      document.body.style.overflow = 'hidden';
    } else {
      menu.classList.add('opacity-0', 'pointer-events-none', 'translate-y-4');
      document.body.style.overflow = 'auto';
    }
  }
}

// Lightbox Modal Controls
function openLightbox(src, caption) {
  const modal = document.getElementById('lightbox-modal');
  const img = document.getElementById('lightbox-img');
  const cap = document.getElementById('lightbox-caption');
  
  if (modal && img && cap) {
    img.src = src;
    cap.textContent = caption || 'ATLAS HORIZON ARCHITECTURAL ARCHIVE';
    modal.classList.remove('opacity-0', 'pointer-events-none');
    document.body.style.overflow = 'hidden';
  }
}

function closeLightbox() {
  const modal = document.getElementById('lightbox-modal');
  if (modal) {
    modal.classList.add('opacity-0', 'pointer-events-none');
    document.body.style.overflow = 'auto';
  }
}

// Header Scroll Glassmorphism Effect
window.addEventListener('scroll', () => {
  const header = document.getElementById('main-header');
  if (header) {
    if (window.scrollY > 40) {
      header.classList.add('shadow-xl', 'bg-brand-charcoal/95');
    } else {
      header.classList.remove('shadow-xl');
    }
  }
});

// Initialize Language on DOM Content Loaded
document.addEventListener('DOMContentLoaded', () => {
  setLanguage(currentLang);
});

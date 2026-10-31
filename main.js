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

// On-Site Field Footage & Video Theater Controls
const siteVideosData = [
  {
    src: 'assets/videos/video-excavation.mp4',
    poster: 'assets/videos/video-excavation-poster.jpg',
    category: 'civil',
    phaseKey: 'video1Phase',
    titleKey: 'video1Title',
    locKey: 'video1Loc',
    descKey: 'video1Desc',
    specsKey: 'video1Specs',
    defaultPhase: '01 // SUBSTRUCTURE',
    defaultTitle: 'Deep Excavation & Crane Logistics',
    defaultLoc: 'Lisbon Hub, Portugal',
    defaultDesc: 'Large-scale subterranean earthworks, perimeter retaining stabilization, and tower crane operations preparing the foundation bed.',
    defaultSpecs: 'Deep Excavation • Tower Crane • Retaining Embankments'
  },
  {
    src: 'assets/videos/video-formwork-rebar.mp4',
    poster: 'assets/videos/video-formwork-rebar-poster.jpg',
    category: 'civil',
    phaseKey: 'video2Phase',
    titleKey: 'video2Title',
    locKey: 'video2Loc',
    descKey: 'video2Desc',
    specsKey: 'video2Specs',
    defaultPhase: '02 // REINFORCEMENT',
    defaultTitle: 'Curved Formwork & Dense Rebar',
    defaultLoc: 'Cascais Coast, Portugal',
    defaultDesc: 'Complex curved timber shuttering and high-yield seismic steel reinforcement matrix inspected prior to concrete pour.',
    defaultSpecs: 'Bespoke Timber Forms • Seismic Rebar Matrix • Tolerance ±2mm'
  },
  {
    src: 'assets/videos/video-wall-shoring.mp4',
    poster: 'assets/videos/video-wall-shoring-poster.jpg',
    category: 'civil',
    phaseKey: 'video3Phase',
    titleKey: 'video3Title',
    locKey: 'video3Loc',
    descKey: 'video3Desc',
    specsKey: 'video3Specs',
    defaultPhase: '03 // SHUTTERING',
    defaultTitle: 'High-Wall Shuttering & Shoring',
    defaultLoc: 'Brussels Complex, Belgium',
    defaultDesc: 'High-load industrial wall formwork panels secured with adjustable telescopic red steel shoring struts for vertical wall casting.',
    defaultSpecs: 'Heavy Steel Props • Wall Formwork Panels • Laser Leveling'
  },
  {
    src: 'assets/videos/video-scaffolding-team.mp4',
    poster: 'assets/videos/video-scaffolding-team-poster.jpg',
    category: 'masonry',
    phaseKey: 'video4Phase',
    titleKey: 'video4Title',
    locKey: 'video4Loc',
    descKey: 'video4Desc',
    specsKey: 'video4Specs',
    defaultPhase: '04 // STAGING & TEAM',
    defaultTitle: 'Scaffolding Assembly & Masonry Staging',
    defaultLoc: 'Vila Nova Industrial Hub, Portugal',
    defaultDesc: 'Coordinated site crew erecting modular heavy staging platforms and safety planks to enable high-wall blockwork.',
    defaultSpecs: 'Modular Scaffolding • Team Staging • Safety Certified'
  },
  {
    src: 'assets/videos/video-logistics-hall.mp4',
    poster: 'assets/videos/video-logistics-hall-poster.jpg',
    category: 'masonry',
    phaseKey: 'video5Phase',
    titleKey: 'video5Title',
    locKey: 'video5Loc',
    descKey: 'video5Desc',
    specsKey: 'video5Specs',
    defaultPhase: '05 // COMMERCIAL STRUCTURE',
    defaultTitle: 'Logistics Warehouse & Hall Assembly',
    defaultLoc: 'Braga Industrial Hub, Portugal',
    defaultDesc: 'Panoramic view of active logistics warehouse construction with material distribution, workers, and aerial cranes.',
    defaultSpecs: 'Precast Concrete Pillars • Hall Distribution • Industrial Scale'
  },
  {
    src: 'assets/videos/video-industrial-facility.mp4',
    poster: 'assets/videos/video-industrial-facility-poster.jpg',
    category: 'masonry',
    phaseKey: 'video6Phase',
    titleKey: 'video6Title',
    locKey: 'video6Loc',
    descKey: 'video6Desc',
    specsKey: 'video6Specs',
    defaultPhase: '06 // PRECAST & MATERIALS',
    defaultTitle: 'Precast Structure & Concrete Block Reserve',
    defaultLoc: 'Industrial Logistics Center, Portugal',
    defaultDesc: '4K detailed inspection of high-yield precast concrete columns, perimeter enclosure beams, and certified masonry units.',
    defaultSpecs: 'High-Strength Concrete Blocks • Precast Grid • Material Pallets'
  },
  {
    src: 'assets/videos/video-masonry-hall.mp4',
    poster: 'assets/videos/video-masonry-hall-poster.jpg',
    category: 'masonry',
    phaseKey: 'video7Phase',
    titleKey: 'video7Title',
    locKey: 'video7Loc',
    descKey: 'video7Desc',
    specsKey: 'video7Specs',
    defaultPhase: '07 // MASONRY EXECUTION',
    defaultTitle: 'Interior Partition Wall Walkthrough',
    defaultLoc: 'Industrial Facility, Portugal',
    defaultDesc: 'Continuous tracking inspection of reinforced concrete masonry dividing walls built to strict fire-separation standards.',
    defaultSpecs: 'Fire-Rated Blockwork • Acoustic Partition • Continuous Inspection'
  },
  {
    src: 'assets/videos/video-block-precision.mp4',
    poster: 'assets/videos/video-block-precision-poster.jpg',
    category: 'masonry',
    phaseKey: 'video8Phase',
    titleKey: 'video8Title',
    locKey: 'video8Loc',
    descKey: 'video8Desc',
    specsKey: 'video8Specs',
    defaultPhase: '08 // CRAFTSMANSHIP',
    defaultTitle: 'Mortar Tooling & Block Joint Precision',
    defaultLoc: 'Industrial Facility, Portugal',
    defaultDesc: 'Close-up craftsmanship showing master mason tooling mortar joints to achieve sub-millimeter horizontal uniformity.',
    defaultSpecs: 'Hand-Tooled Joints • Laser Alignment • Certified Masonry'
  },
  {
    src: 'assets/videos/video-masonry-pan.mp4',
    poster: 'assets/videos/video-masonry-pan-poster.jpg',
    category: 'masonry',
    phaseKey: 'video9Phase',
    titleKey: 'video9Title',
    locKey: 'video9Loc',
    descKey: 'video9Desc',
    specsKey: 'video9Specs',
    defaultPhase: '09 // STRUCTURAL WALL',
    defaultTitle: 'Extended Dividing Wall & Alignment Pan',
    defaultLoc: 'Industrial Logistics Hub, Portugal',
    defaultDesc: 'Full architectural elevation tracking the long industrial concrete block wall along the warehouse floor.',
    defaultSpecs: 'Long-Span Partition • Structural Plumb • Seismic Tie-in'
  }
];

let activeModalVideoIndex = 0;

function filterVideos(category) {
  const cards = document.querySelectorAll('.site-video-card');
  const btns = document.querySelectorAll('.video-filter-btn');

  btns.forEach(btn => {
    btn.classList.remove('active-filter', 'bg-brand-copper', 'border-brand-copper', 'text-white');
    btn.classList.add('border-white/10', 'text-brand-whiteMuted');
    if (btn.getAttribute('onclick')?.includes(`'${category}'`)) {
      btn.classList.add('active-filter', 'bg-brand-copper', 'border-brand-copper', 'text-white');
      btn.classList.remove('border-white/10', 'text-brand-whiteMuted');
    }
  });

  cards.forEach(card => {
    const itemCat = card.getAttribute('data-video-category');
    if (category === 'all' || itemCat === category) {
      card.style.display = 'flex';
      card.classList.add('animate-fade-in');
    } else {
      card.style.display = 'none';
      card.classList.remove('animate-fade-in');
      const v = card.querySelector('video');
      if (v && !v.paused) {
        v.pause();
        card.querySelector('.video-play-icon')?.classList.remove('hidden');
        card.querySelector('.video-pause-icon')?.classList.add('hidden');
        card.querySelector('.video-play-btn')?.classList.remove('opacity-0');
      }
    }
  });
}

function toggleVideoPlayback(index) {
  const video = document.getElementById(`site-video-${index}`);
  const card = document.querySelector(`.site-video-card[data-video-index="${index}"]`);
  if (!video || !card) return;

  const playIcon = card.querySelector('.video-play-icon');
  const pauseIcon = card.querySelector('.video-pause-icon');
  const playBtn = card.querySelector('.video-play-btn');

  // Pause all other inline videos
  siteVideosData.forEach((_, i) => {
    if (i !== index) {
      const otherVid = document.getElementById(`site-video-${i}`);
      const otherCard = document.querySelector(`.site-video-card[data-video-index="${i}"]`);
      if (otherVid && !otherVid.paused) {
        otherVid.pause();
        if (otherCard) {
          otherCard.querySelector('.video-play-icon')?.classList.remove('hidden');
          otherCard.querySelector('.video-pause-icon')?.classList.add('hidden');
          otherCard.querySelector('.video-play-btn')?.classList.remove('opacity-0');
        }
      }
    }
  });

  if (video.paused) {
    video.play().then(() => {
      playIcon?.classList.add('hidden');
      pauseIcon?.classList.remove('hidden');
      playBtn?.classList.add('opacity-0', 'group-hover:opacity-100');
    }).catch(err => {
      console.warn("Autoplay note:", err);
    });
  } else {
    video.pause();
    playIcon?.classList.remove('hidden');
    pauseIcon?.classList.add('hidden');
    playBtn?.classList.remove('opacity-0');
  }
}

function toggleVideoSound(index, event) {
  if (event) event.stopPropagation();
  const video = document.getElementById(`site-video-${index}`);
  const card = document.querySelector(`.site-video-card[data-video-index="${index}"]`);
  if (!video || !card) return;

  video.muted = !video.muted;
  const mutedIcon = card.querySelector('.video-muted-icon');
  const unmutedIcon = card.querySelector('.video-unmuted-icon');

  if (video.muted) {
    mutedIcon?.classList.remove('hidden');
    unmutedIcon?.classList.add('hidden');
  } else {
    mutedIcon?.classList.add('hidden');
    unmutedIcon?.classList.remove('hidden');
    if (video.paused) {
      toggleVideoPlayback(index);
    }
  }
}

function initVideoProgressListeners() {
  siteVideosData.forEach((_, index) => {
    const video = document.getElementById(`site-video-${index}`);
    const progress = document.getElementById(`video-progress-${index}`);
    const card = document.querySelector(`.site-video-card[data-video-index="${index}"]`);
    if (!video || !progress) return;

    video.addEventListener('timeupdate', () => {
      if (video.duration) {
        const percent = (video.currentTime / video.duration) * 100;
        progress.style.width = `${percent}%`;
      }
    });

    video.addEventListener('ended', () => {
      if (card) {
        card.querySelector('.video-play-icon')?.classList.remove('hidden');
        card.querySelector('.video-pause-icon')?.classList.add('hidden');
        card.querySelector('.video-play-btn')?.classList.remove('opacity-0');
      }
      progress.style.width = '0%';
    });
  });
}

function openVideoModal(index, event) {
  if (event) event.stopPropagation();
  activeModalVideoIndex = index;
  const modal = document.getElementById('video-theater-modal');
  const modalVideo = document.getElementById('modal-active-video');
  if (!modal || !modalVideo) return;

  // Pause all inline videos
  siteVideosData.forEach((_, i) => {
    const vid = document.getElementById(`site-video-${i}`);
    if (vid && !vid.paused) {
      vid.pause();
      const card = document.querySelector(`.site-video-card[data-video-index="${i}"]`);
      if (card) {
        card.querySelector('.video-play-icon')?.classList.remove('hidden');
        card.querySelector('.video-pause-icon')?.classList.add('hidden');
        card.querySelector('.video-play-btn')?.classList.remove('opacity-0');
      }
    }
  });

  updateVideoModalContent(index);
  modal.classList.remove('opacity-0', 'pointer-events-none');
  document.body.style.overflow = 'hidden';

  modalVideo.src = siteVideosData[index].src;
  modalVideo.poster = siteVideosData[index].poster;
  modalVideo.currentTime = 0;
  modalVideo.play().catch(e => console.log('Autoplay handled:', e));
}

function updateVideoModalContent(index) {
  const data = siteVideosData[index];
  if (!data) return;

  const lang = window.currentLang || 'en';
  const t = (window.translations && window.translations[lang]) ? window.translations[lang] : {};

  const phaseElem = document.getElementById('modal-video-phase');
  const locElem = document.getElementById('modal-video-location');
  const titleElem = document.getElementById('modal-video-title');
  const descElem = document.getElementById('modal-video-desc');
  const specsElem = document.getElementById('modal-video-specs');
  const counterElem = document.getElementById('modal-video-counter');

  if (phaseElem) phaseElem.textContent = t[data.phaseKey] || data.defaultPhase;
  if (locElem) locElem.textContent = t[data.locKey] || data.defaultLoc;
  if (titleElem) titleElem.textContent = t[data.titleKey] || data.defaultTitle;
  if (descElem) descElem.textContent = t[data.descKey] || data.defaultDesc;
  if (specsElem) specsElem.textContent = t[data.specsKey] || data.defaultSpecs;
  if (counterElem) counterElem.textContent = `${index + 1} / ${siteVideosData.length}`;
}

function navigateVideoModal(direction) {
  let nextIndex = activeModalVideoIndex + direction;
  if (nextIndex < 0) nextIndex = siteVideosData.length - 1;
  if (nextIndex >= siteVideosData.length) nextIndex = 0;
  openVideoModal(nextIndex);
}

function closeVideoModal() {
  const modal = document.getElementById('video-theater-modal');
  const modalVideo = document.getElementById('modal-active-video');
  if (modalVideo) {
    modalVideo.pause();
    modalVideo.src = '';
  }
  if (modal) {
    modal.classList.add('opacity-0', 'pointer-events-none');
    document.body.style.overflow = 'auto';
  }
}

// Global Keyboard Listeners
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeVideoModal();
    closeLightbox();
    closeQuoteModal();
  } else if (e.key === 'ArrowLeft') {
    const modal = document.getElementById('video-theater-modal');
    if (modal && !modal.classList.contains('opacity-0')) {
      navigateVideoModal(-1);
    }
  } else if (e.key === 'ArrowRight') {
    const modal = document.getElementById('video-theater-modal');
    if (modal && !modal.classList.contains('opacity-0')) {
      navigateVideoModal(1);
    }
  }
});

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

// Initialize Language & Video Listeners on DOM Content Loaded
document.addEventListener('DOMContentLoaded', () => {
  setLanguage(currentLang);
  initVideoProgressListeners();
  if (window.lucide) {
    lucide.createIcons();
  }
});

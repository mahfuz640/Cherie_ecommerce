import { useCallback, useEffect, useRef, useState } from 'react';
import { api, apiImg } from '../api';
import { storeUpdateAffects, useStoreUpdates } from '../realtime';
import './Hero.css';

const defaults = {
  eyebrow: 'CHERIE COLLECTION',
  heading: 'Made to be beloved always.',
  description: 'Discover a piece made for your story.',
  visible: true
};

const carouselDefaults = {
  autoSlideSeconds: 5,
  fixedSlideId: null,
  transitionEffect: 'fade',
  transitionDurationMs: 800
};

const transitionDurationLimits = { min: 150, max: 5000 };

const transitionEffects = new Set([
  'slide-left', 'slide-right', 'slide-up', 'slide-down', 'push-left', 'push-right', 'push-up', 'push-down',
  'fade', 'cross-fade', 'zoom-in', 'zoom-out', 'zoom-blur', 'pan-left', 'pan-right', 'pan-up', 'pan-down',
  'swipe-left', 'swipe-right', 'wipe-left', 'wipe-right', 'wipe-up', 'wipe-down', 'rotate', 'flip-horizontal', 'flip-vertical',
  'cube-left', 'cube-right', 'page-turn', 'roll', 'stretch', 'shrink', 'blur-transition', 'flash', 'glitch', 'light-leak',
  'radial-wipe', 'circle-open', 'circle-close', 'split-horizontal', 'split-vertical', 'curtain', 'shutter', 'ripple', 'wave', 'morph'
]);

const legacyTransitionEffects = { slide: 'slide-left', zoom: 'zoom-out', reveal: 'wipe-right' };

const normalizeTransitionEffect = value => transitionEffects.has(value) ? value : (legacyTransitionEffects[value] || carouselDefaults.transitionEffect);
const normalizeTransitionDuration = value => {
  const duration = Number(value);
  return Number.isInteger(duration) && duration >= transitionDurationLimits.min && duration <= transitionDurationLimits.max
    ? duration
    : carouselDefaults.transitionDurationMs;
};
const normaliseIndex = (value, length) => length ? ((Number(value) % length) + length) % length : 0;

function carouselSettingsFrom(data) {
  const seconds = Number(data?.autoSlideSeconds);
  return {
    autoSlideSeconds: Number.isFinite(seconds) && seconds >= 1 && seconds <= 3600 ? seconds : carouselDefaults.autoSlideSeconds,
    fixedSlideId: typeof data?.fixedSlideId === 'string' && data.fixedSlideId ? data.fixedSlideId : null,
    transitionEffect: normalizeTransitionEffect(data?.transitionEffect),
    transitionDurationMs: normalizeTransitionDuration(data?.transitionDurationMs)
  };
}

function CollectionHeroCopy({ settings, carousel = false, link = '#collection' }) {
  if (!settings.visible) return null;
  return <div className={carousel ? 'carousel-copy' : 'collection-hero-copy'}>
    <p className="eyebrow">{settings.eyebrow}</p>
    <h1>{settings.heading}</h1>
    <p>{settings.description}</p>
    <a href={link} className="button">Explore collection</a>
  </div>;
}

export default function Hero() {
  const [slides, setSlides] = useState([]);
  const [index, setIndex] = useState(0);
  const [settings, setSettings] = useState(defaults);
  const [carouselSettings, setCarouselSettings] = useState(carouselDefaults);
  const [failedSlideIds, setFailedSlideIds] = useState([]);
  const [slideDirection, setSlideDirection] = useState('forward');
  const [outgoingSlide, setOutgoingSlide] = useState(null);
  const [transitionKey, setTransitionKey] = useState(0);
  const [mobileMediaAspectRatio, setMobileMediaAspectRatio] = useState(null);
  const activeIndexRef = useRef(0);
  const transitionKeyRef = useRef(0);
  const availableSlidesRef = useRef([]);
  const fixedSlideRef = useRef(null);

  const availableSlides = slides.filter(slide => !failedSlideIds.includes(slide._id));
  const fixedSlide = carouselSettings.fixedSlideId ? availableSlides.find(slide => String(slide._id) === String(carouselSettings.fixedSlideId)) : null;
  const displaySlides = fixedSlide ? [fixedSlide] : availableSlides;
  const fixedSlideId = fixedSlide?._id || '';

  // Refs let fast arrow/dot clicks always transition from the image that is
  // currently on screen, rather than a stale render's index.
  availableSlidesRef.current = availableSlides;
  fixedSlideRef.current = fixedSlide;

  const loadSlides = useCallback(() => api('/api/carousel').then(data => {
    setSlides(data);
    setFailedSlideIds([]);
  }).catch(() => setSlides([])), []);
  const loadCollectionHero = useCallback(() => api('/api/collection-hero').then(data => {
    setSettings({ ...defaults, ...data });
  }).catch(() => {}), []);
  const loadCarouselSettings = useCallback(() => api('/api/carousel/settings').then(data => {
    setCarouselSettings(carouselSettingsFrom(data));
  }).catch(() => {}), []);

  const clearOutgoingSlide = useCallback(token => {
    setOutgoingSlide(current => current?.token === token ? null : current);
  }, []);

  const startTransition = useCallback((requestedIndex, direction = 'forward') => {
    const currentSlides = fixedSlideRef.current ? [fixedSlideRef.current] : availableSlidesRef.current;
    if (!currentSlides.length) return;

    const fromIndex = normaliseIndex(activeIndexRef.current, currentSlides.length);
    const toIndex = normaliseIndex(requestedIndex, currentSlides.length);
    const fromSlide = currentSlides[fromIndex];
    const toSlide = currentSlides[toIndex];
    if (!toSlide) return;

    activeIndexRef.current = toIndex;
    setSlideDirection(direction);
    if (!fromSlide || String(fromSlide._id) === String(toSlide._id)) {
      setOutgoingSlide(null);
      setIndex(toIndex);
      return;
    }

    const token = transitionKeyRef.current + 1;
    transitionKeyRef.current = token;
    setOutgoingSlide({ slide: fromSlide, direction, token });
    setTransitionKey(token);
    setIndex(toIndex);
  }, []);

  useEffect(() => {
    loadSlides();
    loadCollectionHero();
    loadCarouselSettings();
  }, [loadCarouselSettings, loadCollectionHero, loadSlides]);
  useStoreUpdates(useCallback(update => {
    if (storeUpdateAffects(update, 'carousel')) {
      loadSlides();
      loadCarouselSettings();
    }
    if (storeUpdateAffects(update, 'carouselSettings')) loadCarouselSettings();
    if (storeUpdateAffects(update, 'collectionHero')) loadCollectionHero();
  }, [loadCarouselSettings, loadCollectionHero, loadSlides]));

  useEffect(() => {
    if (!displaySlides.length) {
      activeIndexRef.current = 0;
      setIndex(0);
      setOutgoingSlide(null);
      return;
    }

    const activeIndex = normaliseIndex(index, displaySlides.length);
    activeIndexRef.current = activeIndex;
    if (activeIndex !== index) setIndex(activeIndex);
  }, [displaySlides.length, index]);

  useEffect(() => {
    if (fixedSlideId) {
      activeIndexRef.current = 0;
      setIndex(0);
      setOutgoingSlide(null);
      return undefined;
    }
    if (availableSlides.length < 2) return undefined;

    const timer = setInterval(() => {
      startTransition(activeIndexRef.current + 1, 'forward');
    }, carouselSettings.autoSlideSeconds * 1000);
    return () => clearInterval(timer);
  }, [availableSlides.length, carouselSettings.autoSlideSeconds, fixedSlideId, startTransition]);

  // CSS animation events are the fast path. This fallback clears an old layer
  // if motion is disabled or a browser cancels an animation mid-flight.
  useEffect(() => {
    if (!outgoingSlide) return undefined;
    const timer = window.setTimeout(() => clearOutgoingSlide(outgoingSlide.token), Math.max(carouselSettings.transitionDurationMs + 200, 400));
    return () => window.clearTimeout(timer);
  }, [carouselSettings.transitionDurationMs, clearOutgoingSlide, outgoingSlide]);

  if (!displaySlides.length) return <section className="hero"><CollectionHeroCopy settings={settings} /><div className="hero-orb" aria-hidden="true">&#10022;<small>EVERLASTING<br />ELEGANCE</small></div></section>;

  const activeIndex = normaliseIndex(index, displaySlides.length);
  const slide = displaySlides[activeIndex];
  const markImageFailed = id => {
    setFailedSlideIds(current => current.includes(id) ? current : [...current, id]);
    setOutgoingSlide(null);
  };
  // Mobile keeps one stable media canvas between slides. If the next image is
  // still decoding (or has a different ratio), it cannot collapse the hero and
  // flash the content below it. `contain` in CSS keeps every image uncropped.
  const rememberMobileMediaAspectRatio = event => {
    const { naturalHeight, naturalWidth } = event.currentTarget;
    if (!naturalWidth || !naturalHeight) return;
    setMobileMediaAspectRatio(current => current || `${naturalWidth} / ${naturalHeight}`);
  };
  const showControls = !fixedSlide && availableSlides.length > 1;
  const showPrevious = () => startTransition(activeIndexRef.current - 1, 'backward');
  const showNext = () => startTransition(activeIndexRef.current + 1, 'forward');
  const showSelected = slideIndex => startTransition(slideIndex, slideIndex < activeIndexRef.current ? 'backward' : 'forward');
  const transitionClass = `carousel-image--${carouselSettings.transitionEffect} carousel-image--${slideDirection}`;
  const activeOutgoingSlide = outgoingSlide?.token === transitionKey && String(outgoingSlide.slide?._id) !== String(slide._id) ? outgoingSlide : null;
  const transitionStyle = {
    '--carousel-transition-duration': `${carouselSettings.transitionDurationMs}ms`,
    ...(mobileMediaAspectRatio ? { '--carousel-mobile-aspect-ratio': mobileMediaAspectRatio } : {})
  };

  return <section className={`hero carousel${fixedSlide ? ' carousel--fixed' : ''}`}>
    <div className={`carousel-media carousel-media--${carouselSettings.transitionEffect}`} style={transitionStyle}>
      {activeOutgoingSlide && <img key={`outgoing-${activeOutgoingSlide.slide._id}-${activeOutgoingSlide.token}`} className={`carousel-image carousel-image--outgoing carousel-image--${carouselSettings.transitionEffect} carousel-image--${activeOutgoingSlide.direction}`} src={apiImg(activeOutgoingSlide.slide.image)} alt="" aria-hidden="true" onError={() => markImageFailed(activeOutgoingSlide.slide._id)} />}
      <img key={`incoming-${slide._id}-${carouselSettings.transitionEffect}-${slideDirection}-${transitionKey}`} className={`carousel-image carousel-image--incoming ${transitionClass}`} src={apiImg(slide.image)} alt={slide.title || 'Cherie collection'} onLoad={rememberMobileMediaAspectRatio} onAnimationEnd={() => clearOutgoingSlide(transitionKey)} onError={() => markImageFailed(slide._id)} />
    </div>
    <div className="carousel-overlay" />
    <CollectionHeroCopy settings={settings} carousel link={slide.link || '#collection'} />
    {showControls && <><button className="carousel-arrow previous" onClick={showPrevious} aria-label="Previous slide">&#8249;</button><button className="carousel-arrow next" onClick={showNext} aria-label="Next slide">&#8250;</button><div className="carousel-dots">{availableSlides.map((slideItem, slideIndex) => <button key={slideItem._id} className={slideIndex === activeIndex ? 'active' : ''} onClick={() => showSelected(slideIndex)} aria-label={`Show slide ${slideIndex + 1}`} />)}</div></>}
  </section>;
}

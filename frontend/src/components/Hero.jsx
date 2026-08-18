import { useEffect, useState } from 'react';
import { api, apiImg } from '../api';
import './Hero.css';

const defaults = {
  eyebrow: 'CHERIE COLLECTION',
  heading: 'Made to be beloved always.',
  description: 'Discover a piece made for your story.',
  visible: true
};

const carouselDefaults = {
  autoSlideSeconds: 5,
  fixedSlideId: null
};

function carouselSettingsFrom(data) {
  const seconds = Number(data?.autoSlideSeconds);
  return {
    autoSlideSeconds: Number.isFinite(seconds) && seconds >= 1 && seconds <= 3600 ? seconds : carouselDefaults.autoSlideSeconds,
    fixedSlideId: typeof data?.fixedSlideId === 'string' && data.fixedSlideId ? data.fixedSlideId : null
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
  const [slides, setSlides] = useState([]), [index, setIndex] = useState(0), [settings, setSettings] = useState(defaults), [carouselSettings, setCarouselSettings] = useState(carouselDefaults), [failedSlideIds, setFailedSlideIds] = useState([]);
  const availableSlides = slides.filter(slide => !failedSlideIds.includes(slide._id));
  const fixedSlide = carouselSettings.fixedSlideId ? availableSlides.find(slide => String(slide._id) === String(carouselSettings.fixedSlideId)) : null;
  const displaySlides = fixedSlide ? [fixedSlide] : availableSlides;

  useEffect(() => {
    let active = true;
    api('/api/carousel').then(data => { if (active) setSlides(data); }).catch(() => { if (active) setSlides([]); });
    api('/api/collection-hero').then(data => { if (active) setSettings({ ...defaults, ...data }); }).catch(() => {});
    api('/api/carousel/settings').then(data => { if (active) setCarouselSettings(carouselSettingsFrom(data)); }).catch(() => {});
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (fixedSlide) {
      setIndex(0);
      return undefined;
    }
    if (availableSlides.length < 2) return undefined;
    const timer = setInterval(() => setIndex(current => (current + 1) % availableSlides.length), carouselSettings.autoSlideSeconds * 1000);
    return () => clearInterval(timer);
  }, [availableSlides.length, carouselSettings.autoSlideSeconds, fixedSlide]);

  if (!displaySlides.length) return <section className="hero"><CollectionHeroCopy settings={settings} /><div className="hero-orb" aria-hidden="true">&#10022;<small>EVERLASTING<br />ELEGANCE</small></div></section>;

  const activeIndex = index % displaySlides.length;
  const slide = displaySlides[activeIndex];
  const markImageFailed = id => setFailedSlideIds(current => current.includes(id) ? current : [...current, id]);
  const showControls = !fixedSlide && availableSlides.length > 1;
  return <section className={`hero carousel${fixedSlide ? ' carousel--fixed' : ''}`}><img className="carousel-image" src={apiImg(slide.image)} alt={slide.title || 'Cherie collection'} onError={() => markImageFailed(slide._id)} /><div className="carousel-overlay" /><CollectionHeroCopy settings={settings} carousel link={slide.link || '#collection'} />{showControls && <><button className="carousel-arrow previous" onClick={() => setIndex(current => (current - 1 + availableSlides.length) % availableSlides.length)} aria-label="Previous slide">&#8249;</button><button className="carousel-arrow next" onClick={() => setIndex(current => (current + 1) % availableSlides.length)} aria-label="Next slide">&#8250;</button><div className="carousel-dots">{availableSlides.map((slideItem, slideIndex) => <button key={slideItem._id} className={slideIndex === activeIndex ? 'active' : ''} onClick={() => setIndex(slideIndex)} aria-label={`Show slide ${slideIndex + 1}`} />)}</div></>}</section>;
}

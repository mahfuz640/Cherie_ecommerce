import { useEffect, useState } from 'react';
import { api, apiImg } from '../api';

export default function Hero() {
  const [slides, setSlides] = useState([]), [index, setIndex] = useState(0);
  useEffect(() => { api('/api/carousel').then(setSlides).catch(() => setSlides([])); }, []);
  useEffect(() => {
    if (slides.length < 2) return undefined;
    const timer = setInterval(() => setIndex(current => (current + 1) % slides.length), 5000);
    return () => clearInterval(timer);
  }, [slides.length]);
  if (!slides.length) return <section className="hero"><div><p className="eyebrow">CHERIE FINE JEWELLERY</p><h1>Made to be<br /><i>beloved always.</i></h1><p>Graceful pieces to carry your story - today and forever.</p><a href="#collection" className="button">Explore collection</a></div><div className="hero-orb">✦<small>EVERLASTING<br />ELEGANCE</small></div></section>;
  const slide = slides[index % slides.length];
  return <section className="hero carousel"><img className="carousel-image" src={apiImg(slide.image)} alt={slide.title || 'Cherie collection'} /><div className="carousel-overlay" /><div className="carousel-copy"><p className="eyebrow">CHERIE COLLECTION</p><h1>{slide.title || 'Made to be beloved always.'}</h1><p>{slide.subtitle || 'Discover a piece made for your story.'}</p><a href={slide.link || '#collection'} className="button">Explore collection</a></div>{slides.length > 1 && <><button className="carousel-arrow previous" onClick={() => setIndex(current => (current - 1 + slides.length) % slides.length)} aria-label="Previous slide">‹</button><button className="carousel-arrow next" onClick={() => setIndex(current => (current + 1) % slides.length)} aria-label="Next slide">›</button><div className="carousel-dots">{slides.map((slideItem, slideIndex) => <button key={slideItem._id} className={slideIndex === index ? 'active' : ''} onClick={() => setIndex(slideIndex)} aria-label={`Show slide ${slideIndex + 1}`} />)}</div></>}</section>;
}

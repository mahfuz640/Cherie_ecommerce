import './CarouselSettingsForm.css';

const defaults = {
  autoSlideSeconds: 5,
  fixedSlideId: '',
  transitionEffect: 'fade',
  transitionDurationMs: 800
};

const transitionDurationLimits = { min: 150, max: 5000 };

const transitionEffectGroups = [
  ['Directional', [
    ['slide-left', 'Slide left'], ['slide-right', 'Slide right'], ['slide-up', 'Slide up'], ['slide-down', 'Slide down'],
    ['push-left', 'Push left'], ['push-right', 'Push right'], ['push-up', 'Push up'], ['push-down', 'Push down']
  ]],
  ['Soft & focus', [
    ['fade', 'Fade'], ['cross-fade', 'Cross-fade'], ['zoom-in', 'Zoom in'], ['zoom-out', 'Zoom out'], ['zoom-blur', 'Zoom blur'],
    ['pan-left', 'Pan left'], ['pan-right', 'Pan right'], ['pan-up', 'Pan up'], ['pan-down', 'Pan down']
  ]],
  ['Wipes & reveals', [
    ['swipe-left', 'Swipe left'], ['swipe-right', 'Swipe right'], ['wipe-left', 'Wipe left'], ['wipe-right', 'Wipe right'],
    ['wipe-up', 'Wipe up'], ['wipe-down', 'Wipe down'], ['radial-wipe', 'Radial wipe'], ['circle-open', 'Circle open'], ['circle-close', 'Circle close'],
    ['split-horizontal', 'Split horizontal'], ['split-vertical', 'Split vertical'], ['curtain', 'Curtain'], ['shutter', 'Shutter']
  ]],
  ['3D & shape', [
    ['rotate', 'Rotate'], ['flip-horizontal', 'Flip horizontal'], ['flip-vertical', 'Flip vertical'], ['cube-left', 'Cube left'], ['cube-right', 'Cube right'],
    ['page-turn', 'Page turn'], ['roll', 'Roll'], ['stretch', 'Stretch'], ['shrink', 'Shrink'], ['ripple', 'Ripple'], ['wave', 'Wave'], ['morph', 'Morph']
  ]],
  ['Stylized', [
    ['blur-transition', 'Blur transition'], ['flash', 'Flash'], ['glitch', 'Glitch'], ['light-leak', 'Light leak']
  ]]
];

const legacyEffects = { slide: 'slide-left', zoom: 'zoom-out', reveal: 'wipe-right' };
const transitionEffects = new Set(transitionEffectGroups.flatMap(([, effects]) => effects.map(([value]) => value)));
const normalizeTransitionEffect = value => transitionEffects.has(value) ? value : (legacyEffects[value] || defaults.transitionEffect);
const normalizeTransitionDuration = value => {
  const duration = Number(value);
  return Number.isInteger(duration) && duration >= transitionDurationLimits.min && duration <= transitionDurationLimits.max
    ? duration
    : defaults.transitionDurationMs;
};

export default function CarouselSettingsForm({ settings, slides, onSave }) {
  const transitionEffect = normalizeTransitionEffect(settings?.transitionEffect);
  const transitionDurationMs = normalizeTransitionDuration(settings?.transitionDurationMs);
  const values = { ...defaults, ...settings, fixedSlideId: settings?.fixedSlideId || '', transitionEffect, transitionDurationMs };
  const formKey = `${values.autoSlideSeconds}|${values.fixedSlideId}|${values.transitionEffect}|${values.transitionDurationMs}|${slides.map(slide => slide._id).join('|')}`;

  return <section className="admin-form carousel-settings-form">
    <p className="eyebrow">CAROUSEL CONTROLS</p>
    <h2>Timing &amp; fixed image</h2>
    <p className="form-intro">Choose how many seconds each carousel image stays on screen, the entrance style for each new image, or a fixed image to pause the carousel.</p>
    <form key={formKey} onSubmit={onSave}>
      <label>
        Auto-slide time (seconds)
        <input name="autoSlideSeconds" type="number" min="1" max="3600" step="1" required defaultValue={values.autoSlideSeconds} />
      </label>
      <label>
        Fixed carousel image
        <select name="fixedSlideId" defaultValue={values.fixedSlideId} disabled={!slides.length}>
          <option value="">No fixed image — rotate automatically</option>
          {slides.map((slide, index) => <option key={slide._id} value={slide._id}>{slide.title || `Carousel image ${index + 1}`}</option>)}
        </select>
      </label>
      <label className="carousel-transition-field">
        Image transition effect
        <select name="transitionEffect" defaultValue={values.transitionEffect}>
          {transitionEffectGroups.map(([group, effects]) => <optgroup key={group} label={group}>{effects.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</optgroup>)}
        </select>
      </label>
      <label className="carousel-transition-speed-field">
        Transition speed (milliseconds)
        <input name="transitionDurationMs" type="number" min={transitionDurationLimits.min} max={transitionDurationLimits.max} step="1" required defaultValue={values.transitionDurationMs} />
      </label>
      <p className="carousel-settings-note">A fixed image turns off auto-slide, arrows, and dots until you choose automatic rotation again. The selected transition is used whenever the carousel changes images. Use 150–5000 ms for the transition speed; 800 ms is the balanced default.</p>
      <button className="button">Save carousel controls</button>
    </form>
  </section>;
}

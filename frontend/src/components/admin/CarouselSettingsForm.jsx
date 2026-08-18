import './CarouselSettingsForm.css';

const defaults = {
  autoSlideSeconds: 5,
  fixedSlideId: ''
};

export default function CarouselSettingsForm({ settings, slides, onSave }) {
  const values = { ...defaults, ...settings, fixedSlideId: settings?.fixedSlideId || '' };
  const formKey = `${values.autoSlideSeconds}|${values.fixedSlideId}|${slides.map(slide => slide._id).join('|')}`;

  return <section className="admin-form carousel-settings-form">
    <p className="eyebrow">CAROUSEL CONTROLS</p>
    <h2>Timing &amp; fixed image</h2>
    <p className="form-intro">Choose how many seconds each carousel image stays on screen. Select a fixed image if you want to pause the carousel and show only that image.</p>
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
      <p className="carousel-settings-note">A fixed image turns off auto-slide, arrows, and dots until you choose automatic rotation again.</p>
      <button className="button">Save carousel controls</button>
    </form>
  </section>;
}

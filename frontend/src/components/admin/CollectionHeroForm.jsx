import './CollectionHeroForm.css';

const defaults = {
  eyebrow: 'CHERIE COLLECTION',
  heading: 'Made to be beloved always.',
  description: 'Discover a piece made for your story.',
  visible: true
};

export default function CollectionHeroForm({ settings, onSave }) {
  const values = { ...defaults, ...settings };
  const formKey = `${values.eyebrow}|${values.heading}|${values.description}|${values.visible}`;

  return <section className="admin-form collection-hero-form">
    <p className="eyebrow">STOREFRONT HERO</p>
    <h2>Collection message</h2>
    <p className="form-intro">Edit the text over your carousel image, or hide the message without removing the carousel.</p>
    <form key={formKey} onSubmit={onSave}>
      <label>Collection label<input name="eyebrow" required defaultValue={values.eyebrow} /></label>
      <label>Heading<input name="heading" required defaultValue={values.heading} /></label>
      <label className="hero-description">Description<textarea name="description" required defaultValue={values.description} /></label>
      <label className="checkbox"><input name="visible" type="checkbox" defaultChecked={values.visible} />Show this collection message on the storefront</label>
      <button className="button">Save collection message</button>
    </form>
  </section>;
}

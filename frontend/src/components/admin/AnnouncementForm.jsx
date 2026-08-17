import './AnnouncementForm.css';

const defaults = {
  announcementText: 'Complimentary gift wrapping on every Cherie order',
  announcementVisible: true
};

export default function AnnouncementForm({ settings, onSave }) {
  const values = { ...defaults, ...settings };
  const formKey = `${values.announcementText}|${values.announcementVisible}`;

  return <section className="admin-form announcement-form">
    <p className="eyebrow">TOP BAR</p>
    <h2>Announcement</h2>
    <p className="form-intro">Edit the message above the website header, or hide it whenever you prefer.</p>
    <form key={formKey} onSubmit={onSave}>
      <label className="announcement-message">Announcement text<input name="announcementText" required defaultValue={values.announcementText} /></label>
      <label className="checkbox"><input name="announcementVisible" type="checkbox" defaultChecked={values.announcementVisible} />Show announcement bar on the storefront</label>
      <button className="button">Save announcement</button>
    </form>
  </section>;
}

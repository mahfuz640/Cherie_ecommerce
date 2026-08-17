import './ImageUploadControl.css';

export default function ImageUploadControl({ image, label, onUpload, onRemove, required = false }) {
  const hasImage = Boolean(image);
  return <div className="image-upload-control">
    <p className="image-upload-status">{hasImage ? 'Image ready — it will be stored in MongoDB.' : 'No image selected yet.'}</p>
    <label className="upload">{label}<input accept="image/*" required={required && !hasImage} type="file" onChange={event => { onUpload(event.target.files[0]); event.target.value = ''; }} /></label>
    {hasImage && <button className="remove-image" type="button" onClick={onRemove}>Remove image</button>}
  </div>;
}

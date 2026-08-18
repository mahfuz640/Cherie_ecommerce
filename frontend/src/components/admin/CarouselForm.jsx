import { useEffect, useRef, useState } from 'react';
import ImageUploadControl from './ImageUploadControl';
import './CarouselForm.css';

export default function CarouselForm({ editing, image, selectedFiles, busy = false, onSelectFiles, onClearSelectedFiles, onUpload, onRemoveImage, onSave, onCancel, slides, onEdit, onDelete, apiImg }) {
  const [localFiles, setLocalFiles] = useState([]);
  const [localBusy, setLocalBusy] = useState(false);
  const fileInput = useRef(null);
  const usesExternalFiles = Array.isArray(selectedFiles);
  const files = usesExternalFiles ? selectedFiles : localFiles;
  const activeBusy = busy || localBusy;
  const imageCount = files.length;

  const setFiles = nextFiles => {
    if (usesExternalFiles) onSelectFiles?.(nextFiles);
    else setLocalFiles(nextFiles);
  };

  useEffect(() => {
    if (!imageCount && fileInput.current) fileInput.current.value = '';
  }, [imageCount]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (activeBusy) return;
    setLocalBusy(true);
    try {
      const pendingFiles = await onSave(event, editing ? undefined : files);
      if (!editing && Array.isArray(pendingFiles)) setFiles(pendingFiles);
    } finally {
      setLocalBusy(false);
    }
  }

  const clearSelectedFiles = () => {
    if (activeBusy) return;
    setFiles([]);
    if (usesExternalFiles) onClearSelectedFiles?.();
    else onRemoveImage?.();
  };

  return <section className="admin-form carousel-form">
    <h2>{editing ? 'Edit carousel image' : 'Add carousel images'}</h2>
    <form key={editing?._id || 'new-slide'} onSubmit={handleSubmit} aria-busy={activeBusy}>
      <input disabled={activeBusy} name="title" defaultValue={editing?.title} placeholder="Slide title" />
      <input disabled={activeBusy} name="subtitle" defaultValue={editing?.subtitle} placeholder="Slide subtitle" />
      <input disabled={activeBusy} name="link" defaultValue={editing?.link || '#collection'} placeholder="Button link" />
      {editing
        ? <ImageUploadControl image={image} label="Upload carousel image" onUpload={onUpload} onRemove={onRemoveImage} required />
        : <div className="carousel-batch-upload">
          <p><strong>{imageCount ? `${imageCount} image${imageCount === 1 ? '' : 's'} ready` : 'Choose carousel images'}</strong> - select one or many images at once. There is no image-count limit.</p>
          <p className="carousel-batch-hint">The title, subtitle, and link above will be used for every selected image.</p>
          <label className="upload">Choose carousel images<input ref={fileInput} accept="image/*" disabled={activeBusy} multiple type="file" onChange={event => setFiles(Array.from(event.target.files || []))} /></label>
          {imageCount > 0 && <button className="remove-image" disabled={activeBusy} type="button" onClick={clearSelectedFiles}>Clear selected images</button>}
          {imageCount > 0 && <ul className="carousel-selected-files" aria-label={`${imageCount} selected carousel images`}>{files.map((file, index) => <li key={`${file.name}-${file.lastModified}-${index}`}>{file.name}</li>)}</ul>}
        </div>}
      <div className="form-actions">
        <button className="button" disabled={activeBusy || (!editing && !imageCount)}>{activeBusy ? `Adding ${imageCount} image${imageCount === 1 ? '' : 's'}...` : editing ? 'Update carousel' : `Add ${imageCount || ''} image${imageCount === 1 ? '' : 's'} to carousel`}</button>
        {editing && <button disabled={activeBusy} type="button" onClick={onCancel}>Cancel</button>}
      </div>
    </form>
    <div className="slide-list">
      {slides.length
        ? slides.map(slide => <div className="slide-admin" key={slide._id}><img src={apiImg(slide.image)} alt={slide.title || 'Carousel image'} /><span>{slide.title || 'Untitled slide'}</span><button disabled={activeBusy} type="button" onClick={() => onEdit(slide)}>Edit</button><button disabled={activeBusy} type="button" className="danger" onClick={() => onDelete(slide)}>Remove</button></div>)
        : <p>No carousel image yet.</p>}
    </div>
  </section>;
}

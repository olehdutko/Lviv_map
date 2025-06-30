import React, { useRef, useState } from 'react';

interface ImageOverlayDialogProps {
  isOpen: boolean;
  onImageSelected: (imageUrl: string) => void;
  onCancel: () => void;
}

const ImageOverlayDialog: React.FC<ImageOverlayDialogProps> = ({ isOpen, onImageSelected, onCancel }) => {
  const [imageUrl, setImageUrl] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleNext = () => {
    if (imageUrl) {
      onImageSelected(imageUrl);
    }
  };

  return (
    <div className="image-overlay-dialog-overlay">
      <div className="image-overlay-dialog">
        <h4>Додати мапу (зображення)</h4>
        <input
          type="file"
          accept="image/*"
          ref={fileInputRef}
          onChange={handleFileChange}
        />
        {imageUrl && (
          <div className="image-preview-container" style={{ margin: '1rem 0' }}>
            <img src={imageUrl} alt="Preview" className="image-preview" style={{ maxWidth: 240, maxHeight: 180, border: '1px solid #ccc', borderRadius: 4 }} />
          </div>
        )}
        <div className="dialog-actions">
          <button onClick={handleNext} disabled={!imageUrl}>Далі</button>
          <button onClick={onCancel} className="close-btn">Скасувати</button>
        </div>
      </div>
    </div>
  );
};

export default ImageOverlayDialog; 
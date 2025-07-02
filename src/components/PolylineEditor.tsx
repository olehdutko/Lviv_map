import React, { useState, useEffect } from 'react';
import { MapPolyline } from '../types';
import ConfirmationDialog from './ConfirmationDialog';

interface PolylineEditorProps {
  selectedPolyline: MapPolyline;
  onUpdate: (updates: Partial<MapPolyline>) => void;
  onDelete: () => void;
  onClose: () => void;
}

const presetColors = ['#ff4500', '#ff8c00', '#ffd700', '#90ee90', '#00ced1', '#1e90ff', '#c71585', '#333333'];

const PolylineEditor: React.FC<PolylineEditorProps> = ({ selectedPolyline, onUpdate, onDelete, onClose }) => {
  const [title, setTitle] = useState(selectedPolyline.title || '');
  const [description, setDescription] = useState(selectedPolyline.description || '');
  const [color, setColor] = useState(selectedPolyline.color || '#0000ff');
  const [weight, setWeight] = useState(selectedPolyline.weight || 3);
  const [dashArray, setDashArray] = useState(selectedPolyline.dashArray || '');
  const [coordinates, setCoordinates] = useState(selectedPolyline.coordinates.map(c => c.join(',')).join('\n'));
  const [isConfirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState(selectedPolyline.imageUrl || '');

  useEffect(() => {
    setTitle(selectedPolyline.title || '');
    setDescription(selectedPolyline.description || '');
    setColor(selectedPolyline.color || '#0000ff');
    setWeight(selectedPolyline.weight || 3);
    setDashArray(selectedPolyline.dashArray || '');
    setCoordinates(selectedPolyline.coordinates.map(c => c.join(',')).join('\n'));
    setImageUrl(selectedPolyline.imageUrl || '');
    setConfirmDialogOpen(false);
  }, [selectedPolyline]);

  const handleUpdate = () => {
    // Parse coordinates
    const coords = coordinates
      .split(/\n|;/)
      .map(line => line.trim())
      .filter(Boolean)
      .map(line => {
        const [lat, lng] = line.split(',').map(Number);
        return [lat, lng] as [number, number];
      });
    // Додаткова перевірка валідності
    const validCoords = coords.filter(
      ([lat, lng]) => Array.isArray([lat, lng]) && [lat, lng].length === 2 && typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng)
    );
    if (validCoords.length < 2) {
      alert('Мінімум дві валідні координати!');
      return;
    }
    if (validCoords.length !== coords.length) {
      alert('Деякі координати невалідні. Перевірте формат: lat,lng у кожному рядку.');
      return;
    }
    onUpdate({
      title,
      description,
      color,
      weight,
      dashArray,
      coordinates: validCoords,
      imageUrl,
    });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDeleteClick = () => setConfirmDialogOpen(true);
  const handleConfirmDelete = () => { onDelete(); setConfirmDialogOpen(false); };
  const handleCancelDelete = () => setConfirmDialogOpen(false);

  return (
    <>
      <div className="object-editor">
        <h4>Редактор лінії</h4>
        <div className="editor-field">
          <label>Назва</label>
          <input type="text" value={title} onChange={e => setTitle(e.target.value)} />
        </div>
        <div className="editor-field">
          <label>Опис (можна використовувати HTML)</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} />
        </div>
        <div className="editor-field">
          <label>Зображення</label>
          <div className="image-uploader">
            <input type="file" accept="image/*" onChange={handleImageUpload} id="image-upload-polyline" style={{ display: 'none' }} />
            <label htmlFor="image-upload-polyline" className="image-upload-label">
              Обрати файл
            </label>
            {imageUrl && (
              <div className="image-preview-container">
                <img src={imageUrl} alt="Preview" className="image-preview" />
                <button onClick={() => setImageUrl('')} className="remove-image-btn">&times;</button>
              </div>
            )}
          </div>
        </div>
        <div className="editor-field">
          <label>Колір</label>
          <div className="color-palette">
            {presetColors.map((presetColor) => (
              <div
                key={presetColor}
                className={`color-swatch ${color === presetColor ? 'selected' : ''}`}
                style={{ backgroundColor: presetColor }}
                onClick={() => setColor(presetColor)}
              />
            ))}
            <input
              type="color"
              value={color}
              onChange={e => setColor(e.target.value)}
              className="color-picker-input"
            />
          </div>
        </div>
        <div className="editor-field">
          <label>Товщина: {weight}px</label>
          <input
            type="range"
            min="1"
            max="20"
            value={weight}
            onChange={e => setWeight(Number(e.target.value))}
          />
        </div>
        <div className="editor-field">
          <label>Стиль</label>
          <select value={dashArray} onChange={e => setDashArray(e.target.value)}>
            <option value="">Суцільна</option>
            <option value="5, 10">Пунктир</option>
            <option value="15, 10, 5, 10">Штрих-пунктир</option>
          </select>
        </div>
        <div className="editor-actions">
          <button onClick={handleUpdate}>Оновити</button>
          <button onClick={handleDeleteClick} className="delete-btn">Видалити</button>
          <button onClick={onClose} className="close-btn">Закрити</button>
        </div>
      </div>
      <ConfirmationDialog
        isOpen={isConfirmDialogOpen}
        message="Ви впевнені, що хочете видалити цю лінію?"
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
    </>
  );
};

export default PolylineEditor; 
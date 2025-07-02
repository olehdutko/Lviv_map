import React, { useState, useEffect } from 'react';
import { MapPolygon } from '../types';
import ConfirmationDialog from './ConfirmationDialog';

interface PolygonEditorProps {
  selectedPolygon: MapPolygon;
  onUpdate: (updates: Partial<MapPolygon>) => void;
  onDelete: () => void;
  onClose: () => void;
  isDrawing?: boolean;
}

const presetColors = ['#ff4500', '#ff8c00', '#ffd700', '#90ee90', '#00ced1', '#1e90ff', '#c71585', '#333333'];

const PolygonEditor: React.FC<PolygonEditorProps> = ({ selectedPolygon, onUpdate, onDelete, onClose, isDrawing }) => {
  const [title, setTitle] = useState(selectedPolygon.title || '');
  const [description, setDescription] = useState(selectedPolygon.description || '');
  const [color, setColor] = useState(selectedPolygon.color || '#ff0000');
  const [fillColor, setFillColor] = useState(selectedPolygon.fillColor || '#ff0000');
  const [opacity, setOpacity] = useState(typeof selectedPolygon.opacity === 'number' ? selectedPolygon.opacity : 0.3);
  const [coordinates, setCoordinates] = useState(selectedPolygon.coordinates.map(c => c.join(',')).join('\n'));
  const [imageUrl, setImageUrl] = useState(selectedPolygon.imageUrl || '');
  const [isConfirmDialogOpen, setConfirmDialogOpen] = useState(false);

  useEffect(() => {
    setTitle(selectedPolygon.title || '');
    setDescription(selectedPolygon.description || '');
    setColor(selectedPolygon.color || '#ff0000');
    setFillColor(selectedPolygon.fillColor || '#ff0000');
    setOpacity(typeof selectedPolygon.opacity === 'number' ? selectedPolygon.opacity : 0.3);
    setCoordinates(selectedPolygon.coordinates.map(c => c.join(',')).join('\n'));
    setImageUrl(selectedPolygon.imageUrl || '');
    setConfirmDialogOpen(false);
  }, [selectedPolygon]);

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
    if (validCoords.length < 3) {
      alert('Мінімум три валідні координати!');
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
      fillColor,
      opacity,
      coordinates: validCoords,
      imageUrl,
    });
  };

  const handleDeleteClick = () => setConfirmDialogOpen(true);
  const handleConfirmDelete = () => { onDelete(); setConfirmDialogOpen(false); };
  const handleCancelDelete = () => setConfirmDialogOpen(false);

  return (
    <>
      <div className="object-editor">
        <h4>Редактор полігону</h4>
        <div className="editor-field">
          <label>Назва</label>
          <input type="text" value={title} onChange={e => setTitle(e.target.value)} />
        </div>
        <div className="editor-field">
          <label>Опис (можна використовувати HTML)</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} />
        </div>
        <div className="editor-field">
          <label>Колір контуру</label>
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
          <label>Колір заливки</label>
          <div className="color-palette">
            {presetColors.map((presetColor) => (
              <div
                key={presetColor}
                className={`color-swatch ${fillColor === presetColor ? 'selected' : ''}`}
                style={{ backgroundColor: presetColor }}
                onClick={() => setFillColor(presetColor)}
              />
            ))}
            <input
              type="color"
              value={fillColor}
              onChange={e => setFillColor(e.target.value)}
              className="color-picker-input"
            />
          </div>
        </div>
        <div className="editor-field">
          <label>Прозорість: {(opacity * 100).toFixed(0)}%</label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={opacity}
            onChange={e => setOpacity(Number(e.target.value))}
          />
        </div>
        <div className="editor-field">
          <label>Зображення</label>
          <div className="image-uploader">
            <input type="file" accept="image/*" onChange={handleImageUpload} id="image-upload-polygon" style={{ display: 'none' }} />
            <label htmlFor="image-upload-polygon" className="image-upload-label">
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
        <div className="editor-actions">
          {isDrawing ? (
            <>
              <button onClick={handleUpdate} disabled={!selectedPolygon.coordinates || selectedPolygon.coordinates.length < 3}>Завершити полігон</button>
              <button onClick={onDelete} className="delete-btn">Скасувати</button>
            </>
          ) : (
            <>
              <button onClick={handleUpdate}>Оновити</button>
              <button onClick={handleDeleteClick} className="delete-btn">Видалити</button>
              <button onClick={onClose} className="close-btn">Закрити</button>
            </>
          )}
        </div>
      </div>
      <ConfirmationDialog
        isOpen={isConfirmDialogOpen}
        message="Ви впевнені, що хочете видалити цей полігон?"
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
    </>
  );
};

export default PolygonEditor; 
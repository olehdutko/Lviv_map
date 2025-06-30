import React, { useState, useEffect } from 'react';
import { MapMarker } from '../types';
import { materialIcons } from '../data/material-icons';
import ConfirmationDialog from './ConfirmationDialog';

interface ObjectEditorProps {
  selectedObject: MapMarker;
  onUpdate: (updates: Partial<MapMarker>) => void;
  onDelete: () => void;
  onClose: () => void;
}

const ObjectEditor: React.FC<ObjectEditorProps> = ({ selectedObject, onUpdate, onDelete, onClose }) => {
  const [title, setTitle] = useState(selectedObject.title || '');
  const [description, setDescription] = useState(selectedObject.description || '');
  const [color, setColor] = useState(selectedObject.color || '#ff0000');
  const [iconName, setIconName] = useState(selectedObject.iconName || '');
  const [lat, setLat] = useState(selectedObject.lat.toString());
  const [lng, setLng] = useState(selectedObject.lng.toString());
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isConfirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState(selectedObject.imageUrl || '');

  const presetColors = ['#ff4500', '#ff8c00', '#ffd700', '#90ee90', '#00ced1', '#1e90ff', '#c71585', '#333333'];

  useEffect(() => {
    setTitle(selectedObject.title || '');
    setDescription(selectedObject.description || '');
    setColor(selectedObject.color || '#ff0000');
    setIconName(selectedObject.iconName || '');
    setImageUrl(selectedObject.imageUrl || '');
    setLat(selectedObject.lat.toString());
    setLng(selectedObject.lng.toString());
    setSuggestions([]);
    setConfirmDialogOpen(false);
  }, [selectedObject]);

  const handleUpdate = () => {
    const newLat = parseFloat(lat);
    const newLng = parseFloat(lng);

    if (isNaN(newLat) || isNaN(newLng)) {
      alert('Некоректні координати!');
      return;
    }
    
    onUpdate({ 
      lat: newLat, 
      lng: newLng,
      title,
      description,
      color,
      iconName,
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

  const handleIconNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setIconName(value);
    if (value.length > 1) {
      const filteredSuggestions = materialIcons
        .filter(icon => icon.toLowerCase().includes(value.toLowerCase()))
        .slice(0, 50); // Limit to 50 suggestions
      setSuggestions(filteredSuggestions);
    } else {
      setSuggestions([]);
    }
  };

  const selectSuggestion = (suggestion: string) => {
    setIconName(suggestion);
    setSuggestions([]);
  };

  const handleDeleteClick = () => {
    setConfirmDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    onDelete();
    setConfirmDialogOpen(false);
  };

  const handleCancelDelete = () => {
    setConfirmDialogOpen(false);
  };

  return (
    <>
      <div className="object-editor">
        <h4>Редактор маркера</h4>
        <div className="editor-field">
          <label>Назва</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="editor-field">
          <label>Опис (можна використовувати HTML)</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4}></textarea>
        </div>
        <div className="editor-field">
          <label>Зображення</label>
          <div className="image-uploader">
            <input type="file" accept="image/*" onChange={handleImageUpload} id="image-upload" style={{ display: 'none' }} />
            <label htmlFor="image-upload" className="image-upload-label">
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
              onChange={(e) => setColor(e.target.value)}
              className="color-picker-input" 
            />
          </div>
        </div>
        <div className="editor-field icon-search-container" onBlur={() => setTimeout(() => setSuggestions([]), 100)}>
          <label>Назва іконки (Material Icons)</label>
          <input 
            type="text" 
            value={iconName} 
            onChange={handleIconNameChange}
            onFocus={handleIconNameChange}
            placeholder="напр. home, star..." 
            autoComplete="off"
          />
          {suggestions.length > 0 && (
            <ul className="icon-suggestions">
              {suggestions.map(suggestion => (
                <li key={suggestion} onMouseDown={() => selectSuggestion(suggestion)}>
                  <span className="material-icons">{suggestion}</span>
                  {suggestion}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="editor-field">
          <label>Latitude</label>
          <input type="text" value={lat} onChange={(e) => setLat(e.target.value)} />
        </div>
        <div className="editor-field">
          <label>Longitude</label>
          <input type="text" value={lng} onChange={(e) => setLng(e.target.value)} />
        </div>
        <div className="editor-actions">
          <button onClick={handleUpdate}>Оновити</button>
          <button onClick={handleDeleteClick} className="delete-btn">Видалити</button>
          <button onClick={onClose} className="close-btn">Закрити</button>
        </div>
      </div>
      <ConfirmationDialog
        isOpen={isConfirmDialogOpen}
        message="Ви впевнені, що хочете видалити цей маркер?"
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
    </>
  );
};

export default ObjectEditor; 
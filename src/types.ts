/**
 * This file will contain all the necessary TypeScript type definitions for the application.
 */

// We will add types for Layers, Markers, Polygons, etc., here.
export {};

// Base type for any object on the map
export interface MapObject {
  id: string;
  title?: string;
  description?: string;
}

// Specific object types
export interface MapMarker extends MapObject {
  lat: number;
  lng: number;
  color?: string;
  iconName?: string;
  imageUrl?: string;
}

export interface MapPolygon extends MapObject {
  coordinates: [number, number][];
  color?: string;
  fillColor?: string;
}

export interface MapPolyline extends MapObject {
  coordinates: [number, number][];
  color?: string;
  weight?: number;
}

// Settings for drawing new objects on a layer
export interface DrawingSettings {
  markerColor: string;
  polygonColor: string;
  polygonFillColor: string;
  polylineColor: string;
  polylineWeight: number;
}

// The main Layer type
export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  opacity: number;
  markers: MapMarker[];
  polygons: MapPolygon[];
  polylines: MapPolyline[];
  drawingSettings: DrawingSettings;
} 
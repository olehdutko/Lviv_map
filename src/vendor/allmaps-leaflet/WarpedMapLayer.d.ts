import { Layer, Map, ZoomAnimEvent } from 'leaflet';
import { WebGL2Renderer, WebGL2WarpedMap } from '@allmaps/render/webgl2';
import { WarpedMapList, WarpedMapLayerOptions } from '@allmaps/render';
import { Point, ImageInformations } from '@allmaps/types';
import { TransformationType, DistortionMeasure } from '@allmaps/transform';

export type LeafletWarpedMapLayerOptions = WarpedMapLayerOptions & {
    opacity: number;
    interactive: boolean;
    className: string;
    pane: string;
    zIndex?: number;
    imageInformations?: ImageInformations;
};
/**
 * WarpedMapLayer class.
 *
 * Renders georeferenced maps of a Georeference Annotation on a Leaflet map.
 * WarpedMapLayer extends Leaflet's [L.Layer](https://leafletjs.com/reference.html#layer).
 */
export declare class WarpedMapLayer extends Layer {
    container: HTMLDivElement | undefined;
    canvas: HTMLCanvasElement | undefined;
    gl: WebGL2RenderingContext | null | undefined;
    renderer: WebGL2Renderer | undefined;
    _annotationOrAnnotationUrl: (unknown | string) | undefined;
    resizeObserver: ResizeObserver | undefined;
    options: Partial<LeafletWarpedMapLayerOptions>;
    /**
     * Creates a WarpedMapLayer
     * @param annotationOrAnnotationUrl - Georeference Annotation or URL of a Georeference Annotation
     * @param options - Options for the layer
     */
    constructor(annotationOrAnnotationUrl: unknown, options?: Partial<LeafletWarpedMapLayerOptions>);
    initialize(annotationOrAnnotationUrl: unknown, options?: Partial<LeafletWarpedMapLayerOptions>): void;
    /**
     * Contains all code code that creates DOM elements for the layer and adds them to map panes where they belong.
     */
    onAdd(map: Map): this;
    /**
     * Contains all cleanup code that removes the layer's elements from the DOM.
     */
    onRemove(map: Map): this;
    /**
     * Adds a [Georeference Annotation](https://iiif.io/api/extension/georef/).
     * @param annotation - Georeference Annotation
     * @returns - the map IDs of the maps that were added, or an error per map
     */
    addGeoreferenceAnnotation(annotation: unknown): Promise<(string | Error)[]>;
    /**
     * Removes a [Georeference Annotation](https://iiif.io/api/extension/georef/).
     * @param annotation - Georeference Annotation
     * @returns - the map IDs of the maps that were removed, or an error per map
     */
    removeGeoreferenceAnnotation(annotation: unknown): Promise<(string | Error)[]>;
    /**
     * Adds a [Georeference Annotation](https://iiif.io/api/extension/georef/) by URL.
     * @param annotationUrl - Georeference Annotation
     * @returns The map IDs of the maps that were added, or an error per map
     */
    addGeoreferenceAnnotationByUrl(annotationUrl: string): Promise<(string | Error)[]>;
    /**
     * Removes a [Georeference Annotation](https://iiif.io/api/extension/georef/) by URL.
     * @param annotationUrl - Georeference Annotation
     * @returns The map IDs of the maps that were removed, or an error per map
     */
    removeGeoreferenceAnnotationByUrl(annotationUrl: string): Promise<(string | Error)[]>;
    /**
     * Adds a Georeferenced map.
     * @param georeferencedMap - Georeferenced map
     * @returns The map ID of the map that was added, or an error
     */
    addGeoreferencedMap(georeferencedMap: unknown): Promise<string | Error>;
    /**
     * Removes a Georeferenced map.
     * @param georeferencedMap - Georeferenced map
     * @returns The map ID of the map that was removed, or an error
     */
    removeGeoreferencedMap(georeferencedMap: unknown): Promise<string | Error>;
    /**
     * Gets the HTML container element of the layer
     * @returns HTML Div Element
     */
    getContainer(): HTMLDivElement | undefined;
    /**
     * Gets the HTML canvas element of the layer
     * @returns HTML Canvas Element
     */
    getCanvas(): HTMLCanvasElement | undefined;
    /**
     * Returns the WarpedMapList object that contains a list of the warped maps of all loaded maps
     */
    getWarpedMapList(): WarpedMapList<WebGL2WarpedMap>;
    /**
     * Returns a single map's warped map
     * @param mapId - ID of the map
     * @returns the warped map
     */
    getWarpedMap(mapId: string): WebGL2WarpedMap | undefined;
    /**
     * Make a single map visible
     * @param mapId - ID of the map
     */
    showMap(mapId: string): void;
    /**
     * Make multiple maps visible
     * @param mapIds - IDs of the maps
     */
    showMaps(mapIds: Iterable<string>): void;
    /**
     * Make a single map invisible
     * @param mapId - ID of the map
     */
    hideMap(mapId: string): void;
    /**
     * Make multiple maps invisible
     * @param mapIds - IDs of the maps
     */
    hideMaps(mapIds: Iterable<string>): void;
    /**
     * Returns the visibility of a single map
     * @returns - whether the map is visible
     */
    isMapVisible(mapId: string): boolean | undefined;
    /**
     * Sets the resource mask of a single map
     * @param mapId - ID of the map
     * @param resourceMask - new resource mask
     */
    setMapResourceMask(mapId: string, resourceMask: Point[]): void;
    /**
     * Sets the transformation type of multiple maps
     * @param mapIds - IDs of the maps
     * @param transformation - new transformation type
     */
    setMapsTransformationType(mapIds: Iterable<string>, transformation: TransformationType): void;
    /**
     * Sets the distortion measure of multiple maps
     * @param mapIds - IDs of the maps
     * @param distortionMeasure - new transformation type
     */
    setMapsDistortionMeasure(mapIds: Iterable<string>, distortionMeasure?: DistortionMeasure): void;
    /**
     * Returns the bounds of all visible maps (inside or outside of the Viewport), in latitude/longitude coordinates.
     * @returns - L.LatLngBounds in array form of all visible maps
     */
    getBounds(): number[][] | undefined;
    /**
     * Bring maps to front
     * @param mapIds - IDs of the maps
     */
    bringMapsToFront(mapIds: Iterable<string>): void;
    /**
     * Send maps to back
     * @param mapIds - IDs of the maps
     */
    sendMapsToBack(mapIds: string[]): void;
    /**
     * Bring maps forward
     * @param mapIds - IDs of the maps
     */
    bringMapsForward(mapIds: Iterable<string>): void;
    /**
     * Send maps backward
     * @param mapIds - IDs of the maps
     */
    sendMapsBackward(mapIds: Iterable<string>): void;
    /**
     * Brings the layer in front of other overlays (in the same map pane).
     */
    bringToFront(): this;
    /**
     * Brings the layer to the back of other overlays (in the same map pane).
     */
    bringToBack(): this;
    /**
     * Returns the z-index of a single map
     * @param mapId - ID of the map
     * @returns - z-index of the map
     */
    getMapZIndex(mapId: string): number | undefined;
    /**
     * Gets the z-index of the layer.
     */
    getZIndex(): number | undefined;
    /**
     * Changes the z-index of the layer.
     * @param value - z-index
     */
    setZIndex(value: number): this;
    /**
     * Sets the object that caches image information
     *
     * @param imageInformations - Object that caches image information
     */
    setImageInformations(imageInformations: ImageInformations): void;
    /**
     * Gets the pane name the layer is attached to. Defaults to 'tilePane'
     * @returns Pane name
     */
    getPaneName(): string;
    /**
     * Gets the opacity of the layer
     * @returns Layer opacity
     */
    getOpacity(): number;
    /**
     * Sets the opacity of the layer
     * @param opacity - Layer opacity
     */
    setOpacity(opacity: number): this;
    /**
     * Resets the opacity of the layer to fully opaque
     */
    resetOpacity(): this;
    /**
     * Sets the options
     *
     * @param options - Options
     */
    setOptions(options?: Partial<LeafletWarpedMapLayerOptions>): void;
    /**
     * Gets the opacity of a single map
     * @param mapId - ID of the map
     * @returns opacity of the map
     */
    getMapOpacity(mapId: string): number | undefined;
    /**
     * Sets the opacity of a single map
     * @param mapId - ID of the map
     * @param opacity - opacity between 0 and 1, where 0 is fully transparent and 1 is fully opaque
     */
    setMapOpacity(mapId: string, opacity: number): this;
    /**
     * Resets the opacity of a single map to 1
     * @param mapId - ID of the map
     */
    resetMapOpacity(mapId: string): this;
    /**
     * Sets the saturation of a single map
     * @param saturation - saturation between 0 and 1, where 0 is grayscale and 1 are the original colors
     */
    setSaturation(saturation: number): this;
    /**
     * Resets the saturation of a single map to the original colors
     */
    resetSaturation(): this;
    /**
     * Sets the saturation of a single map
     * @param mapId - ID of the map
     * @param saturation - saturation between 0 and 1, where 0 is grayscale and 1 are the original colors
     */
    setMapSaturation(mapId: string, saturation: number): this;
    /**
     * Resets the saturation of a single map to the original colors
     * @param mapId - ID of the map
     */
    resetMapSaturation(mapId: string): this;
    /**
     * Removes a color from all maps
     * @param options - remove color options
     * @param options.hexColor - hex color to remove
     * @param options.threshold - threshold between 0 and 1
     * @param options.hardness - hardness between 0 and 1
     */
    setRemoveColor(options: Partial<{
        hexColor: string;
        threshold: number;
        hardness: number;
    }>): this;
    /**
     * Resets the color removal for all maps
     */
    resetRemoveColor(): this;
    /**
     * Removes a color from a single map
     * @param mapId - ID of the map
     * @param options - remove color options
     * @param options.hexColor - hex color to remove
     * @param options.threshold - threshold between 0 and 1
     * @param options.hardness - hardness between 0 and 1
     */
    setMapRemoveColor(mapId: string, options: Partial<{
        hexColor: string;
        threshold: number;
        hardness: number;
    }>): this;
    /**
     * Resets the color removal for a single map
     * @param mapId - ID of the map
     */
    resetMapRemoveColor(mapId: string): this;
    /**
     * Sets the colorization for all maps
     * @param hexColor - desired hex color
     */
    setColorize(hexColor: string): this;
    /**
     * Resets the colorization for all maps
     */
    resetColorize(): this;
    /**
     * Sets the colorization for a single map
     * @param mapId - ID of the map
     * @param hexColor - desired hex color
     */
    setMapColorize(mapId: string, hexColor: string): this;
    /**
     * Resets the colorization of a single map
     * @param mapId - ID of the map
     */
    resetMapColorize(mapId: string): this;
    /**
     * Removes all warped maps from the layer
     */
    clear(): this;
    _initGl(): void;
    _resized(entries: ResizeObserverEntry[]): void;
    _animateZoom(e: ZoomAnimEvent): void;
    _updateZIndex(): void;
    _update(): HTMLDivElement | undefined;
    _contextLost(event: Event): void;
    _contextRestored(event: Event): void;
    _addEventListeners(): void;
    _removeEventListeners(): void;
    _passWarpedMapEvent(event: Event): void;
    _unload(): void;
}

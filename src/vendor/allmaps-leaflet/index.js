import { WarpedMapLayer } from "./WarpedMapLayer.js";
import { WarpedMapEvent, WarpedMapEventType } from "@allmaps/render";
const warpedMapLayer = function(annotationOrAnnotationUrl, options) {
  return new WarpedMapLayer(annotationOrAnnotationUrl, options);
};
L.WarpedMapLayer = WarpedMapLayer;
L.warpedMapLayer = warpedMapLayer;
export {
  WarpedMapEvent,
  WarpedMapEventType,
  WarpedMapLayer
};
//# sourceMappingURL=index.js.map

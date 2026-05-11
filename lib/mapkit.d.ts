// Minimal ambient type declarations for Apple MapKit JS (loaded via CDN)
declare namespace mapkit {
  function init(options: { authorizationCallback: (done: (token: string) => void) => void }): void

  class Coordinate {
    constructor(latitude: number, longitude: number)
    latitude: number
    longitude: number
  }

  class Map {
    constructor(container: HTMLElement, options?: Record<string, unknown>)
    center: Coordinate
    setCenterAnimated(coordinate: Coordinate, animate?: boolean): void
    addAnnotation(annotation: Annotation): void
    removeAnnotation(annotation: Annotation): void
    destroy(): void
  }

  class Annotation {
    coordinate: Coordinate
    color: string
    addEventListener(type: string, handler: () => void): void
    removeEventListener(type: string, handler: () => void): void
  }

  class MarkerAnnotation extends Annotation {
    constructor(coordinate: Coordinate, options?: Record<string, unknown>)
    title: string
    subtitle: string
    animates: boolean
  }

  const FeatureVisibility: { Adaptive: string; Hidden: string; Visible: string }
}

interface Window {
  mapkit: typeof mapkit
}

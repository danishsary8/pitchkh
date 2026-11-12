// Minimal timer typings so this package compiles without the DOM or Node libs.
declare function setTimeout(handler: () => void, timeout?: number): number;
declare function clearTimeout(id: number | undefined): void;

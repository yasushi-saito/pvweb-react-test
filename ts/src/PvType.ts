export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface CameraAttr {
  zoom?: number;
  defaultDistance?: number;
  position?: number;
  focalPoint?: Vector3;
  viewUp?: Vector3;
}

export interface ViewState {
  representation: string;
  camera: CameraAttr;
}

function addVector3(v0: Vector3, v1: Vector3) {
}

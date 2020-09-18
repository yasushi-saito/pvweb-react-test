import * as React from 'react';
import FormLabel from '@material-ui/core/FormLabel';
import Button from '@material-ui/core/Button';

import * as PvType from './PvType.ts';

const zoomInFactor = Math.sqrt(2);
const zoomOutFactor = 1 / zoomInFactor;

/**
   CameraControlPanel implements a series of buttons that control the location
   and the angle of the camera. The camera is a function that maps a world (3D)
   coordinate to a screen (2D) coordinate.
*/
interface Props {
  style: React.CSSProperties;
  // Called when "reset camera" button is clicked.
  onReset: () => void;
  // Called to set the absolute angle
  onSet: (value: PvType.CameraAttr) => void;
  value: PvType.CameraAttr;
}

const CameraControlPanel: React.FC<Props> = (props) => {
  const zoomIn = () => {
    props.onSet({
      ...props.value,
      zoom: props.value.zoom * zoomInFactor
    });
  };
  const zoomOut = () => {
    props.onSet({
      ...props.value,
      zoom: props.value.zoom * zoomOutFactor
    });
  };

  const setViewUp = (x:number, y:number, z:number) => {
    props.onSet({
      ...props.value,
      viewUp: { x, y, z }
    });
  };

  return (
    <div style={props.style}>
      <FormLabel>Camera</FormLabel>
      <Button onClick={props.onReset}>Reset</Button>
      <Button onClick={zoomIn}>Zoom+</Button>
      <Button onClick={zoomOut}>Zoom-</Button>
      <Button onClick={() => setViewUp(1, 0, 0)}>X up-</Button>
      <Button onClick={() => setViewUp(0, 1, 0)}>Y up-</Button>
      <Button onClick={() => setViewUp(0, 0, 1)}>Z up-</Button>
    </div>
  );
};

export default CameraControlPanel;

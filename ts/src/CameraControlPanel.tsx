import * as React from 'react';
import FormLabel from '@material-ui/core/FormLabel';
import Button from '@material-ui/core/Button';

import * as PvType from './PvType.ts';

const zoomInFactor = Math.sqrt(2);
const zoomOutFactor = 1 / zoomInFactor;

interface Props {
  style: React.CSSProperties;
  onReset: () => void;
  onSet: (value: PvType.CameraAttr) => void;
  value: PvType.CameraAttr;
}

const CameraControlPanel: React.FC<Props> = (props) => {
  const zoomIn = () => {
    props.onSet({
      ...props.value,
      zoom: props.value.zoom * zoomInFactor,
    });
  }
  const zoomOut = () => {
    props.onSet({
      ...props.value,
      zoom: props.value.zoom * zoomOutFactor,
    });
  }

  return (
    <div>
      <FormLabel>Camera</FormLabel>
      <Button onClick={props.onReset}>Reset</Button>
      <Button onClick={zoomIn}>Zoom+</Button>
      <Button onClick={zoomOut}>Zoom-</Button>
  </div>);
}

export default CameraControlPanel

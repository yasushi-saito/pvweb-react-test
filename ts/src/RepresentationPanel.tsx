import * as React from 'react';
import FormLabel from '@material-ui/core/FormLabel';
import Select from '@material-ui/core/Select';
import MenuItem from '@material-ui/core/MenuItem';

// A Select that allows selecting the model representation (wireframe, surface
// only, etc).

interface Props {
  style: React.CSSProperties;
  // Called when a style is chosen by the user.
  onChange: (repr: string) => void;
  // Current style. The component is fully controlled.
  value: string;
}

const RepresentationPanel: React.FC<Props> = (props) => {
  return (
    <React.Fragment>
      <FormLabel>Representation</FormLabel>
      <Select
        style={props.style}
        onChange={(e) => props.onChange(e.target.value as string)}
        value={props.value}
      >
        <MenuItem value="Points">Points</MenuItem>
        <MenuItem value="Surface">Surface</MenuItem>
        <MenuItem value="Surface With Edges">Surface with Edges</MenuItem>
        <MenuItem value="Wireframe">Wireframe</MenuItem>
      </Select>
  </React.Fragment>);
}

export default RepresentationPanel
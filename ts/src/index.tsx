import * as React from 'react';
import * as ReactDOM from 'react-dom';

import ParaView from './Paraview.tsx';

const rootContainer = document.getElementById('root');
ReactDOM.unmountComponentAtNode(rootContainer);
ReactDOM.render(
  <ParaView />,
  rootContainer
);

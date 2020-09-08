import * as React from 'react';
import Select from '@material-ui/core/Select';
import MenuItem from '@material-ui/core/MenuItem';
import VtkRenderer from 'paraviewweb/src/React/Renderers/VtkRenderer';

import * as Network from './Network.ts';

interface Props {
  resetCamera? : () => void;
  showFPS?: boolean;
  remoteRendering?: boolean;
  interactiveQuality?: number; // 50
  interactiveRatio?: number; // 1
  throttleTime?: number; // 16.6
  serverMaxFPS?: number; // 30
}

const ParaView: React.FunctionComponent<Props> = (props) => {
  const [conn, setConn] = React.useState<Network.Connection | null>(null);
  const [repr, setRepr] = React.useState<string>("Surface");
  const [viewId, setViewId] = React.useState<string>('-1');
  const renderer = React.useRef<any>(null);

  React.useEffect(() => {
    Network.onReady((c: Network.Connection) => {
      console.log('onReady');
      setConn(c);
    });
    Network.connect({ sessionURL: 'ws://localhost:8080/ws' });
  });

  React.useEffect(() => {
  }, [renderer]);

  const Renderer = VtkRenderer;
  if (conn === null) {
    return (<div>Not connected</div>);
  }

  return (
    <div style={{
      display: 'flex',
      flexFlow: 'column',
      height: '100%'
    }}
    >
      <Select
        style={{ flexGrow: 0 }}
        onChange={(e) => {
          const r = e.target.value as string
          Network.call(conn, 'test.setrepresentation',[r]);
          setRepr(r);
        }}
        value={repr}
      >
        <MenuItem value="Points">Points</MenuItem>
        <MenuItem value="Surface">Surface</MenuItem>
        <MenuItem value="Surface With Edges">Surface with Edges</MenuItem>
        <MenuItem value="Wireframe">Wireframe</MenuItem>
      </Select>
      <Renderer
        style={{
          flexGrow: 1,
          border: '4px solid red',
          minHeight: 0
        }}
        ref={(c) => {
          renderer.current = c;
        }}
        client={conn.client}
        viewId={viewId}
        connection={conn.wslinkConn}
        session={conn.wslinkConn.session}
        onImageReady={
            () => console.log('image ready')
          }
        viewIdUpdated={(vid: string) => {
          console.log(`view updated: ${viewId} ${typeof (vid)}`);
          setViewId(vid);
        }}
        onBusyChange={
            (status) => console.log(`status updated: ${status} ${typeof (status)}`)
          }
        showFPS={props.showFPS}
        oldImageStream={false}
        resizeOnWindowResize
        clearOneTimeUpdatersOnUnmount
        clearInstanceCacheOnUnmount
        interactiveQuality={props.interactiveQuality}
        interactiveRatio={props.interactiveRatio}
        throttleTime={props.throttleTime}
        maxFPS={props.serverMaxFPS}
      />
    </div>
  );
};

ParaView.defaultProps = {
  resetCamera: () => {
    console.log('resetcamera');
  },
  showFPS: true,
  remoteRendering: true,
  interactiveQuality: 50,
  interactiveRatio: 1,
  throttleTime: 16.6,
  serverMaxFPS: 30
};

export default ParaView;

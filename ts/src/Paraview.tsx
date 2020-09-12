import * as React from 'react';
import VtkRenderer from 'paraviewweb/src/React/Renderers/VtkRenderer';

import * as Network from './Network.ts';
import RepresentationPanel from './RepresentationPanel.tsx';
import CameraControlPanel from './CameraControlPanel.tsx';
import * as PvType from './PvType.ts';

interface Props {
  resetCamera? : () => void;
  showFPS?: boolean;
  remoteRendering?: boolean;
  interactiveQuality?: number; // 50
  interactiveRatio?: number; // 1
  throttleTime?: number; // 16.6
  serverMaxFPS?: number; // 30
}

const ParaView: React.FC<Props> = (props) => {
  const [conn, setConn] = React.useState<Network.Connection | null>(null);
  const [viewState, setViewState] = React.useState<PvType.ViewState>({
    representation: "Surface",
    camera: {
      zoom: 1.0,
    },
  });
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
      <CameraControlPanel
        style={{ flexGrow: 0 }}
        onReset={() => Network.call(conn, 'test.resetcamera',[])}
        onSet={(value: PvType.CameraAttr) => {
          const newViewState = {...viewState, camera: value}
          Network.call(conn, 'test.setviewstate', [newViewState]);
          setViewState(newViewState);
        }}
        value={viewState.camera}
      />
      <RepresentationPanel
        style={{ flexGrow: 0 }}
        onChange={(r: string) => {
          const newViewState = {
            representation: r,
            ...viewState
          };
          Network.call(conn, 'test.setviewstate',[newViewState]);
          setViewState(newViewState);
        }}
        value={viewState.representation} />
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

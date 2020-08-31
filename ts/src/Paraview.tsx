import * as React from 'react';

import VtkRenderer from 'paraviewweb/src/React/Renderers/VtkRenderer';
import VtkGeometryRenderer from 'paraviewweb/src/React/Renderers/VtkGeometryRenderer';

import * as Network from './Network.ts';

// import network from './network';
// import ImageProviders from './ImageProviders';
// import LocalRenderingImageProvider from './LocalRenderingImageProvider';

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
  const [remoteRendering, setRemoteRendering] = React.useState<boolean>(true);
  const [viewId, setViewId] = React.useState<string>('-1');

  const renderer = React.useRef<any>(null);

  React.useEffect(() => {
    Network.onError(() => console.log('ERROR'));
    Network.onClose(() => console.log('Server disconnected'));
    Network.onReady((conn: Network.Connection) => {
      console.log('onReady');
      setConn(conn);
    });
    Network.connect({ sessionURL: 'ws://localhost:8080/ws' });
  });

  React.useEffect(() => {
  }, [renderer]);

  const Renderer = remoteRendering
    ? VtkRenderer
    : VtkGeometryRenderer;
  if (conn === null) {
    return (<div>Not connected</div>);
  }

  return (
    <div>
      <div>FooHah</div>
      <div>FooHah2</div>
      <div>FooHah3</div>
      <div>FooHah4</div>
      <Renderer
        style={{
          position: 'relative',
          top: 0,
          left: 0,
          right: 0,
          height: '100%',
          bottom: 0
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
        viewIdUpdated={
            (viewId) => {
              console.log(`view updated: ${viewId} ${typeof (viewId)}`);
              setViewId(viewId);
            }
          }
        onBusyChange={
            (status) => console.log(`status updated: ${status} ${typeof (status)}`)
          }
        showFPS={props.showFPS}
        oldImageStream={!remoteRendering}
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

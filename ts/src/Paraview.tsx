import * as React from 'react';

import Button from '@material-ui/core/Button';

import ResizeObserver from 'resize-observer-polyfill';
import VtkRenderer from 'paraviewweb/src/React/Renderers/VtkRenderer';

import * as Network from './Network.ts';
import RepresentationPanel from './RepresentationPanel.tsx';
import CameraControlPanel from './CameraControlPanel.tsx';
import * as PvType from './PvType.ts';
import Debouncer from './Debouncer.ts';

interface OverlayProps {
  style: React.CSSProperties;
  onSelectPoint: (x: number, y: number) => void;
}

const Overlay: React.FC<OverlayProps> = (props) => {
  const overlay = React.useRef<any>(null);
  const observer = React.useRef<ResizeObserver|null>(null);
  const debouncer = React.useRef<Debouncer|null>(null);

  React.useEffect(() => {
    const c = overlay.current;
    if (observer.current === null) {
      const onClick = (e) => {
        console.log(`mouse click client=(${e.clientX},${e.clientY}) off=(${e.offsetX},${e.offsetY}) size=(${c.clientWidth},${c.clientHeight})`);
        props.onSelectPoint(e.offsetX, c.clientHeight - e.offsetY);
      };

      c.addEventListener('click', onClick);
      // observer.current.observe(c);
      return () => {
        c.removeEventListener('click', onClick);
      };
    }
  });

  return (
    <div
      style={props.style}
      ref={overlay}
    >
      <svg
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          border: '2px solid purple'
        }}
      >
      <circle cx={400} cy={900} r={40} stroke="black" strokeWidth="3" fill="red" />
     <g>
      <text x={300} y={800} fontFamily="sans-serif" fill="white">Hello</text>
      <text x={300} y={810} fontFamily="sans-serif" fill="red">World</text>
      </g>
      </svg>
    </div>
  );
};

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
    representation: 'Surface',
    camera: {
      zoom: 1.0
    }
  });
  const [viewId, setViewId] = React.useState<string>('-1');
  const [selectMode, setSelectMode] = React.useState<boolean>(false);
  const renderer = React.useRef<any>(null);

  React.useEffect(() => {
    Network.onReady((c: Network.Connection) => {
      setConn(c);
    });
    Network.connect({ sessionURL: 'ws://localhost:8080/ws' });
  });

  React.useEffect(() => {
  }, [renderer]);

  const onSelectPoint = (x: number, y: number) => {
    Network.call(conn, 'test.cellsatpoint', [x, y]);
  };

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
        onReset={() => Network.call(conn, 'test.resetcamera', [])}
        onSet={(value: PvType.CameraAttr) => {
          const newViewState = { ...viewState, camera: value };
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
          Network.call(conn, 'test.setviewstate', [newViewState]);
          setViewState(newViewState);
        }}
        value={viewState.representation}
      />
      <Button onClick={() => setSelectMode(!selectMode)}>
        {selectMode ? 'Cancel' : 'Select Points'}
      </Button>

      <div
        style={{
          // border: '4px solid red',
          // CSS book Chapter 11 (p526): The position has to be non-static to
          // make it the parent of the inner components.
          position: 'relative',
          flexGrow: 1,
          minHeight: 0
        }}
      >
        <Renderer
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: 0,
            right: 0,
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
        { selectMode
          ? (
            <Overlay
              style={{
                position: 'absolute',
                border: '1px solid purple',
                height: '100%',
                width: '100%',
                left: 0,
                right: 0,
                minHeight: 0
              }}
              onSelectPoint={onSelectPoint}
            />
          ) : null }
      </div>
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

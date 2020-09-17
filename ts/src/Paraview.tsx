import * as React from 'react';

import ResizeObserver from 'resize-observer-polyfill';
import VtkRenderer from 'paraviewweb/src/React/Renderers/VtkRenderer';

import * as Network from './Network.ts';
import RepresentationPanel from './RepresentationPanel.tsx';
import CameraControlPanel from './CameraControlPanel.tsx';
import * as PvType from './PvType.ts';
import Debouncer from './Debouncer.ts';

interface OverlayProps {
  style: React.CSSProperties;
}

const Overlay: React.FC<OverlayProps> = (props) => {
  const overlay = React.useRef<any>(null);
  const observer = React.useRef<ResizeObserver|null>(null);
  const debouncer = React.useRef<Debouncer|null>(null)
  interface Size {
    height: number;
    width: number;
  }
  const [canvasSize, setCanvasSize] = React.useState<Size>({ height: 0, width: 0 });


  React.useEffect(() => {
    const c = overlay.current;
    if (observer.current === null) {
      const onClick = (e) => {
        console.log(`mouse click (${e.clientX},${e.clientY})`);
      };

      debouncer.current = new Debouncer();
      observer.current = new ResizeObserver(() => {
        if (c.clientWidth !== canvasSize.width ||
          c.clientHeight !== canvasSize.height) {
          debouncer.current.run(() => {
            console.log(`Resize: ${c.clientWidth} ${c.clientHeight}`);
            setCanvasSize({
              width: c.clientWidth,
              height: c.clientHeight,
            });
          });
        }
      });
      c.addEventListener("click", onClick);
      return () => {
        observer.current.unobserve(c);
        debouncer.current.stop();
        c.removeEventListener("click", onClick);
      };
    }
  }, [overlay]);

  return (
    <div
      style={props.style}
      ref={overlay}>
      <svg
    style={{
      position: 'absolute',
      width: '100%',
      height: '100%',
      border: '2px solid purple'}}>
      <circle cx={400} cy={900} r={40} stroke="black" strokeWidth="3" fill="red" />
      </svg>
    </div>);
}

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
      <div
        style={{
          // border: '4px solid red',
          // CSS book Chapter 11 (p526): The position has to be non-static to
          // make it the parent of the inner components.
          position: 'relative',
          flexGrow: 1,
          minHeight: 0,
        }}>
      <Renderer
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: 0,
          right: 0,
          minHeight: 0,
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
        <Overlay
        style={{
          position: 'absolute',
          border: '1px solid purple',
          height: '100%',
          width: '100%',
          left: 0,
          right: 0,
          minHeight: 0,
        }}/>
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

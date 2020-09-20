import * as React from 'react';

import Button from '@material-ui/core/Button';

import ResizeObserver from 'resize-observer-polyfill';
import VtkRenderer from 'paraviewweb/src/React/Renderers/VtkRenderer';

import * as Network from './Network.ts';
import RepresentationPanel from './RepresentationPanel.tsx';
import CameraControlPanel from './CameraControlPanel.tsx';
import * as PvType from './PvType.ts';
import Debouncer from './Debouncer.ts';

interface Vector3 {
  x: number;
  y: number;
  z: number;
}

interface CellMetric {
  name: string
  real?: number;
  vector3?: Vector3;
}

interface CellState {
  screenX?: number;
  screenY?: number;
  center: Vector3;
  data: CellMetric[];
}

interface OverlayProps {
  connection: Network.Connection;
  style: React.CSSProperties;
}


const drawData = (key: string, x: number, y: number, d: CellMetric) => (
  <text
    key={key}
    x={x}
    y={y}
    fontFamily="sans-serif"
    fill="white"
  >
    {d.real
      ? `${d.name}: ${d.real.toFixed(4)}`
      : `${d.name}: (${d.vector3.x.toFixed(4)},${d.vector3.y.toFixed(4)},${d.vector3.z.toFixed(4)})`}
  </text>
);

const drawCell = (c: CellState) => {
  const key = `${c.screenX}:${c.screenY}`;
  return (
    <React.Fragment key={key}>
      <text
        key={key}
        x={c.screenX}
        y={c.screenY}
        fontFamily="sans-serif"
        fill="white"
      >
        {`(${c.center.x.toFixed(4)},${c.center.y.toFixed(4)},${c.center.z.toFixed(4)})`}
      </text>
      {c.data.map((d, i) => drawData(`${key}:${i}`, c.screenX, c.screenY + (i + 1) * 20, d))}
    </React.Fragment>
  );
};


const Overlay: React.FC<OverlayProps> = (props) => {
  const ref = React.useRef<any>(null);
  const observer = React.useRef<ResizeObserver|null>(null);
  const [cells, setCells] = React.useState<CellState[]>([]);

  const onSelectPoint = (x: number, y: number) => {
    const py = ref.current.clientHeight - y; // paraview coordinate is upside down.
    Network.call(props.connection, 'test.cellsatpoint', [x, py]).then((newCells: CellState[]) => {
      const n = [...cells];
      newCells.forEach((c) => {
        // The Y axis grows bottom to top on the server, but top to bottom on
        // the client.
        n.push({...c, screenY: ref.current.clientHeight-c.screenY})
      });
      setCells(n);
    });
  };

  React.useEffect(() => {
    const c = ref.current;
    if (observer.current === null) {
      const onClick = (e) => {
        console.log(`mouse click client=(${e.clientX},${e.clientY}) off=(${e.offsetX},${e.offsetY}) size=(${c.clientWidth},${c.clientHeight})`);
        onSelectPoint(e.offsetX, e.offsetY);
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
      ref={ref}
    >
      <svg
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          // TODO(saito): need a better indication of active svg overlay.
          border: '10px solid purple',
          boxSizing: "border-box",
        }}
      >
        <g>
          {cells.map(drawCell)}
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
        {selectMode ? 'Cancel' : 'Show cell data'}
      </Button>

      <div
    style={{
      // Explicitly set the position this div to a
      // non-static value.  Otherwise, the children of this element will bypass
      // this div when finding the containing block for absolute placement.
      //
      // Ref: // CSS2 9.3.2
      // (https://www.w3.org/TR/CSS2/visuren.html#absolute-positioning) and
      // CSS the definitive guide (4th ed), Ch 11.
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
              connection={conn}
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

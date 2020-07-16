import { createClient } from 'paraviewweb/src/IO/WebSocket/ParaViewWebClient';
import SmartConnect from 'wslink/src/SmartConnect';

// Wslink client object.
export interface WslinkConnection {
  session: any;
  destroy: (timeout: number) => void;
}

// Paraview RPC protocol stub
export type Client = any;


export interface Connection {
  wslinkConn: WslinkConnection;
  // Paraview RPC protocol stub.
  client: Client;
}

let conn: Connection | null = null;
let client: Client | null = null;
let smartConnect = null;

export type ReadyCallback = (conn: Connection) => void;

let readyCallback: ReadyCallback = null;
let errorCallback = null;
let closeCallback = null;

const customProtocols = {
  // Time(session) {
  //     return {
  //         setTimeIndex: (idx) => {
  //             return session.call('visualizer.time.index.set', [ idx ]);
  //         },
  //         getTimeIndex: () => {
  //             return session.call('visualizer.time.index.get', []);
  //         },
  //     };
  // },
};

function start(wslinkConn: WslinkConnection) {
  conn = {
    wslinkConn: wslinkConn,
    client: createClient(
      wslinkConn,
      [
        'ColorManager',
        'FileListing',
        'MouseHandler',
        'SaveData',
        'ProxyManager',
        'TimeHandler',
        'ViewPort',
        'VtkImageDelivery',
        'VtkGeometryDelivery',
      ],
      customProtocols
    )
  };
  if (readyCallback) {
    readyCallback(conn);
  }
}

function error(sConnect, message: string) {
  console.log('error', sConnect, message);
  if (errorCallback) {
    errorCallback(message);
  }
}

function close(sConnect) {
  console.log('close', sConnect);
  if (closeCallback) {
    closeCallback(sConnect);
  }
}

function exit(timeout = 60) {
  if (conn) {
    conn.wslinkConn.destroy(timeout);
    conn = null;
  }
}

export function connect(config) {
  if (conn) {
    console.log("Connect: noop");
    return;
  }
  console.log(`Connect! ${config}`);
  smartConnect = SmartConnect.newInstance({ config });
  smartConnect.onConnectionReady(start);
  smartConnect.onConnectionError(error);
  smartConnect.onConnectionClose(close);
  smartConnect.connect();
}

export function onReady(callback: ReadyCallback) {
  console.log(`onReady ${callback}`);
  if (conn) {
    callback(conn);
  } else {
    readyCallback = callback;
  }
}

export function onError(callback) {
  errorCallback = callback;
}

export function onClose(callback) {
  closeCallback = callback;
}

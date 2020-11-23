import { createClient } from 'paraviewweb/src/IO/WebSocket/ParaViewWebClient';
import SmartConnect from 'wslink/src/SmartConnect';

// Wslink client object.
export interface WslinkConnection {
  getSession: () => any;
  session: any;
  destroy: (timeout: number) => void;
}

export interface Connection {
  wslinkConn: WslinkConnection;
  // Paraview RPC protocol stub.
  client: any;
}

let conn: Connection | null = null;
let smartConnect = null;

export type ReadyCallback = (conn: Connection) => void;

let readyCallback: ReadyCallback = null;

function start(wslinkConn: WslinkConnection) {
  conn = {
    wslinkConn,
    client: createClient(
      wslinkConn,
      [
        'MouseHandler',
        'ProxyManager',
        'ViewPort',
        'VtkImageDelivery',
        'VtkGeometryDelivery'
      ],
      []
    )
  };
  if (readyCallback) {
    readyCallback(conn);
  }
}

export function connect(config) {
  if (conn) {
    return;
  }
  console.log(`Connect! ${config}`);
  smartConnect = SmartConnect.newInstance({ config });
  smartConnect.onConnectionReady(start);
  smartConnect.onConnectionError((cn, message) => {
    console.log('error', cn, message);
  });
  smartConnect.onConnectionClose((cn) => {
    console.log('close', cn);
  });
  smartConnect.connect();
}

export function onReady(callback: ReadyCallback) {
  readyCallback = callback;
  if (conn) {
    callback(conn);
  }
}

export function call(cn: Connection, methodName: string, args: any[]): Promise<any> {
  if (!cn) {
    // TODO(saito): create a new connection and retry.
    throw new Error(`${{ methodName }}: not connected`);
  }
  console.log(`Call: method=${methodName} args=${JSON.stringify(args)}`);
  return cn.wslinkConn.getSession().call(methodName, args);
}

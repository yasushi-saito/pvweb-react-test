declare namespace __wslink {
  export class Websocket {}
}

declare module 'wslink/src/WebsocketConnection' {
  export import Websocket = __wslink.Websocket;

  export function newInstance(config: any) : __wslink.Websocket;
}

// wslink/src is a dummy module that exists only to export common types.
declare module 'wslink/src' {
  export type Websocket = __wslink.Websocket;

}

declare module 'wslink/src/SmartConnect' {
  type Websocket = __wslink.Websocket; // private alias

  export interface Config {
    sessionURL?: string;
    sessionManagerURL?: string;
    secret?: string;
    retry?: number;
  }

  export interface NewInstanceConfig {
    config: Config;
  }

  interface SmartConnectInterface {
    newInstance(config: NewInstanceConfig) : any; // TODO(saito) this isn't a void
  }

  const SmartConnect : SmartConnectInterface;
  export default SmartConnect;

  export interface Connecter {
    // Start connection.
    connect(): void;

    onConnectionReady(c: Websocket) : void;
    onConnectionError(c: Websocket) : void;
    onConnectionClose(c: Websocket) : void;
    getConfig() : any;
    getConfigDecorator(): any;
    setConfigDecorator(c: any) : void;
  }
}

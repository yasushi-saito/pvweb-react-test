import * as React from 'react';

import VtkRenderer from 'paraviewweb/src/React/Renderers/VtkRenderer';
import VtkGeometryRenderer from 'paraviewweb/src/React/Renderers/VtkGeometryRenderer';

//import network from './network';
//import ImageProviders from './ImageProviders';
//import LocalRenderingImageProvider from './LocalRenderingImageProvider';

interface Props {
  resetCamera : () => void;
  showFPS: boolean;
  remoteRendering: boolean;
  interactiveQuality: number; // 50
  interactiveRatio: number; // 1
  throttleTime: number; // 16.6
  serverMaxFPS: number; // 30
}

const ParaView: React.FunctionComponent<Props> = (props) => {
  const client = network.getClient();
  const connection = network.getConnection();
  const { session } = connection;

  const [remoteRendering, setRemoteRendering] = React.useState<boolean>(true);

  React.useEffect(() => {
    setImageProvider();
  });

  const setImageProvider = () => {
    if (this.renderer.binaryImageStream) {
      ImageProviders.setImageProvider(this.renderer.binaryImageStream);
    } else {
      if (!this.localRenderingImageProvider) {
        this.localRenderingImageProvider = new LocalRenderingImageProvider();
      }
      ImageProviders.setImageProvider(this.localRenderingImageProvider);
    }
  }

  const Renderer = remoteRendering
    ? VtkRenderer
    : VtkGeometryRenderer;
  return (
        <Renderer
          ref={(c) => {
            this.renderer = c;
          }}
          client={client}
          viewId={this.props.viewId}
          connection={connection}
          session={session}
          onImageReady={
            () => console.log("image ready")
          }
          viewIdUpdated={
            (viewId) => console.log(`view updated: ${viewId} ${typeof(viewId)}`)
          }
          onBusyChange={
            (status) => console.log(`status updated: ${status} ${typeof(status)}`)
          }
          showFPS={props.showFPS}
          oldImageStream={!remoteRendering}
          resizeOnWindowResize
          clearOneTimeUpdatersOnUnmount
          clearInstanceCacheOnUnmount
          interactiveQuality={props.interactiveQuality}
          interactiveRatio={props.interactiveRatio}
          throttleTime={props.throttleTime}
          maxFPS={props.serverMaxfps}
        />
    );
};

                                                                export default Paraview;

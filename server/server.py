#!/usr/bin/env python3

import os
import sys
import argparse
from typing import Optional

# import paraview modules.
from paraview.web import pv_wslink
from paraview.web import protocols as pv_protocols

import wslink.server

# import RPC annotation
# from wslink import register as exportRpc

from paraview import simple

# from wslink import server


# =============================================================================
# Create custom Pipeline Manager class to handle clients requests
# =============================================================================


class Server(pv_wslink.PVServerProtocol):
    _args: Optional[argparse.Namespace] = None
    authKey = "wslink-secret"

    @staticmethod
    def configure(args: argparse.Namespace) -> None:
        Server._args = args

    def initialize(self) -> None:
        assert Server._args is not None
        if False:
            self.registerVtkWebProtocol(
                pv_protocols.ParaViewWebStartupRemoteConnection(
                    None, 11111, None, 11111, -1
                )
            )
            self.registerVtkWebProtocol(
                pv_protocols.ParaViewWebFileListing(
                    args.content,
                    "Home",
                    "^\\.|~$|^\\$",  # exclude regex
                    "[0-9]+\\.[0-9]+\\.|[0-9]+\\.",  # group regex
                )
            )

        # self.registerVtkWebProtocol(pv_protocols.ParaViewWebStartupPluginLoader(_VisualizerServer.plugins))
        # self.registerVtkWebProtocol(pv_protocols.ParaViewWebFileListing(_args.path, "Home", None, None))
        self.registerVtkWebProtocol(pv_protocols.ParaViewWebMouseHandler())
        self.registerVtkWebProtocol(pv_protocols.ParaViewWebViewPort(1.0, 2560, 1440))
        self.registerVtkWebProtocol(
            pv_protocols.ParaViewWebPublishImageDelivery(decode=False)
        )
        self.registerVtkWebProtocol(pv_protocols.ParaViewWebLocalRendering())
        self.updateSecret(Server.authKey)

        # tell the C++ web app to use no encoding. ParaViewWebPublishImageDelivery must be set to decode=False to match.
        self.getApplication().SetImageEncoding(0)

        # Disable interactor-based render calls
        view = simple.GetRenderView()
        view.EnableRenderOnInteraction = 0
        view.Background = [0, 0, 0]

        self.cone = simple.Cone()
        self.cone_display = simple.Show(self.cone, view)
        self.cone_display.Representation = "Surface"

        # ProxyManager helper
        pxm = simple.servermanager.ProxyManager()

        # Update interaction mode
        interactionProxy = pxm.GetProxy("settings", "RenderViewInteractionSettings")
        interactionProxy.Camera3DManipulators = [
            "Rotate",
            "Pan",
            "Zoom",
            "Pan",
            "Roll",
            "Pan",
            "Zoom",
            "Rotate",
            "Zoom",
        ]

        # Custom rendering settings
        renderingSettings = pxm.GetProxy("settings", "RenderViewSettings")
        renderingSettings.LODThreshold = 102400


# =============================================================================
# Main: Parse args and start server
# =============================================================================

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="ParaView Web Visualizer")
    wslink.server.add_arguments(parser)
    args = parser.parse_args()
    Server.configure(args)
    wslink.server.start_webserver(options=args, protocol=Server)

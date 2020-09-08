#!/usr/bin/env python3

import os
import sys
import argparse
import logging
import traceback

from paraview.web import pv_wslink
from paraview.web import protocols as pv_protocols

import wslink.server

from wslink import register as exportRPC

from paraview import simple

class Handler(pv_protocols.ParaViewWebProtocol):
    def __init__(self, image_delivery) -> None:
        super().__init__()
        self._image_delivery = image_delivery

        # Disable interactor-based render calls
        self._view = simple.GetRenderView()
        self._view.EnableRenderOnInteraction = 0
        self._view.Background = [0, 0, 0]
        self._view_id = f"{self._view.GetGlobalID()}"

        # https://www.thingiverse.com/thing:433119
        self._obj = simple.OpenDataFile("/home/saito/src0/testdata/pug.stl")
        self._obj_display = simple.Show(self._obj, self._view)
        self._obj_display.Representation = "Surface"

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

    @exportRPC("test.setrepresentation")
    def set_representation(self, repr_type: str) -> None:
        try:
            self._obj_display.Representation = repr_type
            self._image_delivery.imagePush({"view": self._view_id})

        except:
            traceback.print_exc()
            raise

class Server(pv_wslink.PVServerProtocol):
    authKey = "wslink-secret"

    def initialize(self) -> None:
        self.registerVtkWebProtocol(pv_protocols.ParaViewWebMouseHandler())
        self.registerVtkWebProtocol(pv_protocols.ParaViewWebViewPort(1.0, 2560, 1440))
        self._image_delivery = pv_protocols.ParaViewWebPublishImageDelivery(decode=False)
        self.registerVtkWebProtocol(self._image_delivery)
        self.registerVtkWebProtocol(pv_protocols.ParaViewWebLocalRendering())
        self.registerVtkWebProtocol(Handler(self._image_delivery))
        self.updateSecret(Server.authKey)
        self.getApplication().SetImageEncoding(0)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Test")
    wslink.server.add_arguments(parser)
    args = parser.parse_args()
    wslink.server.start_webserver(options=args, protocol=Server)

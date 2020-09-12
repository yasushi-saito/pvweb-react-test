#!/usr/bin/env python3

import os
import sys
import argparse
import logging
import traceback

import numpy as np

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
        self._view.Background2 = [0, 0, 0]
        self._view_id = f"{self._view.GetGlobalID()}"

        # https://www.thingiverse.com/thing:433119
        self._obj = simple.OpenDataFile("/home/saito/src0/testdata/pug.stl")
        simple.UpdatePipeline(proxy=self._obj)

        di = self._obj.GetDataInformation()
        camera = self._view.GetActiveCamera()
        bounds = di.GetBounds()
        min_bound = np.array((bounds[0], bounds[2], bounds[4]))
        max_bound = np.array((bounds[1], bounds[3], bounds[5]))
        centroid = (min_bound + max_bound) / 2.0
        logging.info(f"Bounds {min_bound} {max_bound} {centroid}")
        self._view.AxesGrid.Visibility = True  # ParaviewGuide, Chaper 18
        self._view.ResetCamera()
        camera.SetFocalPoint(centroid[0], centroid[1], centroid[2])
        camera.FocalDistance = np.linalg.norm(centroid) * 10
        self._view.CenterOfRotation = [centroid[0], centroid[1], centroid[2]]
        self._view.Update()

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
    logging.basicConfig(level=logging.DEBUG)
    parser = argparse.ArgumentParser(description="Test")
    wslink.server.add_arguments(parser)
    args = parser.parse_args()
    wslink.server.start_webserver(options=args, protocol=Server)

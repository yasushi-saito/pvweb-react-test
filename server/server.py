#!/usr/bin/env python3

import os
import sys
import argparse
import logging
import traceback
import numpy as np

from typing import TypedDict, Optional

from paraview.web import pv_wslink
from paraview.web import protocols as pv_protocols

import wslink.server

from wslink import register as exportRPC

from paraview import simple

Vector3 = TypedDict("Vector3", {"x": float, "y": float, "z": float})

CameraAttr = TypedDict(
    "CameraAttr", {"zoom": Optional[float], "centerOfRotation": Optional[Vector3],}
)

ViewState = TypedDict(
    "ViewState", {"camera": CameraAttr, "representation": Optional[str],}
)


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

        self._view.AxesGrid.Visibility = True  # ParaviewGuide, Chaper 18
        self._reset_camera()
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

    def _reset_camera(self) -> None:
        di = self._obj.GetDataInformation()
        camera = self._view.GetActiveCamera()
        logging.info(f"CAMER: {camera.__dict__}")
        help(camera)
        logging.info("CAMER2")
        bounds = di.GetBounds()
        min_bound = np.array((bounds[0], bounds[2], bounds[4]))
        max_bound = np.array((bounds[1], bounds[3], bounds[5]))
        centroid = (min_bound + max_bound) / 2.0
        self._view.ResetCamera()
        logging.info(f"Bounds min={min_bound} max={max_bound} center={centroid}")
        self._view.CameraFocalPoint = (centroid[0], centroid[1], centroid[2])
        self._view.CenterOfRotation = [centroid[0], centroid[1], centroid[2]]

        camera_position = np.array(self._view.CameraPosition)
        self._zoom = 1.0
        self._default_camera_distance = np.linalg.norm((camera_position - centroid))

        v = self._view
        logging.info(
            f"Camera: par={v.CameraParallelProjection} scale={v.CameraParallelScale} disk={v.CameraFocalDisk} point={v.CameraFocalPoint} dist={v.CameraFocalDistance}"
        )
        logging.info(
            f"Camera2: dist={self._default_camera_distance} pos={v.CameraPosition} angle={v.CameraViewAngle} up={v.CameraViewUp}"
        )

    def _view_state(self) -> ViewState:
        cor = self._view.CenterOfRotation
        return {
            "representation": str(self._obj_display.Representation),
            "camera": {
                "zoom": self._zoom,
                "centerOfRotation": {"x": cor[0], "y": cor[1], "z": cor[2],},
            },
        }

    @exportRPC("test.resetcamera")
    def set_reset_camera(self) -> ViewState:
        try:
            self._reset_camera()
            self._view.Update()
            self._image_delivery.imagePush({"view": self._view_id})
            return self._view_state()
        except:
            traceback.print_exc()
            raise

    @exportRPC("test.setviewstate")
    def set_view_state(self, attr: ViewState) -> ViewState:
        try:
            logging.info(f"set_view_state start: {attr}")
            v = self._view

            logging.info(
                f"Camera: par={v.CameraParallelProjection} scale={v.CameraParallelScale} disk={v.CameraFocalDisk} point={v.CameraFocalPoint} dist={v.CameraFocalDistance}"
            )
            logging.info(
                f"Camera2: pos={v.CameraPosition} angle={v.CameraViewAngle} up={v.CameraViewUp}"
            )

            repr_type = attr.get("representation")
            if repr_type:
                self._obj_display.Representation = repr_type

            if (camera_state := attr.get("camera")) :
                zoom = camera_state.get("zoom")
                if zoom is not None and self._zoom != zoom:
                    if zoom < 0.000001:
                        raise Exception(f"invalid zoom level: {zoom}")
                    camera = self._view.GetActiveCamera()
                    if False:
                        # Manual implementation of Dolly. May be less prone to
                        # rounding errors.
                        focal_point = np.array(self._view.CameraFocalPoint)
                        cur_pos = np.array(self._view.CameraPosition)
                        cur_dist = np.linalg.norm(cur_pos - focal_point)
                        new_pos = (
                            focal_point
                            + (cur_pos - focal_point)
                            * self._default_camera_distance
                            / zoom
                            / cur_dist
                        )
                        self._view.CameraPosition = (new_pos[0], new_pos[1], new_pos[2])
                    else:
                        factor = zoom / self._zoom
                        camera.Dolly(factor)
                    self._zoom = zoom

                cor = camera_state.get("centerOfRotation")
                if cor is not None:
                    self._view.CameraFocalPoint = (cor["x"], cor["y"], cor["z"])
                    self._view.CenterOfRotation = (cor["x"], cor["y"], cor["z"])

            self._view.Update()
            self._image_delivery.imagePush({"view": self._view_id})

            return self._view_state()
        except:
            traceback.print_exc()
            raise


class Server(pv_wslink.PVServerProtocol):
    authKey = "wslink-secret"

    def initialize(self) -> None:
        self.registerVtkWebProtocol(pv_protocols.ParaViewWebMouseHandler())
        self.registerVtkWebProtocol(pv_protocols.ParaViewWebViewPort(1.0, 2560, 1440))
        self._image_delivery = pv_protocols.ParaViewWebPublishImageDelivery(
            decode=False
        )
        self.registerVtkWebProtocol(self._image_delivery)
        self.registerVtkWebProtocol(pv_protocols.ParaViewWebLocalRendering())
        self.registerVtkWebProtocol(Handler(self._image_delivery))
        self.updateSecret(Server.authKey)
        self.getApplication().SetImageEncoding(0)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    parser = argparse.ArgumentParser(description="Test")
    wslink.server.add_arguments(parser)
    args = parser.parse_args()
    wslink.server.start_webserver(options=args, protocol=Server)

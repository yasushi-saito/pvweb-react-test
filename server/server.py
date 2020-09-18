#!/usr/bin/env python3

import os
import sys
import argparse
import logging
import traceback
import numpy as np

from typing import TypedDict, Optional, Dict, List

from paraview.web import pv_wslink
from paraview.web import protocols as pv_protocols
from vtkmodules.vtkCommonCore import vtkCollection

import wslink.server

from wslink import register as exportRPC

from paraview import simple

Vector3 = TypedDict("Vector3", {"x": float, "y": float, "z": float})

CameraAttr = TypedDict(
    "CameraAttr", {
        "defaultDistance": Optional[float],
        "position": Optional[Vector3],
        "focalPoint": Optional[Vector3],
        "viewUp": Optional[Vector3],
    }
)

ViewState = TypedDict(
    "ViewState", {"camera": CameraAttr, "representation": Optional[str],}
)

def _list_multiblock_components(filter_node) -> Dict[str, int]:
    result: Dict[str, int] = {}

    def _rec(node, level: int) -> None:
        cdi = node.GetCompositeDataInformation()
        for i in range(cdi.GetNumberOfChildren()):
            name = cdi.GetName(i)
            logging.info(f"NAME({level}): {name}")
            seq = len(result)
            result[name] = seq
            if (di := cdi.GetDataInformation(i)) is not None:
                _rec(di, level+1)

    _rec(filter_node.GetDataInformation(), 0)
    return result

def _extract_blocks(node, block_names: List[str]):
    blocks = _list_multiblock_components(node)
    block_ids = [id for (name, id) in blocks.items() if name in block_names]
    new_node = simple.ExtractBlock(Input=node)
    new_node.BlockIndices = block_ids
    logging.info(f"BLOCKS: {block_ids} {blocks}")
    return new_node


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
        self._obj = simple.OpenDataFile("/home/saito/fvm_results/oneram6_mixed_0005_000_001.lcsoln")
            #"/home/saito/src0/testdata/pug.stl")
        simple.UpdatePipeline(proxy=self._obj)
        #self._obj = _extract_blocks(self._obj, ["0/elem"])
        #simple.UpdatePipeline(proxy=self._obj)

        self._view.AxesGrid.Visibility = True  # ParaviewGuide, Chaper 18
        self._reset_camera()
        self._view.Update()
        logging.info(f"viewsize: {self._view.ViewSize}")

        self._obj_display = simple.Show(self._obj, self._view)
        self._obj_display.Representation = "Surface"
        simple.ColorBy(self._obj_display, ("CELLS", "Density"))

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
        logging.info(f"viewsize: {self._view.ViewSize}")
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
        viewUp = self._view.CameraViewUp
        return {
            "representation": str(self._obj_display.Representation),
            "camera": {
                "zoom": self._zoom,
                "focalPoint": {"x": cor[0], "y": cor[1], "z": cor[2],},
                "viewUp": {"x": viewUp[0], "y": viewUp[1], "z": viewUp[2]},
            },
        }

    @exportRPC("test.showvalueatpoint")
    def set_show_value_at_point(self, x: float, y: float, points: bool) -> ViewState:
        try:
            logging.info(f"viewsize: {self._view.ViewSize}")
            logging.info(f"SELECT: {x} {y} {points}")
            logging.info(f"SELECT0.0: {len(self._obj.CellData)}")

            reprs = vtkCollection()
            sources = vtkCollection()
            found = self._view.SelectSurfaceCells([x, y, x, y], reprs, sources)
            logging.info(f"SELECT: found={found} #repr={reprs.GetNumberOfItems()} #src={sources.GetNumberOfItems()}")
            if found and reprs.GetNumberOfItems() == 1 and sources.GetNumberOfItems() == 1:
                sm = simple.servermanager
                repr = sm._getPyProxy(reprs.GetItemAsObject(0))
                sel = sm._getPyProxy(sources.GetItemAsObject(0))
                logging.info(f"SELECT3.0: {type(repr)} {type(repr.Input)} {sel}")
                logging.info(f"SELECT3.0X: {repr}")
                #logging.info(f"SELECT3.0X: {len(repr.CellData)}")
                if True:
                    selectionX = simple.ExtractSelection(Input=self._obj, Selection=sel)
                    selectionX.UpdatePipeline()
                    logging.info(f"SELECT3.1: {selectionX}")
                    logging.info(f"SELECT3.2: {len(selectionX.CellData)}")
                selection = simple.ExtractSelection(Input=repr.Input, Selection=sel)
                selection = simple.MergeBlocks(Input=selection)
                selection.UpdatePipeline()
                if True:
                    cd = selection.CellData
                    logging.info(f"SELECT3.1: {len(cd)}")
                    for key, v in cd.items():
                        logging.info(f"SELECT3.1: key={key} #tuples={v.GetNumberOfTuples()} #comp={v.GetNumberOfComponents()}")

                mb_dataset = selection.GetClientSideObject().GetOutput()
                if True:
                    selectedData = mb_dataset.GetCellData()
                    nbArrays = selectedData.GetNumberOfArrays()
                    logging.info(f"SELECT4: {type(mb_dataset)} {type(selectedData)} narray={nbArrays}")
                    for i in range(nbArrays):
                        array = selectedData.GetAbstractArray(i)
                        ntuple =array.GetNumberOfTuples()
                        logging.info(f"ARRAY({i}) {array.GetName()}: #comp={array.GetNumberOfComponents()} #tuple={ntuple}")
                        for j in range(min(ntuple, 3)):
                            logging.info(f"DATA({i})-({j}) {array.GetName()} ({j}): {array.GetTuple(j)}")

                        #help(array)

                    wc = mb_dataset.GetPoints()
                    if wc:
                        npoint = wc.GetNumberOfPoints()
                        xsum, ysum, zsum = 0.0, 0.0, 0.0
                        for j in range(npoint):
                            p = wc.GetPoint(j)
                            logging.info(f"ARRAY2-{i}-{j}: n={wc.GetNumberOfPoints()} {p}")
                            xsum += p[0]
                            ysum += p[1]
                            zsum += p[2]
                        x,y,z = xsum/npoint, ysum/npoint, zsum/npoint
                        logging.info(f"ARRAY2-{i}: center=({x},{y},{z})")

                    #logging.info(f"DATASET: {type(mb_dataset)} n={mb_dataset.GetNumberOfBlocks()}")
                if False:
                    for i in range(mb_dataset.GetNumberOfBlocks()):
                        dataset = mb_dataset.GetBlock(i)
                        logging.info(f"DATASET {i}: {type(dataset)}")
                        if not dataset:
                            continue

                        selectedData = dataset.GetCellData()
                        nbArrays = selectedData.GetNumberOfArrays()
                        logging.info(f"SELECT4-{i}: {type(dataset)} {type(selectedData)} narray={nbArrays}")
                        #logging.info(f"SELECT5: {dataset}")
                        #logging.info(f"SELECT6: {selectedData}")

                        for i in range(nbArrays):
                            array = selectedData.GetAbstractArray(i)
                            logging.info(f"ARRAY-{i}: {array}")

                        wc = dataset.GetPoints()
                        if wc:
                            npoint = wc.GetNumberOfPoints()
                            xsum, ysum, zsum = 0.0, 0.0, 0.0
                            for j in range(npoint):
                                p = wc.GetPoint(j)
                                logging.info(f"ARRAY2-{i}-{j}: n={wc.GetNumberOfPoints()} {p}")
                                xsum += p[0]
                                ysum += p[1]
                                zsum += p[2]
                            x,y,z = xsum/npoint, ysum/npoint, zsum/npoint
                            logging.info(f"ARRAY2-{i}: center=({x},{y},{z})")
            return self._view_state()
        except:
            traceback.print_exc()
            raise

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
                viewUp = camera_state.get("viewUp")
                if viewUp is not None:
                    self._view.CameraViewUp = (viewUp["x"], viewUp["y"], viewUp["z"])

                zoom = camera_state.get("zoom")
                if zoom is not None and self._zoom != zoom:
                    if zoom < 0.000001:
                        raise Exception(f"invalid zoom level: {zoom}")
                    camera = self._view.GetActiveCamera()
                    if True:
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
    logging.basicConfig(level=logging.INFO, format="%(levelname)s:%(filename)s:%(lineno)s: %(message)s")
    parser = argparse.ArgumentParser(description="Test")
    wslink.server.add_arguments(parser)
    args = parser.parse_args()
    wslink.server.start_webserver(options=args, protocol=Server)

"""Simulation control routes — start, pause, tick, speed."""

from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()

_running = False
_speed = 1


class SpeedRequest(BaseModel):
    multiplier: int


@router.post("/start")
async def start():
    global _running
    _running = True
    return {"running": True}


@router.post("/pause")
async def pause():
    global _running
    _running = False
    return {"running": False}


@router.post("/speed")
async def set_speed(req: SpeedRequest):
    global _speed
    _speed = max(1, min(req.multiplier, 1000))
    return {"speed": _speed}


@router.get("/status")
async def status():
    return {"running": _running, "speed": _speed}

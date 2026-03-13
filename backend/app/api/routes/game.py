"""Game CRUD routes — new game, save, load, state queries."""

from __future__ import annotations

from fastapi import APIRouter

from app.models.state import GameState

router = APIRouter()

# In-memory game state (single-player for now)
_current_game: GameState | None = None


@router.post("/new", response_model=GameState)
async def new_game():
    global _current_game
    _current_game = GameState()
    return _current_game


@router.get("/state", response_model=GameState)
async def get_state():
    if _current_game is None:
        return GameState()
    return _current_game


@router.get("/body/{body_name}")
async def get_body(body_name: str):
    state = _current_game or GameState()
    body_map = {
        "earth": state.earth,
        "moon": state.moon,
        "venus": state.venus,
        "mars": state.mars,
        "asteroids": state.asteroids,
    }
    body = body_map.get(body_name.lower())
    if body is None:
        return {"error": f"Unknown body: {body_name}"}
    return body

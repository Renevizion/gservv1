from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import get_db
from models import Server
from workers.provisioner import provision_server, deprovision_server, restart_server

router = APIRouter(prefix="/servers", tags=["servers"])


class ServerStatusResponse(BaseModel):
    id: int
    name: str
    game: str
    status: str
    ip_address: str | None
    port: int | None
    region: str | None
    max_players: int


@router.post("/{server_id}/provision")
async def trigger_provision(
    server_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    server = db.query(Server).filter(Server.id == server_id).first()
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")
    if server.status == "running":
        raise HTTPException(status_code=409, detail="Server is already running")
    server.status = "provisioning"
    db.commit()
    background_tasks.add_task(provision_server, server_id, db)
    return {"status": "provisioning", "server_id": server_id}


@router.post("/{server_id}/stop")
async def trigger_stop(
    server_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    server = db.query(Server).filter(Server.id == server_id).first()
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")
    if server.status == "stopped":
        raise HTTPException(status_code=409, detail="Server is already stopped")
    background_tasks.add_task(deprovision_server, server_id, db)
    return {"status": "stopping", "server_id": server_id}


@router.post("/{server_id}/restart")
async def trigger_restart(
    server_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    server = db.query(Server).filter(Server.id == server_id).first()
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")
    background_tasks.add_task(restart_server, server_id, db)
    return {"status": "restarting", "server_id": server_id}


@router.get("/{server_id}/status", response_model=ServerStatusResponse)
def get_server_status(server_id: int, db: Session = Depends(get_db)):
    server = db.query(Server).filter(Server.id == server_id).first()
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")
    return ServerStatusResponse(
        id=server.id,
        name=server.name,
        game=server.game,
        status=server.status,
        ip_address=server.ip_address,
        port=server.port,
        region=server.region,
        max_players=server.max_players,
    )

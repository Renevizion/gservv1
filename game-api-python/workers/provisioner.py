import asyncio
import random
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from models import Server

GAME_PORTS = {"minecraft": 25565, "gta5": 30120, "gta6": 30200, "other": 27015}
REGION_IP_BASE = {"us-east-1": "10.0.1.", "us-west-2": "10.0.2.", "eu-west-1": "10.0.3."}


async def provision_server(server_id: int, db: Session) -> None:
    """
    Simulate async server provisioning.
    Replace the sleep + fake IP with real orchestration calls
    (Kubernetes, Docker API, Pterodactyl, etc.) in production.
    """
    await asyncio.sleep(5)
    server: Server | None = db.query(Server).filter(Server.id == server_id).first()
    if not server:
        return
    base_ip = REGION_IP_BASE.get(server.region or "us-east-1", "10.0.1.")
    base_port = GAME_PORTS.get(server.game, 27015)
    server.status = "running"
    server.ip_address = f"{base_ip}{random.randint(100, 254)}"
    server.port = base_port + server_id
    server.updated_at = datetime.now(timezone.utc)
    db.commit()


async def deprovision_server(server_id: int, db: Session) -> None:
    await asyncio.sleep(2)
    server: Server | None = db.query(Server).filter(Server.id == server_id).first()
    if not server:
        return
    server.status = "stopped"
    server.updated_at = datetime.now(timezone.utc)
    db.commit()


async def restart_server(server_id: int, db: Session) -> None:
    server: Server | None = db.query(Server).filter(Server.id == server_id).first()
    if not server:
        return
    server.status = "restarting"
    server.updated_at = datetime.now(timezone.utc)
    db.commit()
    await asyncio.sleep(3)
    server.status = "running"
    server.updated_at = datetime.now(timezone.utc)
    db.commit()

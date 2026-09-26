from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db

router = APIRouter(prefix="/api/machines", tags=["runtime"])

ACTIVE_STATES = {models.RuntimeState.running}
VALID_STATES = {s.value: s for s in models.RuntimeState}


def _now():
    return datetime.utcnow()


def _account_running(machine: models.Machine, session: models.MachineRuntimeSession, now: datetime):
    """Move elapsed time since last_accounted_at into lifetime operating_hours."""
    if session.state != models.RuntimeState.running:
        return 0.0
    elapsed = max(0.0, (now - session.last_accounted_at).total_seconds())
    if elapsed:
        session.duration_seconds += elapsed
        session.last_accounted_at = now
        machine.operating_hours = float(machine.operating_hours or 0) + elapsed / 3600.0
    return elapsed


def _current_running(db: Session, machine_id: int):
    return (
        db.query(models.MachineRuntimeSession)
        .filter(
            models.MachineRuntimeSession.machine_id == machine_id,
            models.MachineRuntimeSession.state == models.RuntimeState.running,
            models.MachineRuntimeSession.ended_at.is_(None),
        )
        .order_by(models.MachineRuntimeSession.started_at.desc())
        .first()
    )


def _latest_session(db: Session, machine_id: int):
    return (
        db.query(models.MachineRuntimeSession)
        .filter_by(machine_id=machine_id)
        .order_by(models.MachineRuntimeSession.started_at.desc())
        .first()
    )


def _status(db: Session, machine: models.Machine, commit: bool = True):
    now = _now()
    session = _current_running(db, machine.id)
    if session:
        _account_running(machine, session, now)
        state = models.RuntimeState.running
    else:
        latest = _latest_session(db, machine.id)
        state = latest.state if latest else models.RuntimeState.stopped
    if commit:
        db.commit()
        db.refresh(machine)
    return state, session, now


@router.get("/{machine_id}/runtime", response_model=schemas.RuntimeStatusOut)
def runtime_status(machine_id: int, db: Session = Depends(get_db)):
    machine = db.get(models.Machine, machine_id)
    if not machine:
        raise HTTPException(404, "machine not found")
    state, session, now = _status(db, machine)
    return schemas.RuntimeStatusOut(
        machine_id=machine.id,
        state=state.value,
        operating_hours=round(float(machine.operating_hours or 0), 4),
        current_session_id=session.id if session else None,
        session_started_at=session.started_at if session else None,
        accumulated_session_seconds=round(session.duration_seconds, 1) if session else 0,
        last_accounted_at=session.last_accounted_at if session else None,
    )


@router.post("/{machine_id}/runtime", response_model=schemas.RuntimeStatusOut)
def set_runtime_state(machine_id: int, payload: schemas.RuntimeActionIn, db: Session = Depends(get_db)):
    machine = db.get(models.Machine, machine_id)
    if not machine:
        raise HTTPException(404, "machine not found")
    if payload.state not in VALID_STATES:
        raise HTTPException(400, "state must be running, idle, stopped, maintenance, or fault")

    target = VALID_STATES[payload.state]
    now = _now()
    current = _current_running(db, machine.id)

    # Account running time before changing state.
    if current:
        _account_running(machine, current, now)

    latest = _latest_session(db, machine.id)
    current_state = models.RuntimeState.running if current else (latest.state if latest else models.RuntimeState.stopped)

    if current_state == target and (target != models.RuntimeState.running or current):
        db.commit()
        return runtime_status(machine_id, db)

    if current:
        current.ended_at = now

    session = models.MachineRuntimeSession(
        machine_id=machine.id,
        state=target,
        started_at=now,
        last_accounted_at=now,
        source=payload.source,
    )
    db.add(session)
    db.commit()
    db.refresh(machine)
    return runtime_status(machine_id, db)


@router.get("/{machine_id}/runtime/history", response_model=List[schemas.RuntimeSessionOut])
def runtime_history(machine_id: int, db: Session = Depends(get_db)):
    if not db.get(models.Machine, machine_id):
        raise HTTPException(404, "machine not found")
    return (
        db.query(models.MachineRuntimeSession)
        .filter_by(machine_id=machine_id)
        .order_by(models.MachineRuntimeSession.started_at.desc())
        .limit(100)
        .all()
    )

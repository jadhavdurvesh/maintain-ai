from datetime import datetime, timedelta

from .database import SessionLocal, engine, Base
from . import models
from .alerts_engine import evaluate_all

Base.metadata.create_all(bind=engine)


def seed():
    db = SessionLocal()
    if db.query(models.Machine).first():
        print("Already seeded, skipping.")
        db.close()
        return

    machines = [
        models.Machine(
            machine_code="M-001", name="Induction Motor M-001", category="induction_motor",
            manufacturer="Siemens", model_number="1LE1001", location="Bay 3", department="Production",
            operating_hours=4950, criticality=models.Criticality.high,
            health_score=87, maintenance_interval_hours=500,
            last_maintenance_date=datetime(2026, 8, 15), next_maintenance_date=datetime(2026, 9, 15),
            installation_date=datetime(2022, 3, 1),
        ),
        models.Machine(
            machine_code="M-002", name="Centrifugal Pump P-002", category="pump",
            manufacturer="Grundfos", model_number="CR-15", location="Utility Room", department="Utilities",
            operating_hours=3120, criticality=models.Criticality.medium,
            health_score=58, maintenance_interval_hours=750,
            last_maintenance_date=datetime(2026, 7, 1), next_maintenance_date=datetime(2026, 10, 1),
            installation_date=datetime(2021, 6, 10),
        ),
        models.Machine(
            machine_code="M-003", name="Conveyor Belt C-003", category="conveyor",
            manufacturer="Interroll", model_number="CB-500", location="Packaging Line", department="Packaging",
            operating_hours=8700, criticality=models.Criticality.medium,
            health_score=34, maintenance_interval_hours=1000,
            last_maintenance_date=datetime(2026, 5, 20), next_maintenance_date=datetime(2026, 9, 1),
            installation_date=datetime(2019, 11, 5),
        ),
        models.Machine(
            machine_code="M-004", name="Air Compressor AC-004", category="compressor",
            manufacturer="Atlas Copco", model_number="GA-30", location="Compressor House", department="Utilities",
            operating_hours=2100, criticality=models.Criticality.high,
            health_score=95, maintenance_interval_hours=600,
            last_maintenance_date=datetime(2026, 8, 25), next_maintenance_date=datetime(2026, 11, 25),
            installation_date=datetime(2023, 1, 15),
        ),
    ]
    for m in machines:
        m.status = (
            models.HealthStatus.healthy if m.health_score >= 70
            else models.HealthStatus.attention if m.health_score >= 40
            else models.HealthStatus.critical
        )
    db.add_all(machines)
    db.commit()

    parts = [
        models.SparePart(name="Motor Bearing 6205", part_number="BRG-6205", quantity=2,
                          minimum_stock=5, compatible_machine_categories="induction_motor"),
        models.SparePart(name="Pump Impeller CR-15", part_number="IMP-CR15", quantity=3,
                          minimum_stock=2, compatible_machine_categories="pump"),
        models.SparePart(name="Conveyor Idler Roller", part_number="IDL-500", quantity=8,
                          minimum_stock=4, compatible_machine_categories="conveyor"),
    ]
    db.add_all(parts)

    users = [
        models.User(username="admin", full_name="System Administrator", role=models.UserRole.admin),
        models.User(username="tech1", full_name="Ravi Kulkarni", role=models.UserRole.technician),
        models.User(username="viewer1", full_name="Plant Manager", role=models.UserRole.viewer),
    ]
    db.add_all(users)
    db.commit()

    # An open fault + work order on the conveyor so Work Orders / Alerts aren't empty either.
    conveyor = db.query(models.Machine).filter_by(machine_code="M-003").first()
    db.add(models.FaultRecord(
        machine_id=conveyor.id, description="Belt drifting to one side under load",
        symptoms="belt drifting, rubbing, noise", severity=models.AlertSeverity.warning,
    ))
    db.add(models.WorkOrder(
        machine_id=conveyor.id, problem="Belt misalignment causing edge wear",
        priority=models.Priority.high,
        recommended_actions="Inspect idler alignment\nCheck material loading\nInspect belt edges",
    ))
    db.commit()

    evaluate_all(db)
    db.close()
    print("Seed complete.")


if __name__ == "__main__":
    seed()

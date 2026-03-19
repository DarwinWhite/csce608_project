from fastapi import APIRouter
import database as db

router = APIRouter(tags=["Gallery"])


@router.get("/gallery")
def get_gallery():
    return db.fetchone("SELECT * FROM Gallery LIMIT 1")

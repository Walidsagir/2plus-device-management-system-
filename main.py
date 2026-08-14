from fastapi import FastAPI,Depends, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from database import Users,init,get_db
from pydantic import BaseModel
from typing import Optional
from argon2 import PasswordHasher
from contextlib import asynccontextmanager



@asynccontextmanager
async def lifespan():
	init()
	yield


app = FastAPI(lifespan = lifespan) 
app.mount("/static",StaticFiles(directory = "static"),name = "static")


class SignupData(BaseModel):
	first_name : str
	last_name : str
	password : str
	email : str
	address: str
	phone_number: str
	is_organization : Optional[str]
	reg_number : Optional[str]
	
	
	



@app.get("/")
def login_page():
	with open("templates/index.html","r") as f:
		return HTMLResponse(f.read())

@app.post("/signup")
def signup(details:SignupData, db:Session = Depends(get_db)):
	try:
		user = Users(**details)
		db.commit()
		db.referesh(user)
	except exception as e:
		db.rollback()
		print(e)
	

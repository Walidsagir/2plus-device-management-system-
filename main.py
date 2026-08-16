from fastapi import FastAPI,Depends, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from database import Users,init,get_db
from pydantic import BaseModel
from typing import Optional
from argon2 import PasswordHasher
from contextlib import asynccontextmanager


ph = PasswordHasher()

@asynccontextmanager
async def lifespan(app:FastAPI):
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
	is_organization : Optional[bool] = False
	organization_name : Optional[str] = None
	organization_registration : Optional[str] = None

class loginData(BaseModel):
	email:str
	password:str
	



@app.get("/")
def login_page():
	with open("templates/index.html","r") as f:
		return HTMLResponse(f.read())

@app.post("/signup")
def signup(details:SignupData, db:Session = Depends(get_db)):
	try:
		user_data = details.dump()
		user_data["password"] = ph.hash(details.password)
		user = Users(**details)
		db.commit()
		db.referesh(user)
		return {"status":"success","message":"Account created successfully"}
	except Exception as e:
		db.rollback()
		print(e)
		return {"status":"failed","message":f"an error occured: {e}"}


@app.post("/login")
def logn(details:loginData,request:Request,db:Sesson=Depends(get_db)):
	email = details.email
	password  = details.password
	user= db.query(Users).filter(Users.email == email)
	if not user:
		return{"status":"failed","message":"User does not exists please signup"}
	try:
		ph.verify(password,user.password)
		return{"status":"success","messagee":"Login successfully"}
	except Exception as e:
		print("wrong password:",str(e))
		return{"status":"failed","message":"Incorrect user name or password"}
	

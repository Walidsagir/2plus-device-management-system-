from fastapi import FastAPI,Depends, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from database import Users,Organization,init,get_db
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
		user_data = details.dict()
		user_data["password"] = ph.hash(details.password)
		organization_name = user_data.pop("organization_name")
		organization_registration = user_data.pop("organization_registration")
		user = Users(**user_data)
		if details.is_organization:
			organization = Organization(
				organization_name = organization_name,
				organization_registration = organization_registration,
			)
			db.add(organization)
			db.flush()
			user.organization_id = organization.id
		db.add(user)
		db.commit()
		db.refresh(user)
		return {"status":"success","message":"Account created successfully"}
	except Exception as e:
		db.rollback()
		print(e)
		return {"status":"failed","message":f"an error occured: {e}"}


@app.post("/login")
def logn(details:loginData,request:Request,db:Session=Depends(get_db)):
	email = details.email
	password  = details.password
	user= db.query(Users).filter(Users.email == email).first()
	print("user:",user)
	if not user:
		return{"status":"failed","message":"User does not exists please signup"}
	try:
		ph.verify(user.password,password)
		return{"status":"success","message":"Login successfully"}
	except Exception as e:
		print("wrong password:",str(e))
		return{"status":"failed","message":"Incorrect user name or password"}
	

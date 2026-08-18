from fastapi import FastAPI,Depends, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from database import Users,Organization,init,get_db
from pydantic import BaseModel
from typing import Optional
from argon2 import PasswordHasher
from contextlib import asynccontextmanager
from datetime import datetime,timzone,timedelta
from zoneinfo import ZoneInfo


cutoff = datetime.now(ZoneInfo("Africa/Lagos")) - timedelta(days=10


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
		request.session["user_id"] = user.id
		return{"status":"success","message":"Login successfully"}
	except Exception as e:
		print("wrong password:",str(e))
		return{"status":"failed","message":"Incorrect user name or password"}
	
@app.get("/dashboard")
def dashboard(request: Request,db:Session=Depends(get_db)):
	user_id = request.session.get("user_id")
	if not user_id:
		raise HTTPException(
			status_code = 401,
			details = "Unauthorized Access"
		)
	user = db.query(Users).filter_by(id = user_id).first()
	first_name = user.name
	last_name = user.email
	phone_number = user.phone_number
	address = user.address
	email = user.email
	is_organization = user.is_organization
	if is_organization:
		org = user.organization
		org_name = org.organization_name
		org_reg = org.organization_registration
		org_devices = org.devices
		op = org_devices.operational
		devices_issues = org_devices.issues
		onboarding= org_devices.onboarding
		tickets = devices_issues.component
		
		
		new_licenses = len([new for new in org_devices if new.last_onboarded_at >= cut_off])
		operational_devices = len([active for active in org_devices if active.operational == "fully"]) #acctive devices
		org_partial_status = len([partial for partial in org_devices if partial.operational == "partial"])
		reonboarding_devices = len([reonboarding for reonboarding in onboarding if reonboarding.status == "reonboarding"])
		total_org_devices = len(org.devices) #total devices
		software_issues = len([soft for soft in devices_issues if soft.category == 'software'])
		hardware_issues = len([hard for hard in devices_issues if hard.category == 'hardware'])
		critical_attention = len([critical for critical in devices_issues if critical.severity =='critical'])
		high_attention = len([critical for critical in devices_issues if critical.severity =='high'])
		under_maintenance = len([maintenance for maintenance in org_devices if maintenance.under_maintenance])
		resolved = len([resolve for resolve in tickets if resolve.resolve])
		agents = len(org.agents)
		return{
			'totaal_devices':total_devices,
			'active_devices':operational_devices,
			'new_licenses_devices':new_license,
			'reonboarrdinng_devices':reonboarding,
			'software_issues':software_issues,
			'hardware_issues':hardware_issues,
			'devices_under_maintenance':under_maintenance,
			'resolved_issues':resolved,
			'admin':f'{first_name} {last_name}',
			'agents':agents
		}
		
		
		

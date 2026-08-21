import json

from fastapi import FastAPI,Depends, Request, HTTPException, requests
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.sessions import SessionMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from sqlalchemy.orm import Session
from database import Users,Organization,Agent,Device,Issue,IssueComponent,Onboarding,OrganizationAgentRequest,DeviceAgentRequest, init,get_db,WAT
from pydantic import BaseModel
from typing import Optional, List
from argon2 import PasswordHasher
from contextlib import asynccontextmanager
from datetime import datetime,timedelta
import os
import hmac
import hashlib
import httpx
import json


from fastapi.middleware.cors import CORSMiddleware

NEW_LICENSE_DAYS = 10

# the checkboxes the ticket form may send, per category
COMPONENTS = {
	"hardware":["scanner","touch_screen","screen","charging_point","battery","power","camera","others"],
	"software":["authentication_problem","application_error","synchronization_problem","others"],
	"license":["expired","not_activated","license_sharing","multiple_ids","duplicate_device","limit_exceeded","others"],
}

ph = PasswordHasher()

class SessionRefreshMiddleware(BaseHTTPMiddleware):
	async def dispatch(self, request: Request, call_next):
		# Refresh session only if user is logged in
		if "user_id" in request.session:
			# This automatically refreshes the session on each request for active users
			pass
		response = await call_next(request)
		# The session will be re-set with a fresh expiration time
		return response

@asynccontextmanager
async def lifespan(app:FastAPI):
	init()
	yield


app = FastAPI(lifespan = lifespan)
app.add_middleware(SessionRefreshMiddleware)
app.add_middleware(SessionMiddleware, secret_key = os.getenv("SECRET_KEY","dev-secret-change-me"), max_age = 1800)
app.mount("/static",StaticFiles(directory = "static"),name = "static")


def new_license_cutoff():
	"""Devices onboarded on/after this moment still count as 'new license'.

	Stored datetimes are naive on SQLite, so drop the offset before comparing.
	"""
	return datetime.now(WAT).replace(tzinfo=None) - timedelta(days=NEW_LICENSE_DAYS)


def current_user(request:Request, db:Session) -> Users:
	user_id = request.session.get("user_id")
	if not user_id:
		raise HTTPException(status_code = 401, detail = "Unauthorized Access")
	user = db.query(Users).filter_by(id = user_id).first()
	if not user:
		request.session.clear()
		raise HTTPException(status_code = 401, detail = "Unauthorized Access")
	return user


def visible_devices(user:Users) -> List[Device]:
	"""RBAC: an organization sees its whole fleet, an agent only their own devices."""
	if user.is_organization:
		return user.organization.devices if user.organization else []
	return user.agent.devices if user.agent else []


def device_json(device:Device):
	return {
		"id":device.id,
		"device_model":device.device_model,
		"device_manufacturer":device.device_manufacturer,
		"device_type":device.device_type,
		"serial_number":device.serial_number,
		"imei1":device.imei1,
		"imei2":device.imei2,
		"operational":device.operational,
		"status":device.status,
		"under_maintenance":device.under_maintenance,
		"location":device.location,
		"created_at":device.created_at.isoformat() if device.created_at else None,
		"last_onboarded_at":device.last_onboarded_at.isoformat() if device.last_onboarded_at else None,
		"agent_id":device.agent_id,
		"agent_name":agent_display_name(device.agent),
		"open_issues":sum(1 for i in device.issues if i.status != "resolved"),
	}


def agent_display_name(agent:Optional[Agent]):
	if not agent or not agent.user:
		return None
	return f"{agent.user.first_name} {agent.user.last_name}"


def issue_json(issue:Issue):
	return {
		"id":issue.id,
		"device_id":issue.device_id,
		"device_model":issue.device.device_model if issue.device else None,
		"category":issue.category,
		"status":issue.status,
		"severity":issue.severity,
		"title":issue.title,
		"description":issue.description,
		"components":[c.component for c in issue.components],
		"reported_at":issue.reported_at.isoformat() if issue.reported_at else None,
		"reported_by":agent_display_name(issue.reported_by_agent),
		"resolved_at":issue.resolved_at.isoformat() if issue.resolved_at else None,
		"resolved_by":issue.resolved_by,
	}


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

class TicketData(BaseModel):
	device_id : Optional[int] = None
	category : str
	title : str
	description : Optional[str] = ""
	severity : Optional[str] = "medium"
	components : Optional[List[str]] = None

class GetOrganization(BaseModel):
    organization_name: str
    organization_registration_number: str

class WebhookRequest(BaseModel):
	agent_name: str
	agent_email: str
	agent_phone_number: str
	agent_id:int

@app.get("/")
def login_page():
	with open("templates/index.html","r") as f:
		return HTMLResponse(f.read())

@app.get("/dashboard")
def dashboard_page():
	with open("templates/dashboard.html","r") as f:
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
		db.flush()
		if not details.is_organization:
			db.add(Agent(user_id = user.id))
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
	if not user:
		return{"status":"failed","message":"User does not exists please signup"}
	try:
		ph.verify(user.password,password)
		request.session["user_id"] = user.id
		return{"status":"success","message":"Login successfully"}
	except Exception as e:
		print("wrong password:",str(e))
		return{"status":"failed","message":"Incorrect user name or password"}


@app.post("/logout")
def logout(request:Request):
	request.session.clear()
	return {"status":"success","message":"Logged out"}


@app.get("/me")
def me(request:Request, db:Session = Depends(get_db)):
	user = current_user(request, db)
	organization = user.organization if user.is_organization else (user.agent.organization if user.agent else None)
	return {
		"id":user.id,
		"first_name":user.first_name,
		"last_name":user.last_name,
		"email":user.email,
		"phone_number":user.phone_number,
		"address":user.address,
		"is_organization":bool(user.is_organization),
		"organization":organization.organization_name if organization else None,
		"organization_registration":organization.organization_registration if organization else None,
		"agent_id":user.agent.id if user.agent else None,
	}


@app.get("/api/dashboard")
def dashboard(request: Request,db:Session=Depends(get_db)):
	user = current_user(request, db)
	full_name = f"{user.first_name} {user.last_name}"
	cut_off = new_license_cutoff()

	if user.is_organization:
		org = user.organization
		if not org:
			raise HTTPException(status_code = 409, detail = "Account has no organization")

		devices = org.devices
		# org.devices is a list, so flatten the per-device onboarding rows.
		# issues hang off the organization so device-less license tickets are counted too
		issues = org.issues
		onboarding = [o for d in devices for o in d.onboarding]

		return{
			"admin":full_name,
			"organization":org.organization_name,
			"organization_registration":org.organization_registration,
			"total_devices":len(devices),
			"active_devices":sum(1 for d in devices if d.operational == "fully"),
			"partial_devices":sum(1 for d in devices if d.operational == "partial"),
			"new_license_devices":sum(1 for d in devices if d.last_onboarded_at and d.last_onboarded_at >= cut_off),
			"reonboarding_devices":sum(1 for o in onboarding if o.onboarding_status == "reonboarding"),
			"devices_under_maintenance":sum(1 for d in devices if d.under_maintenance),
			"software_issues":sum(1 for i in issues if i.category == "software" and i.status != "resolved"),
			"hardware_issues":sum(1 for i in issues if i.category == "hardware" and i.status != "resolved"),
			"license_issues":sum(1 for i in issues if i.category == "license" and i.status != "resolved"),
			"critical_attention":sum(1 for i in issues if i.severity == "critical" and i.status != "resolved"),
			"high_attention":sum(1 for i in issues if i.severity == "high" and i.status != "resolved"),
			"open_issues":sum(1 for i in issues if i.status != "resolved"),
			"resolved_issues":sum(1 for i in issues if i.status == "resolved"),
			"agents":len(org.agents),
		}

	agent = user.agent
	if not agent:
		raise HTTPException(status_code = 409, detail = "Account has no agent profile")

	devices = agent.devices
	issues = [i for d in devices for i in d.issues]
	return{
		"name":full_name,
		"my_organization":agent.organization.organization_name if agent.organization else None,
		"my_devices":len(devices),
		"my_active_devices":sum(1 for d in devices if d.operational == "fully"),
		"my_devices_under_maintenance":sum(1 for d in devices if d.under_maintenance),
		"my_new_license_devices":sum(1 for d in devices if d.last_onboarded_at and d.last_onboarded_at >= cut_off),
		"my_open_tickets":sum(1 for i in issues if i.status != "resolved"),
		"my_resolved_tickets":sum(1 for i in issues if i.status == "resolved"),
		"my_total_enrollments":agent.total_enrollments or 0,
	}


@app.get("/devices")
def list_devices(request:Request, db:Session = Depends(get_db)):
	user = current_user(request, db)
	return [device_json(d) for d in visible_devices(user)]


@app.get("/agents")
def list_agents(request:Request, db:Session = Depends(get_db)):
	user = current_user(request, db)
	if not user.is_organization:
		raise HTTPException(status_code = 403, detail = "Organization accounts only")
	if not user.organization:
		raise HTTPException(status_code = 409, detail = "Account has no organization")
	return [
		{
			"id":a.id,
			"name":agent_display_name(a),
			"email":a.user.email if a.user else None,
			"phone_number":a.user.phone_number if a.user else None,
			"location":a.location,
			"devices":len(a.devices),
			"total_enrollments":a.total_enrollments or 0,
		}
		for a in user.organization.agents
	]


@app.get("/tickets")
def list_tickets(request:Request, db:Session = Depends(get_db)):
	user = current_user(request, db)
	if user.is_organization:
		issues = user.organization.issues if user.organization else []
	else:
		issues = [i for d in visible_devices(user) for i in d.issues]
	return [issue_json(i) for i in sorted(issues, key = lambda i: i.id, reverse = True)]


@app.get("/ticket-components")
def ticket_components():
	return COMPONENTS


@app.post("/tickets")
def create_ticket(details:TicketData, request:Request, db:Session = Depends(get_db)):
	user = current_user(request, db)

	if details.category not in COMPONENTS:
		raise HTTPException(status_code = 422, detail = "Unknown category")
	if details.severity not in ("low","medium","high","critical"):
		raise HTTPException(status_code = 422, detail = "Unknown severity")
	if not details.title.strip():
		raise HTTPException(status_code = 422, detail = "Title is required")

	device = None
	if details.device_id is not None:
		# a ticket may only be raised against a device the caller can see
		device = next((d for d in visible_devices(user) if d.id == details.device_id), None)
		if not device:
			raise HTTPException(status_code = 404, detail = "Device not found")
	elif not user.is_organization:
		raise HTTPException(status_code = 422, detail = "Device is required")

	organization = user.organization if user.is_organization else (user.agent.organization if user.agent else None)
	if device is not None:
		organization = device.organization or organization
	if not organization:
		raise HTTPException(status_code = 409, detail = "Account has no organization")

	unknown = [c for c in (details.components or []) if c not in COMPONENTS[details.category]]
	if unknown:
		raise HTTPException(status_code = 422, detail = f"Unknown components: {', '.join(unknown)}")

	issue = Issue(
		device_id = device.id if device else None,
		organization_id = organization.id,
		category = details.category,
		title = details.title.strip(),
		description = details.description or "",
		severity = details.severity,
		status = "open",
		reported_by = user.agent.id if user.agent else None,
	)
	issue.components = [IssueComponent(component = c) for c in (details.components or [])]
	db.add(issue)
	db.commit()
	db.refresh(issue)
	return {"status":"success","message":"Ticket created","ticket":issue_json(issue)}


@app.post("/tickets/{ticket_id}/resolve")
def resolve_ticket(ticket_id:int, request:Request, db:Session = Depends(get_db)):
	user = current_user(request, db)
	if not user.is_organization:
		raise HTTPException(status_code = 403, detail = "Organization accounts only")

	issue = db.query(Issue).filter_by(id = ticket_id).first()
	if not issue or not user.organization or issue.organization_id != user.organization.id:
		raise HTTPException(status_code = 404, detail = "Ticket not found")

	issue.status = "resolved"
	issue.resolved_at = datetime.now(WAT).replace(tzinfo = None)
	issue.resolved_by = f"{user.first_name} {user.last_name}"
	for component in issue.components:
		component.resolve = True
	db.commit()
	db.refresh(issue)
	return {"status":"success","message":"Ticket resolved","ticket":issue_json(issue)}

@app.post("/api/get-organization")
async def get_organization(request: Request, org: GetOrganization, db: Session = Depends(get_db)):
    org_name = org.organization_name
    org_reg_number = org.organization_registration_number
    if not org_name or not org_reg_number:
        raise HTTPException(status_code=400, detail="Organization name and registration number are required.")

    existing_org = db.query(Organization).filter_by(organization_registration=org_reg_number).first()
    if not existing_org:
        raise HTTPException(status_code=404, detail="Organization not found.")

    user = current_user(request, db)
    name = f"{user.first_name} {user.last_name}"
    phone_number = user.phone_number
    email = user.email
	agent = user.agent
	agent_id = agent.id
	
    if not sent:
        raise HTTPException(status_code=502, detail="Failed to send organization webhook.")
	
    return {"status": "success", "message": "Organization details fetched"}


# WEBHOOKS SECTIONS
secret = "idk"





if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)


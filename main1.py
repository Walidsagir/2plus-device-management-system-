from fastapi import FastAPI,HTTPException,Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel


class GetOrganization(BaseModel):
    organization_name: str
    organization_registration_number: str


app = FastAPI()
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
def index():
    with open("templates/new-feature.html") as f:
        return HTMLResponse(content=f.read())

org_names = "Example Organization"
org_reg_numbers = "RC-123456"

@app.post("/api/get-organization")
async def get_organization(request: Request,org: GetOrganization):
    org_name = org.organization_name
    org_reg_number = org.organization_registration_number

    if not org_name or not org_reg_number:
        raise HTTPException(status_code=400, detail="Organization name and registration number are required.")

    if org_names != org_name or org_reg_numbers != org_reg_number:
        raise HTTPException(status_code=404, detail="Organization not found.")

    return {"status":True,"message": "Organization data received successfully.", "organization_name": org_name, "organization_registration_number": org_reg_number}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
from fastapi import FastAPI
from fastapi.responses import HTMLResponse




app = FastAPI()


@app.get("/")
def login_page():
	with open("/index.html","r") as f:
		return HTMLResponse(f.read())

import heapq
from fastapi import FastAPI, Request
import json
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
import json
import asyncio
import aiohttp


app = FastAPI()
security = HTTPBearer()

origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class Node(BaseModel):
    title: str
    base: str

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(check_metrics())


def get_token(auth: HTTPAuthorizationCredentials = Depends(security)):
    token = auth.credentials
    if token != "YOUR_TOKEN":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return token

@app.get('/')
def index():
    return {'message': 'This is the homepage of the API '}



@app.get('/getPath/{sentence}&{discovery}')
def read_paths_json(file_path):
    with open(file_path) as file:
        data = json.load(file)
    return data

@app.get('/node')
def get_paths():
    try:
        with open('paths.json', 'r') as f:
            data = json.load(f)
        return data
    except Exception as e:
        return {'error': str(e)}
    



async def check_metrics():
    while True:
        try:
            with open('paths.json', 'r') as f:
                nodes = json.load(f)
            async with aiohttp.ClientSession() as session:
                for node_key, node in nodes.items():
                    if node['name'] == 'central-server':
                        continue
                    metrics_url = f"{node['address']}/metrics"
                    print(metrics_url)
                    async with session.get(metrics_url) as response:
                        metrics = await response.json()
                        if 'message' in metrics:
                            accuracy = float(metrics['message'].split()[-1].strip('%'))
                            print(f"Accuracy for {metrics_url}: {accuracy}%")
                            if accuracy < 70:
                                retrain_url = f"{node['address']}/retrain"
                                await session.post(retrain_url)
                                print(f"Retraining model at {retrain_url}")
                        else:
                            print(f"Unexpected metrics format for {metrics_url}: {metrics}")
        except Exception as e:
            print(f"Error checking metrics: {e}")
        
        await asyncio.sleep(60)
from datetime import datetime, timedelta
import json
import os
from typing import Dict, List, Literal, Optional
from uuid import uuid4
from fastapi import FastAPI, File, HTTPException, UploadFile, Depends, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import random
from fastapi.encoders import jsonable_encoder
from fastapi.responses import HTMLResponse, StreamingResponse
from sqlalchemy import UUID
from models import SessionLocal, User, Document, Category
from sqlalchemy.orm import Session, Query
from passlib.context import CryptContext
from jose import JWTError, jwt

from fastapi.middleware.cors import CORSMiddleware





from pydantic import BaseModel, EmailStr
from mangum import Mangum
import boto3
from io import BytesIO
import uuid



AWS_ACCESS_KEY_ID = os.getenv('AWS_ACCESS_KEY_ID')
AWS_SECRET_ACCESS_KEY = os.getenv('AWS_SECRET_ACCESS_KEY')
AWS_REGION_NAME = os.getenv('AWS_REGION_NAME')
S3_BUCKET_NAME = os.getenv('S3_BUCKET_NAME')

class Book(BaseModel):
    name: str
    genre: Literal["fiction", "non-fiction"]
    price: float
    book_id: Optional[str] = uuid4().hex


BOOKS_FILE = "books.json"
BOOKS = []

if os.path.exists(BOOKS_FILE):
    with open(BOOKS_FILE, "r") as f:
        BOOKS = json.load(f)
        
SECRET_KEY = "YOUR_SECRET_KEY"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30


app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Ezt módosítsd biztonságosabbra, ha kell
    allow_credentials=True,
    allow_methods=["*"],  # Engedélyez minden metódust
    allow_headers=["*"],  # Engedélyez minden fejlécet
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")



app.mount("/static", StaticFiles(directory="static"), name="static")

handler = Mangum(app)
# A token generálása
def create_access_token(data: dict, expires_delta: timedelta = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)):
    to_encode = data.copy()
    expire = datetime.utcnow() + expires_delta
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt
# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Token validálása
def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
        user = get_user_from_db(email, db)
        if user is None:
            raise credentials_exception
        return user
    except JWTError:
        raise credentials_exception
    
def get_user_from_db(email: str, db: Session = SessionLocal()) -> Optional[User]:
    user = db.query(User).filter(User.email == email).first()
    db.close()
    return user


@app.post("/token")
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    user = get_user_from_db(form_data.username)
    if user is None or not user["verified"]:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": form_data.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}




# Pydantic models
class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    name: str
    email: EmailStr
    role: str

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str):
    return pwd_context.hash(password)

@app.post("/users/", response_model=UserResponse)
def create_user(user: UserCreate, db: Session = Depends(get_db)):
    db_user = User(
        id=str(uuid.uuid4()), 
        name=user.name, 
        email=user.email, 
        password_hash=hash_password(user.password), 
        role="user"
    )


    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    


    return db_user

@app.get("/users/{user_id}", response_model=UserResponse)
def get_user(user_id: str, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.id == user_id).first()
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return db_user


@app.get("/users", response_model=List[UserResponse])
async def get_users(db: Session = Depends(get_db)):
    db_users = db.query(User).all()  # Query to get all users
    return db_users

# Alap oldal
@app.get("/", response_class=HTMLResponse)
async def index():
    return open("static/index.html").read()




s3 = boto3.client('s3', aws_access_key_id=AWS_ACCESS_KEY_ID, aws_secret_access_key=AWS_SECRET_ACCESS_KEY, region_name=AWS_REGION_NAME)

@app.post("/upload/")
async def upload_file(
    file: UploadFile = File(...), 
    title: str = "Untitled", 
    description: str = "", 
    category_id: str = "", 
    uploaded_by: str = "", 
    db: Session = Depends(get_db)
) -> Dict[str, str]:
    """
    Feltölti a fájlt az S3-ba és elmenti a dokumentum adatait az adatbázisba.
    """

    # Fájl feltöltése az S3-ba
    s3.upload_fileobj(file.file, S3_BUCKET_NAME, file.filename)
    file_url = f"https://{S3_BUCKET_NAME}.s3.{AWS_REGION_NAME}.amazonaws.com/{file.filename}"

    # Új dokumentum mentése az adatbázisba
    new_document = Document(
        title=title,
        description=description,
        file_path=file_url,
        uploaded_by=uploaded_by,
        status="pending",  # vagy más alapértelmezett státusz
        category_id=category_id,
    )
    db.add(new_document)
    db.commit()
    db.refresh(new_document)

    return {
        "message": "File uploaded successfully.",
        "file_url": file_url,
        "document_id": new_document.id,
        "title": new_document.title,
        "description": new_document.description,
        "uploaded_at": new_document.uploaded_at.isoformat(),
    }


@app.delete("/delete/{filename}")
async def delete_file(filename: str) -> Dict[str, str]:
    try:
        # Fájl törlése az S3-ból
        s3.delete_object(Bucket=S3_BUCKET_NAME, Key=filename)
        return {"message": f"File {filename} deleted successfully."}
    except Exception as e:
        return {"message": f"Error deleting file: {str(e)}"}
    



@app.get("/download/{filename}")
async def download_file(filename: str):
    s3 = boto3.client('s3', aws_access_key_id=AWS_ACCESS_KEY_ID, aws_secret_access_key=AWS_SECRET_ACCESS_KEY, region_name=AWS_REGION_NAME)

    try:
        # Fájl lekérése az S3-ból
        file_obj = s3.get_object(Bucket=S3_BUCKET_NAME, Key=filename)
        
        # Fájl tartalmának betöltése
        file_content = file_obj['Body'].read()
        
        # Automatikus letöltés (Content-Disposition header)
        return StreamingResponse(BytesIO(file_content), media_type="application/octet-stream", headers={"Content-Disposition": f"attachment; filename={filename}"})
    
    except Exception as e:
        return {"error": str(e)}
    

@app.get("/me", response_model=UserResponse)
def get_current_user_info(user: User = Depends(get_current_user)):
    return user


@app.get("/files", response_model=List[Dict[str, str]])
async def get_files(db: Session = Depends(get_db)):
    """
    Az adatbázisból listázza a feltöltött dokumentumokat.
    """
    documents = db.query(Document).all()
    
    return [
        {
            "id": doc.id,
            "title": doc.title,
            "description": doc.description,
            "file_url": doc.file_path,
            "uploaded_at": doc.uploaded_at.isoformat(),
            "delete_url": f"/delete/{doc.file_path.split('/')[-1]}",
            "download_url": f"/download/{doc.file_path.split('/')[-1]}",
        }
        for doc in documents
    ]
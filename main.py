import json
import os
from typing import Dict, Literal, Optional
from uuid import uuid4
from fastapi import FastAPI, File, HTTPException, UploadFile
import random
from fastapi.encoders import jsonable_encoder
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from mangum import Mangum
import boto3
from io import BytesIO


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

app = FastAPI()
handler = Mangum(app)


@app.get("/")
async def root():
    return {"message": "Welcome to my bookstore app!"}


@app.get("/random-book")
async def random_book():
    return random.choice(BOOKS)


@app.get("/list-books")
async def list_books():
    return {"books": BOOKS}


@app.get("/book_by_index/{index}")
async def book_by_index(index: int):
    if index < len(BOOKS):
        return BOOKS[index]
    else:
        raise HTTPException(404, f"Book index {index} out of range ({len(BOOKS)}).")


@app.post("/add-book")
async def add_book(book: Book):
    book.book_id = uuid4().hex
    json_book = jsonable_encoder(book)
    BOOKS.append(json_book)

    with open(BOOKS_FILE, "w") as f:
        json.dump(BOOKS, f)

    return {"book_id": book.book_id}


@app.get("/get-book")
async def get_book(book_id: str):
    for book in BOOKS:
        if book.book_id == book_id:
            return book

    raise HTTPException(404, f"Book ID {book_id} not found in database.")


s3 = boto3.client('s3', aws_access_key_id=AWS_ACCESS_KEY_ID, aws_secret_access_key=AWS_SECRET_ACCESS_KEY, region_name=AWS_REGION_NAME)

@app.post("/upload/")
async def upload_file(file: UploadFile = File(...)) -> Dict[str, str]:
    # Feltöltjük a fájlt az S3-ba
    s3.upload_fileobj(file.file, S3_BUCKET_NAME, file.filename)
    
    # Generáljuk a fájl URL-jét
    file_url = f"https://{S3_BUCKET_NAME}.s3.{AWS_REGION_NAME}.amazonaws.com/{file.filename}"
    
    # Generáljuk a törlés URL-t, amit a frontend használhat
    delete_url = f"/delete/{file.filename}"
    
    return {"message": "File uploaded successfully.", "file_url": file_url, "delete_url": delete_url, "file_name": file.filename}


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
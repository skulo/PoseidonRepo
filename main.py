from datetime import datetime, timedelta, timezone
import json
import os
import re
from sqlite3 import IntegrityError
import string
from typing import Dict, List, Literal, Optional
import unicodedata
from uuid import uuid4
from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile, Depends, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import random
from fastapi.encoders import jsonable_encoder
from fastapi.responses import HTMLResponse, StreamingResponse
from sqlalchemy import UUID
import urllib
from models import SessionLocal, User, Document, Category
from sqlalchemy.orm import Session, Query
from passlib.context import CryptContext
from jose import JWTError, jwt
from baseclass import BaseClass
from models import VerificationRun, Verification, Proof, EmailProof, VerificationRunDuplicate
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from urllib.parse import quote

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
ACCESS_TOKEN_EXPIRE_MINUTES = 120


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
app.mount("/catalog", StaticFiles(directory="catalog"), name="catalog")
app.mount("/main", StaticFiles(directory="main"), name="main")
app.mount("/moderation", StaticFiles(directory="moderation"), name="moderation")
app.mount("/trending", StaticFiles(directory="trending"), name="trending")

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

def verify_get_user_from_db(email: str, db: Session = SessionLocal()) -> Optional[User]:
    user = db.query(User).filter(User.email == email).first()
    user.verified = True
    db.commit()
    db.close()

    return True


def verify_password(plain_password, password_hash):
    return pwd_context.verify(plain_password, password_hash)

@app.post("/token")
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    user = get_user_from_db(form_data.username)
    if user is None or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"+form_data.username + form_data.password + user.password_hash,
        )
    print("token generating")
    if not user.verified:
        return {"status": "not_verified", "message": "Email not verified. Please enter the verification code sent to your email."}
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": form_data.username}, expires_delta=access_token_expires
    )
    print("ACCESS TOKEN" + access_token)

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
    try:
        if db.query(User).filter(User.email == user.email).first():
            raise HTTPException(status_code=400, detail="Ez az email cím már regisztrálva van!")
        
        if db.query(User).filter(User.name == user.name).first():
            raise HTTPException(status_code=400, detail="Ez a név már foglalt!")

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

            # Ha email már létezik, akkor dobj hibát


        base = BaseClass()

        run_duplicate=base.is_run_duplicate(entity_id=db_user.id, verification_process="EMAIL", session=db)

        if run_duplicate!="":
            new_duplicate_run = VerificationRunDuplicate(
                id=f"verification_verificationrunduplicate_{uuid.uuid4()}",
                serviceProviderID="VB",
                verificationTypeCode="EMAIL",
                entityType=db_user.role,
                entityID=db_user.id,
                verificationProcessCode="EMAIL",
                originalVerificationRunID=run_duplicate
            )
            base.create_verification_run_duplicate(new_duplicate_run)
            return {"status": "DUPLICATE_RUN_FOUND"}
        
        VERIFICATION_EXPIRE_DAYS=5000
        CODE_LENGTH=6
        TRY_EXPIRE_HOURS=24
        MAX_RRETRY_PROCESS=3
        MAX_RETRY_PROCESS_WAIT_TIME_MINUTES=3
        MAX_RETRY_PROCESS_METHOD="EXPONENTIAL"
        MAX_RETRY=3

        new_run = VerificationRun(
                id=f"verification_verificationrun_{uuid.uuid4()}",
                serviceProviderID="VB",
                verificationProcessCode="EMAIL",
                entityType=db_user.role,
                entityID=db_user.id,
                verificationTypeCode="EMAIL",
                status="ONGOING",
                vendor_status="PENDING",
                fail_reason="",
                try_count=0,
                effective_date=datetime.now(),
                expiration_date=datetime.now() + timedelta(hours=TRY_EXPIRE_HOURS),
                remaining_tries=MAX_RETRY
            )

        created_run = base.create_verification_run(new_run, session=db)

        prefix = ''.join([str(random.randint(0, 9)) for _ in range(3)])

        verification_code = ''.join([str(random.randint(0, 9)) for _ in range(CODE_LENGTH)])

        new_proof = EmailProof(
            id=f"verification_proof_{uuid.uuid4()}",
            verificationRunID=created_run.id,
            main_param=db_user.email,
            verification_code=verification_code,
            uploadDate=datetime.now(),
            expirationDate=datetime.now() + timedelta(hours=TRY_EXPIRE_HOURS),
            entityType=db_user.role,
            entityID=db_user.id,
            prefix=prefix,
            ip_address="",
            correct_code_submission_time=None,
            status="PENDING"
        )
        created_proof=base.create_proof(new_proof, session=db)

        proof = created_run.proofs[0]

        phoneresult=base.email_duplicate_check(db_user.id, email=db_user.id, session=db)
        if phoneresult=="":
            #base.update_proof_status(proof=proof, new_status="PENDING", main_param=normalized_phone, session=session)
            proof.status="PENDING"
            proof.main_param=db_user.email

        #send email to address
        #send_email(db_user.email, verification_code)
        verification_code = prefix + "-" +verification_code
        send_email(db_user.email, verification_code)
        "EMAIL SENT"
    except IntegrityError as e:
        raise HTTPException(status_code=400, detail="Ez az email cím már regisztrálvaA van!")
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


def sanitize_filename(filename: str) -> str:
    """
    Megtisztítja a fájlnevet:
    - Eltávolítja az érvénytelen karaktereket
    - Lecseréli az ékezetes karaktereket (pl. ő -> o, é -> e)
    - Megőrzi az eredeti fájlkiterjesztést
    """
    # Fájlkiterjesztés megőrzése
    name, ext = filename.rsplit('.', 1) if '.' in filename else (filename, '')

    # Ékezetes karakterek normalizálása
    name = unicodedata.normalize('NFKD', name).encode('ascii', 'ignore').decode('ascii')

    # Csak engedélyezett karakterek: betűk, számok, kötőjel és aláhúzás
    name = re.sub(r'[^a-zA-Z0-9_\-]', '_', name)

    # Ha nincs kiterjesztés, nem kell pont
    return f"{name}.{ext}" if ext else name

s3 = boto3.client('s3', aws_access_key_id=AWS_ACCESS_KEY_ID, aws_secret_access_key=AWS_SECRET_ACCESS_KEY, region_name=AWS_REGION_NAME)

@app.post("/upload/")
async def upload_file(
    file: UploadFile = File(...), 
    title: str = Form(""), 
    description: str = Form(""), 
    category_id: str = Form(""),
    role: str = Form(""), 
    uploaded_by: str = Form(""), 
    db: Session = Depends(get_db)
) -> Dict[str, str]:
    """
    Feltölti a fájlt az S3-ba és elmenti a dokumentum adatait az adatbázisba.


    
    """

    MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB

    # Fájlméret ellenőrzése
    file.file.seek(0, 2)  # Seek to end to get size
    file_size = file.file.tell()
    file.file.seek(0)  # Seek back to start
    file_size_in_mb = file_size / (1024 * 1024)

    if file_size > MAX_FILE_SIZE:
        return {
            "message": "ERROR",
            "error": str(file_size_in_mb)
        }
    

    print(f"Category ID: {category_id}, Uploaded By: {uploaded_by}")

    category = db.query(Category).filter(Category.id == category_id).first()

    categoryName = category.name
    randomize_it = ''.join(random.choices(string.ascii_lowercase + string.digits, k=6))
    sanitized_category_name = sanitize_filename(categoryName)
    sanitized_filename = sanitize_filename(file.filename)

    filenameNew = f"{randomize_it}_{sanitized_category_name}_{sanitized_filename}"
    # Fájl feltöltése az S3-ba
    s3.upload_fileobj(file.file, S3_BUCKET_NAME, filenameNew)
    file_url = f"https://{S3_BUCKET_NAME}.s3.{AWS_REGION_NAME}.amazonaws.com/{filenameNew}"

    # Új dokumentum mentése az adatbázisba
    if role == 'user':
        new_document = Document(
            title=title,
            description=description,
            file_path=file_url,
            uploaded_by=uploaded_by,
            status="pending",  
            category_id=category_id,
        )
        db.add(new_document)
        db.commit()
        db.refresh(new_document)

        return {
            "message": "File is uploaded successfully, and is waiting for approval.",
            "file_url": file_url,
            "document_id": new_document.id,
            "title": new_document.title,
            "description": new_document.description,
            "uploaded_by": new_document.uploaded_by,
            "uploaded_at": new_document.uploaded_at.isoformat(),
        }
    else:
        new_document = Document(
            title=title,
            description=description,
            file_path=file_url,
            uploaded_by=uploaded_by,
            status="approved",  
            category_id=category_id,
        )
        db.add(new_document)
        db.commit()
        db.refresh(new_document)

        return {
            "message": 'File is uploaded successfully.',
            "file_url": file_url,
            "document_id": new_document.id,
            "title": new_document.title,
            "description": new_document.description,
            "uploaded_by": new_document.uploaded_by,
            "uploaded_at": new_document.uploaded_at.isoformat(),
        }
    


@app.delete("/delete/{filename}")
async def delete_file(
    filename: str= "", 
    current_user: User = Depends(get_current_user),  # Aktuális felhasználó lekérése
    db: Session = Depends(get_db)
) -> Dict[str, str]:
    """
    Törli a fájlt az S3-ból, ha a felhasználó admin, moderátor, vagy a fájl feltöltője.
    """
    print("DEBUG: Deleting file...")
    try:
        # Dokumentum adatainak lekérése a filename alapján
        file_path="https://poseidonb.s3.eu-north-1.amazonaws.com/"+filename
        document = db.query(Document).filter(Document.file_path == file_path).first()
        
        if document is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not founddd.")
        
        # Jogosultságok ellenőrzése
        if current_user.role not in ["admin", "moderator"] and current_user.id != document.uploaded_by:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, 
                detail="You do not have permission to delete this file."
            )

        # Fájl törlése az S3-ból
        response = s3.delete_object(Bucket=S3_BUCKET_NAME, Key=filename)
        print(f"DEBUG: S3 delete response: {response}")
        db.delete(document)
        db.commit()
        # Válasz visszaadása
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


@app.get("/pendingdocs/{userId}")
def get_users_pending_docs_count(userId: str, db: Session = Depends(get_db)):
    return db.query(Document).filter(Document.uploaded_by == userId, Document.status == "pending").count()

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
            "file_path": doc.file_path,
            "status": doc.status,
            "uploaded_by": doc.uploaded_by,
            "uploaded_at": doc.uploaded_at.isoformat(),
            "delete_url": f"/delete/{doc.file_path.split('/')[-1]}",
            "download_url": f"/download/{doc.file_path.split('/')[-1]}",
        }
        for doc in documents
    ]



def send_email(recipient_email: str, verification_code: str):
    sender_email = "poseidongg.noreply@gmail.com"  # A Te email címed
    sender_password = "opst qfmv gwzb lhxa"  # Az email jelszavad

    # SMTP beállítások
    smtp_server = "smtp.gmail.com"
    smtp_port = 587  # Vagy 465 a SSL-hez

    # Email üzenet készítése
    message = MIMEMultipart()
    message["From"] = sender_email
    message["To"] = recipient_email
    message["Subject"] = "Verifikációs kód"
    
    body = f"A Te verifikációs kódod: {verification_code}"
    message.attach(MIMEText(body, "plain"))

    # SMTP kapcsolat létrehozása és az email elküldése
    try:
        with smtplib.SMTP(smtp_server, smtp_port) as server:
            server.starttls()  # TLS titkosítás engedélyezése
            server.login(sender_email, sender_password)
            server.sendmail(sender_email, recipient_email, message.as_string())
        print(f"Email sikeresen elküldve {recipient_email} címre.")
    except Exception as e:
        print(f"Az email küldésének hibája: {str(e)}")

@app.get("/email/decision")
def send_email_decision(recipient_email: str, title: str, decision: str, sender: str, rejection_reason: str = None):
    sender_email = "poseidongg.noreply@gmail.com"  # A Te email címed
    sender_password = "opst qfmv gwzb lhxa"  # Az email jelszavad

    # SMTP beállítások
    smtp_server = "smtp.gmail.com"
    smtp_port = 587  # Vagy 465 a SSL-hez

    # Email üzenet készítése
    message = MIMEMultipart()
    message["From"] = sender_email
    if decision == "approved":
        message["To"] = recipient_email
        message["Subject"] = "Feltöltött Fájl Jóváhagyva"
        
        body = f"A Te fájlod ({title}) jóváhagyásra került, általa: {sender}"
        message.attach(MIMEText(body, "plain"))
    if decision == "rejected":
        message["To"] = recipient_email
        message["Subject"] = "Feltöltött Fájl Elutasítva"
        
        body = f"A Te fájlod ({title}) elutasításra került, általa: {sender}. Az elutasítás oka: {rejection_reason}"
        message.attach(MIMEText(body, "plain"))
    

    # SMTP kapcsolat létrehozása és az email elküldése
    try:
        with smtplib.SMTP(smtp_server, smtp_port) as server:
            server.starttls()  # TLS titkosítás engedélyezése
            server.login(sender_email, sender_password)
            server.sendmail(sender_email, recipient_email, message.as_string())
        print(f"Email sikeresen elküldve {recipient_email} címre.")
    except Exception as e:
        print(f"Az email küldésének hibája: {str(e)}")

    return {"status": "OK"}




class ConfirmationResponse(BaseModel):
    status: str
    error_id: Optional[str] = None



@app.post("/confirm", response_model=ConfirmationResponse)
def confirm_verification(
    entity_type: str, 
    entity_id: str, 
    verification_process: str, 
    code: str,
    request: Request,
    service_provider_id: str = 'VB',
    session: Session = Depends(get_db)
):
    base = BaseClass()



    VERIFICATION_EXPIRE_DAYS=5000
    print(f"DEBUG: entity_id={entity_id}")

    verification_run_id = base.get_verification_run_id(entity_id, session)


    
    run = base.get_verification_run(verification_run_id, service_provider_id, entity_type, entity_id, verification_process, session)

    if run.status=='FAILED':
        return {"status": "ERROR", "error_id": "FAILED_VERIFICATION. CREATE NEW ACCOUNT"}


    proof = run.proofs[0]



    if run.status=='ONGOING':
        user_ip = request.client.host

        proof.ip_address = user_ip

        if not run or proof.verification_code != code:
            
            run.remaining_tries -= 1
            base.update_verification_status(verification_run=run, new_status="FAILED" if run.remaining_tries <= 0 else run.status, session=session)

            if run.remaining_tries <= 0:
                #base.update_proof_status(proof, "REJECTED", datetime.now(), datetime.now() + timedelta(days=365), session)
                proof.status = "REJECTED"
                run.fail_reason = "TOO_MANY_TRIES"
                session.commit()  
                session.close()
                return {"status": "ERROR", "error_id": "TOO_MANY_TRIES"}


            session.commit()  
            session.close()

            return {"status": "ERROR", "error_id": "BAD_CODE"}
        
        proof.correct_code_submission_time=datetime.now()
        base.update_verification_status(run, new_status="FINISHED", session=session)
        #base.update_proof_status(proof, "APPROVED", datetime.now(), datetime.now() + timedelta(days=365), session)
        proof.status = "APPROVED"
        proof.expirationDate = datetime.now() + timedelta(days=VERIFICATION_EXPIRE_DAYS)

        verification_data = {

            "serviceProviderID": run.serviceProviderID,
            "verificationTypeCode": run.verificationTypeCode,
            "verificationProcessCode": run.verificationProcessCode,
            "verificationRunID": run.id,
            "entityType": entity_type,
            "entityID": entity_id,
            "status": "VALID",
            "effective_date": datetime.now(),
            "expiration_date": datetime.now() + timedelta(days=VERIFICATION_EXPIRE_DAYS),
            "data": {"email": proof.main_param}
        }
        base.create_verification(verification_data, session)

        '''
        # Call PHP setLevelFromVerification API
        php_result = call_php_api_set_level(entity_id, "PHONE", True)

        if not php_result["success"]:
            return {"status": "ERROR", "error_id": "PHP_API_CALL_FAILED"}
        '''
        success=verify_get_user_from_db(email=proof.main_param, db=session)
                         
    session.commit()  
    session.close()


    return {"status": "OK"}

class CancelVerificationResponse(BaseModel):
    status: str
    error_id: str = None

@app.post("/cancel", response_model=CancelVerificationResponse)
def cancel_verification(
    entityType: str, 
    entityID: str, 
    verification_process: str, 
    verificationRunID: str,
    serviceProviderID: str = 'VB',
    session: Session = Depends(get_db)
):
    base = BaseClass()


    run = base.get_verification_run(verificationRunID, serviceProviderID, entityType, entityID, verification_process, session)
    
    if not run or run.status != "ONGOING":
        return CancelVerificationResponse(status="ERROR", error_id="INVALID_VERIFICATION")

    base.update_verification_status(verification_run=run, new_status='CANCELLED', session=session)
    base.delete_proof(run.id, session)

    session.commit()  
    session.close()

    return CancelVerificationResponse(status="OK")


def calculate_linear_wait_time(attempt_number: int, waitMinutes: int) -> timedelta:
    return timedelta(minutes=waitMinutes)

def calculate_exponential_wait_time(attempt_number: int, waitMinutes: int) -> timedelta:
    return timedelta(minutes=waitMinutes ** (attempt_number + 1))

@app.post("/resend")
def resend_code(
    entity_type: str, 
    entity_id: str, 
    verification_process: str = "EMAIL", 
    service_provider_id: str = 'VB',
    session: Session = Depends(get_db),
    method="linear"):

    base = BaseClass()
    current_timestamp = datetime.now(timezone.utc)  


    CODE_LENGTH=6
    MAX_RETRY_PROCESS=3
    MAX_RETRY_PROCESS_WAIT_TIME_MINUTES=1
    MAX_RETRY_PROCESS_METHOD="linear"

    try:
        session.begin()
        
        verification_run_id = base.get_verification_run_id(entity_id, session)
        
        
        print(f"DEBUG: verification_run_id={verification_run_id}")

        if verification_run_id is None:
            return {"error": "No verification run found for given entity_id"}
        
        verification_run = base.get_verification_run(
            verification_run_id, service_provider_id, entity_type, entity_id, 
            verification_process, session
        )

        if verification_run.status != "ONGOING":
            return {"error": "VERIFICATION_RUN_NOT_ONGOING"}
        
        proof = verification_run.proofs[0]
        
        if verification_run.try_count >= MAX_RETRY_PROCESS:
            return {"error": "MAX_RESEND_ATTEMPTS_REACHED"}
        
        if verification_run.last_try_timestamp:
            if MAX_RETRY_PROCESS_METHOD == "linear":
                wait_time = calculate_linear_wait_time(verification_run.try_count, MAX_RETRY_PROCESS_WAIT_TIME_MINUTES)
            elif MAX_RETRY_PROCESS_METHOD == "exponential":
                wait_time = calculate_exponential_wait_time(verification_run.try_count, MAX_RETRY_PROCESS_WAIT_TIME_MINUTES)
            else:
                return {"error": "Invalid method."}
            
            next_resend_time = verification_run.last_try_timestamp + wait_time  
            
            if verification_run.try_count != 0:
                if MAX_RETRY_PROCESS_METHOD == "linear":
                    wait_time_last = calculate_linear_wait_time((verification_run.try_count)-1, MAX_RETRY_PROCESS_WAIT_TIME_MINUTES)
                elif MAX_RETRY_PROCESS_METHOD == "exponential":
                    wait_time_last = calculate_exponential_wait_time((verification_run.try_count)-1, MAX_RETRY_PROCESS_WAIT_TIME_MINUTES)

                last_next_resend_time = verification_run.last_try_timestamp + wait_time_last

                if current_timestamp < last_next_resend_time:
                    return {"error": f"NEXT_RESEND_AVAILABLE_AT {last_next_resend_time}"}
        
        verification_run.try_count += 1
        
        old_prefix = proof.prefix
        old_verification_code = proof.verification_code

        while True:
            new_prefix = ''.join([str(random.randint(0, 9)) for _ in range(3)])
            new_verification_code = ''.join([str(random.randint(0, 9)) for _ in range(CODE_LENGTH)])
            
            if new_prefix != old_prefix and new_verification_code != old_verification_code:
                break

        verification_run.last_try_timestamp = current_timestamp
        proof.prefix = new_prefix
        proof.verification_code = new_verification_code
        #send code to phone number


                #send email to address
        #send_email(db_user.email, verification_code)

        send_email(proof.main_param, new_verification_code)

        session.commit()





        next_resend_time = current_timestamp + wait_time
        if verification_run.try_count >= MAX_RETRY_PROCESS:
            return {
                "prefix": new_prefix,
                "status": "MAX_RESEND_ATTEMPTS_REACHED",
            }
        return {
            "prefix": new_prefix,
            "next_resend_time": next_resend_time
        }

    finally:
        session.close()



@app.get("/categories")
def get_categories(db: Session = Depends(get_db)):
    categories = db.query(Category).all()
    category_map = {cat.id: cat for cat in categories}
    
    def build_tree(category):
        return {
            "id": category.id,
            "name": category.name,
            "children": [build_tree(sub) for sub in categories if sub.parent_id == category.id]
        }
    
    return [build_tree(cat) for cat in categories if cat.parent_id is None]


@app.get("/files/{category_id}")
def get_documents_by_category(category_id: str, db: Session = Depends(get_db)):

    if category_id == "trending":
        # Lekérdezzük a 5 legnépszerűbb dokumentumot
        documents = db.query(Document) \
            .filter(Document.status == "approved") \
            .order_by(Document.popularity.desc()) \
            .limit(5) \
            .all()
        
    elif category_id == "recent":
        # Top 5 legújabb dokumentum az 'uploaded_at' mező szerint csökkenő sorrendben
        documents = db.query(Document) \
            .filter(Document.status == "approved") \
            .order_by(Document.uploaded_at.desc()) \
            .limit(5) \
            .all()
    else:
        documents = db.query(Document).filter(Document.category_id == category_id, Document.status == "approved").all()


    return [
        {
            "id": doc.id,
            "title": doc.title,
            "description": doc.description,
            "file_path": doc.file_path,
            "status": doc.status,
            "uploaded_by": doc.uploaded_by,
            "category_id": doc.category_id,
            "uploaded_at": doc.uploaded_at.isoformat(),
            "delete_url": f"/delete/{doc.file_path.split('/')[-1]}",
            "download_url": f"/download/{doc.file_path.split('/')[-1]}",
            "uploaded_at_display": datetime.strptime(doc.uploaded_at.isoformat(), "%Y-%m-%dT%H:%M:%S.%f").strftime("%-m/%-d/%Y"),
        }
        for doc in documents
    ]

@app.get("/filesinfo/{fileId}")
def get_documents_information(fileId: str, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == fileId).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    usr = db.query(User).filter(User.id == doc.uploaded_by).first()
    if not usr:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {
            "response": "OK",
            "title": doc.title,
            "delete_url": f"/delete/{doc.file_path.split('/')[-1]}",
            "usremail": usr.email,
            "status": doc.status,
        }


@app.get("/moderations/files")
def get_pending_files(db: Session = Depends(get_db)):
    documents = db.query(Document).filter(Document.status == "pending").all()
    return [
        {
            "id": doc.id,
            "title": doc.title,
            "description": doc.description,
            "file_path": doc.file_path,
            "status": doc.status,
            "category_id": doc.category_id,
            "uploaded_by": doc.uploaded_by,
            "uploaded_at": doc.uploaded_at.isoformat(),
            "delete_url": f"/delete/{doc.file_path.split('/')[-1]}",
            "download_url": f"/download/{doc.file_path.split('/')[-1]}",
        }
        for doc in documents
    ]


@app.put("/moderations/approve/{file_id}")
async def approve_file(file_id: str, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == file_id, Document.status == 'pending').first()
    if not doc:
        raise HTTPException(status_code=404, detail="File not found or already processed")
    
    doc.status = 'approved'
    db.commit()
    return {"message": "File approved successfully"}



@app.put("/moderations/reject/{file_id}")
async def reject_file(file_id: str, reason: str, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == file_id, Document.status == 'pending').first()
    if not doc:
        raise HTTPException(status_code=404, detail="File not found or already processed")
    
    doc.status = 'rejected'
    #file.rejection_reason = reason
    db.commit()
    return {"message": "File rejected successfully"}


@app.post("/api/documents/{document_id}/increase_popularity")
def increase_popularity(document_id: str, db: Session = Depends(get_db)):
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    document.popularity += 1
    db.commit()
    db.refresh(document)

    return {"message": "Popularity increased", "new_popularity": document.popularity}


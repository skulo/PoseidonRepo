from datetime import datetime, timedelta
import json
import os
from typing import Dict, List, Literal, Optional
from uuid import uuid4
from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile, Depends, status
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
from baseclass import BaseClass
from models import VerificationRun, Verification, Proof, EmailProof, VerificationRunDuplicate
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

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
app.mount("/catalog", StaticFiles(directory="catalog"), name="catalog")

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


@app.post("/token")
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    user = get_user_from_db(form_data.username)
    if user is None or not user.verified:
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
    title: str = Form(""), 
    description: str = Form(""), 
    category_id: str = Form(""), 
    uploaded_by: str = Form(""), 
    db: Session = Depends(get_db)
) -> Dict[str, str]:
    """
    Feltölti a fájlt az S3-ba és elmenti a dokumentum adatait az adatbázisba.
    """
    print(f"Category ID: {category_id}, Uploaded By: {uploaded_by}")


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
    
    body = f"A Te verifikációs kódod zsuzsi maomiuka cicuka micuka: {verification_code}"
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


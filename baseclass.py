import os
import json
import logging
from fastapi import logger
from typing import List, Optional, Dict, Any
import sqlalchemy as sa
from sqlalchemy import create_engine, and_, desc, text, not_, or_
from sqlalchemy.exc import SQLAlchemyError, IntegrityError
from sqlalchemy.orm import Session, Query
from datetime import datetime
from sqlalchemy.orm import joinedload
import re
from models import VerificationRun, Verification, Proof, EmailProof, VerificationRunDuplicate


class BaseClass():

    def __init__(
        self, application_name: Optional[str] = None, is_docker: Optional[bool] = False
    ) -> None:
        self.application_name = application_name
        self.is_docker = is_docker



    #############  GET  ##############




    

    def get_verification_runs(
        self, filter_expr=None, sort_by: str = None, session: Optional[Session] = None
    ) -> List[VerificationRun]:
        """
        Gets all the verification runs based on filters.
        """
        b_session_was_opened: bool = False
        if not session:
            session = Session(self.engine)
            b_session_was_opened = True
            session.begin()
            session.expire_on_commit = False

        query = session.query(VerificationRun)

        if filter_expr is not None:
            query = query.filter(filter_expr)
        if sort_by is not None:
            query = query.order_by(text(sort_by.replace(".", " ")))

        verification_runs: List[VerificationRun] = query.all()

        returnvalues = []

        for run in verification_runs:
            proofs = run.proofs

            proofsl = [{
                "id": proof.id,
               # "verification_code": proof.verification_code if isinstance(proof, PhoneProof) else None,
                "prefix": proof.prefix if isinstance(proof, EmailProof) else None,

                "main_param": proof.main_param if isinstance(proof, EmailProof) else None,
            } for proof in proofs]

            returnvalues.append({
                "id": run.id,
                "status": run.status,
                "effective_date": run.effective_date,
                "expiration_date": run.expiration_date,
                "remaining_tries": run.remaining_tries,
                "try_count": run.try_count,
                "proofs": proofsl
            })

        

        if b_session_was_opened:
            session.close()

        return returnvalues


    



    def get_verification(self, verification_id: int, service_provider_id: str, entity_type: str, entity_id: int, verification_type_code: str, session: Optional[Session] = None):
        """
        Fetches a verification by ID and other parameters.
        """
        b_session_was_opened = False
        if not session:
            session = Session(self.engine)
            b_session_was_opened = True
            session.begin()
            session.expire_on_commit = False

        verification = session.query(Verification).filter(
            Verification.id == verification_id,
            Verification.serviceProviderID == service_provider_id,
            Verification.entityType == entity_type,
            Verification.entityID == entity_id,
            Verification.verificationTypeCode == verification_type_code
        ).first()

        if b_session_was_opened:
            session.close()

        return verification


    def get_verifications(
        self, filter_expr=None, sort_by: str = None, session: Optional[Session] = None
    ) -> List[Verification]:
        """
        Gets all the verifications based on filters.
        """
        b_session_was_opened: bool = False
        if not session:
            session = Session(self.engine)
            b_session_was_opened = True
            session.begin()
            session.expire_on_commit = False

        query: Query = session.query(Verification)

        if filter_expr is not None:
            query = query.filter(filter_expr)
        if sort_by is not None:
            query = query.order_by(text(sort_by.replace(".", " ")))

        entries: List[Verification] = query.all()

        returnvalues=[]
        for verification in entries:
            proofs=verification.verification_run.proofs

            proofsl = [{
                "id": proof.id,
                #"verification_code": proof.verification_code if isinstance(proof, PhoneProof) else None,
                "main_param": proof.main_param if isinstance(proof, EmailProof) else None,
                "ip_address": proof.ip_address if isinstance(proof, EmailProof) else None,
                "correct_code_submission_time": proof.correct_code_submission_time if isinstance(proof, EmailProof) else None,
            } for proof in proofs]

            returnvalues.append({
                "verification_id": verification.id,
                "entity_type": verification.entityType,
                "entity_id": verification.entityID,
                "status": verification.status,
                "effective_date": verification.effective_date,
                "expiration_date": verification.expiration_date,
                "verification_type_code": verification.verificationTypeCode,
                "verification_process_code": verification.verificationProcessCode,
                "data": verification.data,
                "proofs": proofsl
            })




        if b_session_was_opened:
            session.close()
        return returnvalues


        #############  CREATE  ##############

    def create_verification_run(self, verification_run: VerificationRun, session: Optional[Session] = None) -> VerificationRun:
        """
        Creates a new verification run.
        If a session is provided, it will use that session; otherwise, a new session will be created.
        """
        # Use the provided session if available, otherwise create a new one
        b_session_was_opened = False
        if session is None:
            session = Session(self.engine)
            b_session_was_opened = True
            session.begin()

        try:
            session.expire_on_commit = False
            session.add(verification_run)
            session.flush()  # Ensure that the object is added to the database
            session.refresh(verification_run)  # Load the new data into the object
            session.commit()  # Commit the transaction
        except Exception as e:
            session.rollback()  # Rollback in case of error
            raise e  # Re-raise the exception for handling upstream
        finally:
            if b_session_was_opened:
                session.close()  # Close the session only if it was created in this method

        return verification_run

    


    def create_verification_run_duplicate(self, verification_run_duplicate: VerificationRunDuplicate) -> VerificationRunDuplicate:
        """
        Creates a new verification run.
        """
        with Session(self.engine) as session, session.begin():
            session.expire_on_commit = False
            session.add(verification_run_duplicate)
            session.flush()
            session.refresh(verification_run_duplicate)
            session.commit()
        return verification_run_duplicate
    

    def create_verification(self, verification_data, session: Optional[Session] = None):
        """
        Creates a new verification.
        """
        b_session_was_opened = False
        if not session:
            session = Session(self.engine)
            b_session_was_opened = True
            session.begin()

        new_verification = Verification(**verification_data)
        session.add(new_verification)
        session.commit()

        if b_session_was_opened:
            session.close()
        return new_verification
    
    def create_proof(self, proof: Proof, session: Optional[Session] = None) -> Proof:
        """
        Creates a new proof (can be PhoneProof or any other proof type).
        If a session is provided, it will use that session; otherwise, a new session will be created.
        """
        # Use the provided session if available, otherwise create a new one
        b_session_was_opened = False
        if session is None:
            session = Session(self.engine)
            b_session_was_opened = True
            session.begin()

        try:
            session.expire_on_commit = False
            session.add(proof)
            session.flush()  # Ensure that the object is added to the database
            session.refresh(proof)  # Load the new data into the object
            session.commit()  # Commit the transaction
        except Exception as e:
            session.rollback()  # Rollback in case of error
            raise e  # Re-raise the exception for handling upstream
        finally:
            if b_session_was_opened:
                session.close()  # Close the session only if it was created in this method

        return proof




        #############  UPDATE  ##############
    
    def update_verification_status(self, verification_run, new_status: str, fail_reason: Optional[str]=None, session: Optional[Session] = None):
        """
        Updates the status of a verification run.
        """
        b_session_was_opened = False
        if not session:
            session = Session(self.engine)
            b_session_was_opened = True
            session.begin()

        if fail_reason:
            verification_run.fail_reason = fail_reason
            
        verification_run.status = new_status
        session.commit()

        if b_session_was_opened:
            session.close()



    def update_proof_status(self, proof, new_status: str, upload_date: Optional[datetime] = None, expiration_date: Optional[datetime] = None, session: Optional[Session] = None):
        """
        Updates the status of a proof.
        """
        b_session_was_opened = False
        if not session:
            session = Session(self.engine)
            b_session_was_opened = True
            session.begin()

        proof.status = new_status


        if expiration_date:
            proof.uploadDate = upload_date
            proof.expirationDate = expiration_date
        session.commit()

        if b_session_was_opened:
            session.close()


    def invalidate_verifications(self, service_provider_id: str, entity_type: str, entity_id: str, verification_type_code: str, session: Optional[Session] = None):
        """
        Invalidates all valid verifications.
        """
        b_session_was_opened = False
        if not session:
            session = Session(self.engine)
            b_session_was_opened = True
            session.begin()

        verifications = session.query(Verification).filter(
            Verification.serviceProviderID == service_provider_id,
            Verification.entityType == entity_type,
            Verification.entityID == entity_id,
            Verification.verificationTypeCode == verification_type_code,
            Verification.status == 'VALID'
        ).all()

        for verification in verifications:
            verification.status = 'REVOKED'
            '''
            
            self.publish_event_status(
                "REVOKED", 
                verification.verification_run.id, 
                verification.entityID, 
                verification.entityType, 
                verification.proofs[0].main_param, 
                verification.verificationTypeCode
            )
            '''

        session.commit()

        if b_session_was_opened:
            session.close()





    def invalidate_verification_runs(self, service_provider_id: str, entity_type: str, entity_id: str, verification_type_code: str, session: Optional[Session] = None):
        """
        Invalidates all new verification runs.
        """
        b_session_was_opened = False
        if not session:
            session = Session(self.engine)
            b_session_was_opened = True
            session.begin()

        session.query(VerificationRun).filter(
            VerificationRun.serviceProviderID == service_provider_id,
            VerificationRun.entityType == entity_type,
            VerificationRun.entityID == entity_id,
            VerificationRun.verificationTypeCode == verification_type_code,
        ).update({'status': 'INVALID'})
        session.commit()

        if b_session_was_opened:
            session.close()



    def update_phone_proof_status(self, entity_type: str, entity_id: str, new_status: str, session: Optional[Session] = None):
        """
        Updates the status of all proofs for a specific verification run.
        """
        b_session_was_opened = False
        if not session:
            session = Session(self.engine)
            b_session_was_opened = True
            session.begin()
        
        session.query(Proof).filter(
            Proof.entityType == entity_type,
            Proof.entityID == entity_id,
            Proof.type == "phone_proof"
        ).update({'status': new_status})
        session.commit()

        if b_session_was_opened:
            session.close()



    def is_verified(self, service_provider_id: str, entity_type: str, entity_id: int, verification_type_code: str, session: Optional[Session] = None) -> bool:
        b_session_was_opened = False
        if session is None:
            session = Session(self.engine)
            b_session_was_opened = True
            session.begin()
        
        try:
            verification = session.query(Verification).filter(
                Verification.serviceProviderID == service_provider_id,
                Verification.entityType == entity_type,
                Verification.entityID == entity_id,
                Verification.verificationTypeCode == verification_type_code,
                Verification.status == "VALID",
                Verification.effective_date <= datetime.now(),
                Verification.expiration_date >= datetime.now()
            ).first()

            return verification is not None
        finally:
            if b_session_was_opened:
                session.close()




    def list_verifications(
        self, 
        serviceProviderID: Optional[str] = None,
        verificationProcessCode: Optional[str] = None,
        entityType: Optional[str] = None,
        entityID: Optional[int] = None,
        verificationTypeCode: Optional[str] = None,
        date: Optional[datetime] = None,
        status: Optional[str] = None,
        data: Optional[Dict] = None,
        session: Optional[Session] = None
    ) -> List[Verification]:
        
        b_session_was_opened = False
        if session is None:
            session = Session(self.engine)
            b_session_was_opened = True
            session.begin()

        query = session.query(Verification)

        if serviceProviderID:
            query = query.filter(Verification.serviceProviderID == serviceProviderID)

        if serviceProviderID:
            query = query.filter(Verification.verificationProcessCode == verificationProcessCode)
        
        if entityType:
            query = query.filter(Verification.entityType == entityType)
        
        if entityID:
            query = query.filter(Verification.entityID == entityID)
        
        if verificationTypeCode:
            query = query.filter(Verification.verificationTypeCode == verificationTypeCode)
        
        if date:
            query = query.filter(
                and_(
                    Verification.effective_date <= date,
                    Verification.expiration_date >= date
                )
            )
        
        if status:
            query = query.filter(Verification.status == status)

        if data:
            query = query.filter(Verification.data == data)


        verifications = query.all()

        if b_session_was_opened:
            session.close()

        return verifications




    def delete_proof(self, verification_run_id: int, session: Session):
        """
        Deletes the proof using the given session.
        """
        session.query(Proof).filter(Proof.verificationRunID == verification_run_id).delete()
        session.commit()

        return True
    
    def delete_phone_proof(self, proof_id: int, session: Session):
        """
        Deletes the associated phone proof from the phone_proofs table based on the proof ID.
        """
        session.query(EmailProof).filter(EmailProof.id == proof_id).delete()
        session.commit()
    

    def get_proof(self, verification_run_id: int, session: Session):
        """
        Fetches the proof by verification run ID.
        """
        return session.query(Proof).filter(Proof.verificationRunID == verification_run_id).first()
    

    
    def is_run_duplicate(self, entity_id: str, verification_process: str, session: Optional[Session] = None) -> str:

            query: Query = session.query(VerificationRun)
            query = query.filter(VerificationRun.verificationProcessCode == verification_process)
            query = query.filter(VerificationRun.status == "ONGOING")


            ongoing_verifications: List[VerificationRun] = query.all()


            for verification in ongoing_verifications:
                if verification.entityID == entity_id:
                    return verification.id


                    
            return ""


    def email_duplicate_check(self, entity_id: str, email: str, session: Optional[Session] = None) -> str:



            query: Query = session.query(VerificationRun)
            query = query.filter(VerificationRun.verificationTypeCode == "EMAIL")
            query = query.filter(VerificationRun.status == "ONGOING")
            

            verificationruns: List[VerificationRun] = query.all()


            for verification in verificationruns:
                
                proofs=verification.proofs

                for proof in proofs:
                    if proof.main_param == email:
                        return "EMAIL_IN_ONGOING_RUN"


                
                

            query: Query = session.query(Verification)
            query = query.filter(Verification.verificationTypeCode == "EMAIL")
            query = query.filter(Verification.status == "VALID")


            valid_verifications: List[Verification] = query.all()


            for verification in valid_verifications:
                if verification.entityID == entity_id:
                    return "ENTITY_ALREADY_VERIFIED"

                proofs=verification.verification_run.proofs

                for proof in proofs:
                    if proof.main_param == email:
                        return "EMAIL_ALREADY_VERIFIED"

            return ""






    def expire_ongoing_verification_runs(self):
        session = Session(self.engine)
        session.begin()

        now = datetime.now()

        query: Query = session.query(VerificationRun)
        query = query.filter(VerificationRun.expiration_date <= now)
        query = query.filter(VerificationRun.status == "ONGOING")

        ongoing_verification_runs: List[VerificationRun] = query.all()


        for verification in ongoing_verification_runs:

            verification.status = "EXPIRED"

            for proof in verification.proofs:
                proof.status = "EXPIRED"
        
        session.commit()


    def expire_valid_verifications(self):
        session = Session(self.engine)
        session.begin()

        now = datetime.now()


        query: Query = session.query(Verification)
        query = query.filter(Verification.status == "VALID")
        query = query.filter(Verification.expiration_date <= now)

        valid_verifications: List[Verification] = query.all()


        for verification in valid_verifications:
            verification.status = "EXPIRED"

            
            '''
            self.publish_event_status(
                "EXPIRED", 
                verification.verification_run.id, 
                verification.entityID, 
                verification.entityType, 
                verification.proofs[0].main_param, 
                verification.verificationTypeCode
            )
            '''
            
            proofs=verification.verification_run.proofs

            for proof in proofs:
                proof.status = "EXPIRED"
            
        
        session.commit()



    def get_verification_run(self, verification_run_id: int, service_provider_id: str, entity_type: str, entity_id: int, verification_process: str, session: Optional[Session] = None):
        """
        Fetches the verification run by ID and other parameters, with proofs pre-loaded.
        """
        b_session_was_opened = False
        if not session:
            session = Session(self.engine)
            b_session_was_opened = True
            session.begin()
            session.expire_on_commit = False

        run = session.query(VerificationRun).options(joinedload(VerificationRun.proofs)).filter(
            VerificationRun.id == verification_run_id,
            VerificationRun.serviceProviderID == service_provider_id,
            VerificationRun.entityType == entity_type,
            VerificationRun.entityID == entity_id,
            VerificationRun.verificationProcessCode == verification_process
        ).first()

        if b_session_was_opened:
            session.close()

        return run
    
    def get_verification_run_id(self, entity_id: int, session: Optional[Session] = None):
        """
        Fetches the verification run by ID and other parameters, with proofs pre-loaded.
        """
        b_session_was_opened = False
        if not session:
            session = Session(self.engine)
            b_session_was_opened = True
            session.begin()
            session.expire_on_commit = False

        run = session.query(VerificationRun).options(joinedload(VerificationRun.proofs)).filter(
  
            
            VerificationRun.status == "ONGOING",
            VerificationRun.entityID == entity_id,
     
        ).first()

        if b_session_was_opened:
            session.close()

        return run.id
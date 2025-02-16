from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from Questgen import main
import nltk
import spacy
# Szükséges adatok letöltése
nltk.download("stopwords")

# FastAPI példány létrehozása
app = FastAPI()

# Questgen modellek betöltése
boolq_gen = main.BoolQGen()
qg = main.QGen()
answer_predictor = main.AnswerPredictor()

# Pydantic modellek
class TextPayload(BaseModel):
    input_text: str

class QAInput(BaseModel):
    input_text: str
    input_question: str

class ParaphrasePayload(BaseModel):
    input_text: str
    max_questions: int = 5

@app.post("/generate_boolean")
def generate_boolean(payload: TextPayload):
    """ Igen/Nem kérdések generálása """
    try:
        output = boolq_gen.predict_boolq(payload.dict())
        return {"questions": output}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/generate_mcq")
def generate_mcq(payload: TextPayload):
    """ Többszörös választásos kérdések generálása """
    try:
        output = qg.predict_mcq(payload.dict())
        return {"questions": output}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/generate_faq")
def generate_faq(payload: TextPayload):
    """ Általános kérdések generálása """
    try:
        output = qg.predict_shortq(payload.dict())
        return {"questions": output}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/paraphrase_question")
def paraphrase_question(payload: ParaphrasePayload):
    """ Kérdések átfogalmazása """
    try:
        output = qg.paraphrase(payload.dict())
        return {"paraphrased_questions": output}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/predict_answer")
def predict_answer(payload: QAInput):
    """ Kérdés-válasz predikció """
    try:
        output = answer_predictor.predict_answer(payload.dict())
        return {"answer": output}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

from pprint import pprint
import nltk
nltk.download('stopwords')
from Questgen import main
qg = main.QGen()
payload = {
            "input_text": "Sachin Ramesh Tendulkar is a former international cricketer from India and a former captain of the Indian national team. He is widely regarded as one of the greatest batsmen in the history of cricket. He is the highest run scorer of all time in International cricket."
        }



output = qg.predict_mcq(payload)
pprint (output)
    
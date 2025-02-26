from pprint import pprint
import nltk
nltk.download('stopwords')
from Questgen import main
qg = main.QGen()
payload = {
            "input_text": "Sachin Tendulkar was the most complete batter of his time, the most prolific run-maker of all time, and arguably the biggest cricket icon the game has ever known. His batting was based on the purest principles: perfect balance, economy of movement, precision in stroke-making, and that intangible quality given only to genius batters - anticipation. If he didn't have a signature stroke (though the upright, back-foot punch comes close) it was because he was proficient at so many and could pull them out at will. There were no apparent weaknesses in Tendulkar's game. He could score all around the wicket, off both feet, could temper his game to suit every situation, and made runs in all parts of the world, in all conditions.Some of his finest performances came against Australia, the dominant team of his era. His century as a 19-year-old on a lightning-fast pitch at the WACA is considered one of the best innings ever to have been played in that country. A few years later he received the ultimate compliment from the ultimate batter: Don Bradman confided to his wife that Tendulkar reminded him of himself."
        }



output = qg.predict_mcq(payload)
pprint (output)
    
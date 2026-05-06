from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import pandas as pd

app = Flask(__name__)
CORS(app)

def get_university_link(name):
    base = name.lower()

    # ✅ safer: open homepage (never 403)
    if "fast" in base:
        return "https://nu.edu.pk/"
    elif "comsats" in base:
        return "https://www.comsats.edu.pk/"
    elif "bahria" in base:
        return "https://bahria.edu.pk/"

    # ✅ fallback: Google search (always works)
    search_query = name.replace(" ", "+") + "+admissions+Pakistan"
    return f"https://www.google.com/search?q={search_query}"
    

   
# LOAD MODEL
model = joblib.load("career_model.pkl")
le_background = joblib.load("background_encoder.pkl")
le_career = joblib.load("career_encoder.pkl")


@app.route("/")
def home():
    return "API Running"


# 🔥 EXPLANATION FUNCTION
def generate_reason(data):
    reasons = []

    if int(data["Computer"]) >= 4:
        reasons.append("Strong interest in Computer")

    if int(data["Biology"]) >= 4:
        reasons.append("High interest in Biology")

    if int(data["Math"]) >= 4:
        reasons.append("Good analytical skills")

    if data["Background"] == "ICS":
        reasons.append("Background supports computing field")

    if data["Background"] == "Pre-Medical":
        reasons.append("Background supports medical field")

    return reasons


@app.route("/predict", methods=["POST"])
def predict():
    try:
        data = request.json

        city = data.get("City", None)

        model_input = data.copy()
        model_input.pop("City", None)

        df = pd.DataFrame([model_input])

        df = df[["Math", "Biology", "Computer", "Communication", "Marks", "Background", "Leadership"]]

        df["Background"] = le_background.transform(df["Background"])

        pred = model.predict(df)
        career = le_career.inverse_transform(pred)[0]

        # 🔥 EXPLANATION
        reasons = generate_reason(data)

        # -------- UNIVERSITIES --------
        uni_df = pd.read_csv("universities_cleaned.csv")

        mapping = {
            "BSCS": "Computer",
            "Software Engineering": "Software",
            "BBA": "Business",
            "MBBS": "Medical"
        }

        keyword = mapping.get(career, career)

        recommended = uni_df[
            (uni_df["Program"].str.contains(keyword, case=False)) &
            (uni_df["Merit"] <= data["Marks"])
        ]

        if city:
            recommended = recommended[
                recommended["City"].str.lower() == city.lower()
            ]

        recommended = recommended.drop_duplicates(
            subset=["University", "Program"]
        ).head(5)

        # 🔥 ADD REQUIREMENTS + GUIDANCE
        universities_list = []

        for _, row in recommended.iterrows():
           universities_list.append({
    "University": row["University"],
    "Program": row["Program"],
    "City": row["City"],
    "Merit": row["Merit"],

    # 🔥 NEW FEATURES
    "your_marks": data["Marks"],

    "eligibility": "Eligible" if data["Marks"] >= row["Merit"] else "Not Eligible",

    "requirements": f"Minimum {row['Merit']}% merit required",

    "link": get_university_link(row["University"]),

    "guidance": [
        "Apply before deadline",
        "Prepare required documents",
        "Check entry test schedule"
    ]
})
        return jsonify({
            "career": career,
            "reasons": reasons,
            "universities": universities_list
        })

    except Exception as e:
        return jsonify({"error": str(e)})


if __name__ == "__main__":
    app.run(debug=True)
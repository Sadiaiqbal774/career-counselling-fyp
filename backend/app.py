from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import pandas as pd

app = Flask(__name__)
CORS(app)

# ================================
# LOAD MODEL
# ================================
model = joblib.load("career_model.pkl")
le_background = joblib.load("background_encoder.pkl")
le_career = joblib.load("career_encoder.pkl")

# ================================
# LOAD CSV FILES
# ================================
uni_df = pd.read_csv("universities_cleaned.csv")
scholarships_df = pd.read_csv("scholarships.csv")


# ================================
# UNIVERSITY LINKS
# ================================
def get_university_link(name):
    base = name.lower()

    if "fast" in base:
        return "https://nu.edu.pk/"
    elif "comsats" in base:
        return "https://www.comsats.edu.pk/"
    elif "bahria" in base:
        return "https://bahria.edu.pk/"

    search_query = name.replace(" ", "+") + "+admissions+Pakistan"
    return f"https://www.google.com/search?q={search_query}"


# ================================
# HOME ROUTE
# ================================
@app.route("/")
def home():
    return "Career Counselling API Running"


# ================================
# EXPLANATION FUNCTION
# ================================
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


# ================================
# PREDICT ROUTE
# ================================
@app.route("/predict", methods=["POST"])
def predict():
    try:
        data = request.json

        city = data.get("City", None)

        # ================================
        # MODEL INPUT
        # ================================
        model_input = data.copy()
        model_input.pop("City", None)

        df = pd.DataFrame([model_input])

        df = df[[
            "Math",
            "Biology",
            "Computer",
            "Communication",
            "Marks",
            "Background",
            "Leadership"
        ]]

        # Encode background
        df["Background"] = le_background.transform(df["Background"])

        # ================================
        # CAREER PREDICTION
        # ================================
        pred = model.predict(df)
        career = le_career.inverse_transform(pred)[0]

        # ================================
        # EXPLANATION
        # ================================
        reasons = generate_reason(data)

        # ================================
        # UNIVERSITY FILTERING
        # ================================
        mapping = {
            "BSCS": ["Computer", "CS"],
            "Software Engineering": ["Software"],
            "BBA": ["Business", "Management"],
            "Media Studies": ["Communication", "Media"],
            "Pharmacy": ["Pharmacy"],
            "MBBS": ["Medical"]
        }

        keywords = mapping.get(career, [career])

        marks = data["Marks"]

        # helper function
        def match_program(df, keywords):
            condition = False

            for k in keywords:
                condition = condition | df["Program"].str.contains(
                    k,
                    case=False,
                    na=False
                )

            return df[condition]

        # strict filter
        recommended = match_program(uni_df, keywords)
        recommended = recommended[
            recommended["Merit"] <= marks
        ]

        # relaxed filter
        if recommended.empty:
            recommended = match_program(uni_df, keywords)
            recommended = recommended[
                recommended["Merit"] <= marks + 10
            ]

        # fallback
        if recommended.empty:
            recommended = match_program(uni_df, keywords)

        # city filter
        if city:
            recommended = recommended[
                recommended["City"].str.lower() == city.lower()
            ]

        # remove duplicates
        recommended = recommended.drop_duplicates(
            subset=["University", "Program"]
        ).head(5)

        # ================================
        # UNIVERSITIES RESPONSE
        # ================================
        universities_list = []

        for _, row in recommended.iterrows():

            universities_list.append({
                "University": row["University"],
                "Program": row["Program"],
                "City": row["City"],
                "Merit": row["Merit"],

                "your_marks": marks,

                "eligibility":
                    "Eligible"
                    if marks >= row["Merit"]
                    else "Not Eligible",

                "requirements":
                    f"Minimum {row['Merit']}% merit required",

                "link":
                    get_university_link(row["University"]),

                "guidance": [
                    "Apply before deadline",
                    "Prepare required documents",
                    "Check entry test schedule"
                ]
            })

        # ================================
        # SCHOLARSHIP FILTERING
        # ================================
        filtered_scholarships = scholarships_df[
            scholarships_df["min_percentage"] <= marks
        ]

        scholarships = filtered_scholarships.to_dict(
            orient="records"
        )

        # ================================
        # FINAL RESPONSE
        # ================================
        return jsonify({
            "career": career,
            "reasons": reasons,
            "universities": universities_list,
            "scholarships": scholarships
        })

    except Exception as e:
        return jsonify({"error": str(e)})


# ================================
# RUN APP
# ================================
if __name__ == "__main__":
    app.run(debug=True)
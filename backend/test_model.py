import joblib
import pandas as pd

# Load model & encoders
model = joblib.load("career_model.pkl")
le_background = joblib.load("background_encoder.pkl")
le_career = joblib.load("career_encoder.pkl")

# -------- STUDENT INPUT --------
data = {
    "Math": 80,
    "Biology": 2,
    "Computer": 5,
    "Communication": 3,
    "Marks": 85,
    "Background": "ICS",
    "Leadership": 4
}

df = pd.DataFrame([data])

# Encode Background
df["Background"] = le_background.transform(df["Background"])

# -------- PREDICTION --------
pred = model.predict(df)
career = le_career.inverse_transform(pred)

print("Predicted Career:", career[0])

# -------- UNIVERSITY FILTER --------
uni_df = pd.read_csv("universities_cleaned.csv")

# Mapping for better matching
mapping = {
    "BSCS": "Computer",
    "Software Engineering": "Software"
}

keyword = mapping.get(career[0], career[0])

recommended = uni_df[
    (uni_df["Program"].str.contains(keyword, case=False)) &
    (uni_df["Merit"] <= data["Marks"])
]

print("\nRecommended Universities:")
print(recommended.head())
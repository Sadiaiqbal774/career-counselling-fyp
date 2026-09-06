import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score
import joblib

# Load dataset
df = pd.read_csv("student_dataset_500.csv")

# --------- ENCODING ---------
le_background = LabelEncoder()
df['Background'] = le_background.fit_transform(df['Background'])

le_career = LabelEncoder()
df['Career'] = le_career.fit_transform(df['Career'])

# --------- FEATURES & TARGET ---------
X = df.drop("Career", axis=1)
y = df["Career"]

# --------- TRAIN TEST SPLIT ---------
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

# --------- MODEL ---------
model = RandomForestClassifier(n_estimators=100)
model.fit(X_train, y_train)

# --------- EVALUATION ---------
y_pred = model.predict(X_test)
print("Accuracy:", accuracy_score(y_test, y_pred))

# --------- SAVE ---------
joblib.dump(model, "career_model.pkl")
joblib.dump(le_background, "background_encoder.pkl")
joblib.dump(le_career, "career_encoder.pkl")

print("Model trained and saved successfully!")
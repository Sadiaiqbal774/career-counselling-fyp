"""
Model Training Script for Student Career Guidance

Algorithm: RandomForestClassifier (only model used by the website)
Reads student_dataset_v2.csv, compares two predefined Random Forest settings via 5-fold
StratifiedKFold cross-validation, selects the setting with lower log_loss, evaluates on a
stratified 80/20 hold-out set, fits on all rows, and saves backend/career_model.pkl as a single Pipeline.
"""

from pathlib import Path
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder
from sklearn.pipeline import Pipeline
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import StratifiedKFold, cross_val_predict, train_test_split
from sklearn.metrics import accuracy_score, log_loss, confusion_matrix, top_k_accuracy_score
import joblib

FEATURE_COLS = ["Math", "Biology", "Computer", "Communication", "Leadership", "Background"]
TARGET_COL = "Career"


def create_pipeline(rf_params):
    preprocessor = ColumnTransformer(
        transformers=[
            ("bg", OneHotEncoder(handle_unknown="ignore"), ["Background"]),
        ],
        remainder="passthrough",
    )
    classifier = RandomForestClassifier(**rf_params)
    return Pipeline([
        ("preprocessor", preprocessor),
        ("classifier", classifier),
    ])


def main():
    backend_dir = Path(__file__).resolve().parent
    data_path = backend_dir / "student_dataset_v2.csv"
    if not data_path.exists():
        data_path = Path("student_dataset_v2.csv")

    print(f"Reading dataset from {data_path}...")
    df = pd.read_csv(data_path)
    initial_rows = len(df)
    df = df.drop_duplicates().reset_index(drop=True)
    dedup_rows = len(df)
    dropped_duplicates = initial_rows - dedup_rows
    print(f"Loaded {initial_rows} rows; dropped {dropped_duplicates} duplicate rows ({dedup_rows} rows remaining).")

    X = df[FEATURE_COLS]
    y = df[TARGET_COL]
    classes = np.unique(y)

    # Compare ONLY these two settings
    settings = {
        "Setting 1: RandomForestClassifier(n_estimators=100, random_state=42)": {
            "n_estimators": 100,
            "random_state": 42,
        },
        "Setting 2: RandomForestClassifier(n_estimators=300, min_samples_leaf=3, random_state=42)": {
            "n_estimators": 300,
            "min_samples_leaf": 3,
            "random_state": 42,
        },
    }

    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    cv_results = {}

    print("\nEvaluating settings with 5-fold StratifiedKFold cross_val_predict (random_state=42)...")
    for name, params in settings.items():
        print(f"\nRunning 5-fold CV for {name}...")
        pipeline = create_pipeline(params)
        y_proba_cv = cross_val_predict(pipeline, X, y, cv=cv, method="predict_proba")
        
        # Scikit-learn cross_val_predict with predict_proba orders columns by np.unique(y)
        y_pred_cv = classes[np.argmax(y_proba_cv, axis=1)]

        acc = accuracy_score(y, y_pred_cv)
        top3_acc = top_k_accuracy_score(y, y_proba_cv, k=3, labels=classes)
        loss = log_loss(y, y_proba_cv, labels=classes)
        confidences = np.max(y_proba_cv, axis=1)
        avg_conf = np.mean(confidences)
        share_99 = np.mean(confidences >= 0.99)

        cv_results[name] = {
            "params": params,
            "accuracy": acc,
            "top3_accuracy": top3_acc,
            "log_loss": loss,
            "avg_confidence": avg_conf,
            "share_ge_99": share_99,
        }

        print(f"  Accuracy (Top-1):              {acc:.4f} ({acc * 100:.2f}%)")
        print(f"  Top-3 Accuracy:                {top3_acc:.4f} ({top3_acc * 100:.2f}%)")
        print(f"  Log Loss:                      {loss:.4f}")
        print(f"  Average Confidence:            {avg_conf:.4f} ({avg_conf * 100:.2f}%)")
        print(f"  Share with Confidence >= 99%:   {share_99:.4f} ({share_99 * 100:.2f}%)")

    # Select setting with lower log_loss
    chosen_name = min(cv_results, key=lambda k: cv_results[k]["log_loss"])
    chosen_params = cv_results[chosen_name]["params"]
    print(f"\nChosen Setting (lower log_loss): {chosen_name}")

    # Stratified 80/20 hold-out evaluation
    print("\nRunning Stratified 80/20 hold-out evaluation...")
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    holdout_pipeline = create_pipeline(chosen_params)
    holdout_pipeline.fit(X_train, y_train)
    y_test_pred = holdout_pipeline.predict(X_test)
    y_test_proba = holdout_pipeline.predict_proba(X_test)
    holdout_accuracy = accuracy_score(y_test, y_test_pred)
    holdout_top3_accuracy = top_k_accuracy_score(y_test, y_test_proba, k=3, labels=holdout_pipeline.classes_)
    cm = confusion_matrix(y_test, y_test_pred, labels=holdout_pipeline.classes_)
    cm_df = pd.DataFrame(cm, index=holdout_pipeline.classes_, columns=holdout_pipeline.classes_)
    print(f"Stratified 80/20 Hold-out Accuracy (Top-1): {holdout_accuracy:.4f} ({holdout_accuracy * 100:.2f}%)")
    print(f"Stratified 80/20 Hold-out Top-3 Accuracy:   {holdout_top3_accuracy:.4f} ({holdout_top3_accuracy * 100:.2f}%)")

    # Fit chosen model on ALL rows and save
    print("\nFitting chosen model on all rows...")
    final_pipeline = create_pipeline(chosen_params)
    final_pipeline.fit(X, y)
    model_output_path = backend_dir / "career_model.pkl"
    joblib.dump(final_pipeline, model_output_path)
    print(f"Saved complete Pipeline to {model_output_path}")
    print(f"Pipeline classes_ count: {len(final_pipeline.classes_)} (string career names, no LabelEncoders needed).")

    # Format the full report
    report_lines = [
        "Algorithm: RandomForestClassifier (only model used by the website)",
        "=" * 70,
        "MODEL TRAINING & EVALUATION REPORT",
        "=" * 70,
        "",
        "1. DATASET SUMMARY",
        f"  - Dataset file:          {data_path.name}",
        f"  - Initial rows read:     {initial_rows}",
        f"  - Duplicate rows dropped:{dropped_duplicates}",
        f"  - Final training rows:   {dedup_rows}",
        f"  - Features used:         {', '.join(FEATURE_COLS)}",
        f"  - Target column:         {TARGET_COL} ({len(classes)} classes)",
        f"  - Note:                  Marks column was NOT included.",
        "",
        "2. 5-FOLD STRATIFIED CROSS-VALIDATION COMPARISON (random_state=42)",
        "-" * 70,
    ]

    for name, r in cv_results.items():
        report_lines.extend([
            f"  {name}:",
            f"    - Accuracy (Top-1):                {r['accuracy']:.4f} ({r['accuracy'] * 100:.2f}%)",
            f"    - Top-3 Accuracy:                  {r['top3_accuracy']:.4f} ({r['top3_accuracy'] * 100:.2f}%)",
            f"    - Log Loss:                        {r['log_loss']:.4f}",
            f"    - Average Confidence:              {r['avg_confidence']:.4f} ({r['avg_confidence'] * 100:.2f}%)",
            f"    - Share with Confidence >= 99%:    {r['share_ge_99']:.4f} ({r['share_ge_99'] * 100:.2f}%)",
            "",
        ])

    diff_loss = abs(cv_results[list(settings.keys())[0]]["log_loss"] - cv_results[list(settings.keys())[1]]["log_loss"])
    report_lines.extend([
        "3. MODEL SELECTION",
        f"  - Chosen Setting:        {chosen_name}",
        f"  - Selection Criterion:   Lower log_loss (difference of {diff_loss:.4f})",
        "",
        "4. STRATIFIED 80/20 HOLD-OUT EVALUATION",
        f"  - Train samples:         {len(X_train)} (80%)",
        f"  - Test samples:          {len(X_test)} (20%)",
        f"  - Hold-out Accuracy (Top-1):         {holdout_accuracy:.4f} ({holdout_accuracy * 100:.2f}%)",
        f"  - Hold-out Top-3 Accuracy:           {holdout_top3_accuracy:.4f} ({holdout_top3_accuracy * 100:.2f}%)",
        "",
        "5. CONFUSION MATRIX (Hold-out Test Set):",
        "-" * 70,
        cm_df.to_string(),
        "-" * 70,
        "",
        "6. ARTIFACT PERSISTENCE",
        f"  - Saved Pipeline:        {model_output_path}",
        f"  - Model Classes ({len(final_pipeline.classes_)}):     {', '.join(final_pipeline.classes_)}",
        "  - LabelEncoders:         None needed (classes are native strings in the Pipeline).",
        "=" * 70,
    ])

    report_text = "\n".join(report_lines) + "\n"

    # Write report to backend/ml/model_report.txt
    ml_dir = backend_dir / "ml"
    ml_dir.mkdir(parents=True, exist_ok=True)
    report_path = ml_dir / "model_report.txt"
    report_path.write_text(report_text, encoding="utf-8")
    print(f"\nWrote full report to {report_path}")

    return report_text


if __name__ == "__main__":
    main()

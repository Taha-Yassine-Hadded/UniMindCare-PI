import sys
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import json
import traceback
from sklearn.linear_model import LinearRegression

def load_and_preprocess_data(user_data):
    try:
        df = pd.DataFrame(user_data)
        df['createdAt'] = pd.to_datetime(df['createdAt'], errors='coerce')
        df = df.dropna(subset=['createdAt'])
        df['date'] = df['createdAt'].dt.strftime('%Y-%m-%d')
        print("Preprocessed Data Sample:", df[['createdAt', 'date']].head().to_dict(orient='records'), file=sys.stderr)
        return df
    except Exception as e:
        print(f"Error in load_and_preprocess_data: {str(e)}", file=sys.stderr)
        raise

def calculate_users_per_day(df):
    daily_counts = df.groupby('date').size().reset_index(name='user_count')
    daily_counts['date'] = pd.to_datetime(daily_counts['date'])
    date_range = pd.date_range(start=daily_counts['date'].min(), end=daily_counts['date'].max())
    daily_counts = daily_counts.set_index('date').reindex(date_range, fill_value=0).reset_index()
    daily_counts.columns = ['date', 'user_count']
    daily_counts['day_index'] = (daily_counts['date'] - daily_counts['date'].min()).dt.days
    print("Daily Counts:", file=sys.stderr)
    print(daily_counts[['date', 'user_count']].to_dict(orient='records'), file=sys.stderr)
    return daily_counts

def train_prediction_model(daily_counts):
    if daily_counts.empty:
        print("Warning: No data available for training.", file=sys.stderr)
        return 0, 0, 0

    X = daily_counts['day_index'].values.reshape(-1, 1)
    y = daily_counts['user_count'].values

    model = LinearRegression()
    model.fit(X, y)
    slope = model.coef_[0]
    intercept = model.intercept_

    # Calculate uncertainty as standard deviation of residuals
    predictions = model.predict(X)
    residuals = y - predictions
    uncertainty = np.std(residuals)
    print(f"Uncertainty (Std Dev of Residuals): {uncertainty}", file=sys.stderr)

    last_day = daily_counts['day_index'].max()
    current_level = model.predict([[last_day]])[0]
    print(f"Linear Regression - Current Level: {current_level}, Slope (Trend): {slope}", file=sys.stderr)

    recent_average = y[-30:].mean() if len(y) >= 30 else y.mean()
    print(f"Recent 30-Day Average: {recent_average}", file=sys.stderr)

    return current_level, slope, recent_average, uncertainty

def make_predictions(level, trend, baseline_average, uncertainty, daily_counts, days_ahead=[1, 7, 30]):
    last_date = daily_counts['date'].max()
    last_day_index = daily_counts['day_index'].max()
    predictions = {}

    adjusted_trend = max(trend, 0.05 * baseline_average / 30)
    print(f"Adjusted Trend (dynamic): {adjusted_trend}", file=sys.stderr)

    max_days = max(days_ahead)
    daily_predictions = []
    for day in range(1, max_days + 1):
        future_day_index = last_day_index + day
        predicted_users = level + adjusted_trend * day
        predicted_users = max(0, round(predicted_users))
        daily_predictions.append(predicted_users)
        print(f"Daily Prediction for {(last_date + timedelta(days=day)).strftime('%Y-%m-%d')} (Day {future_day_index}): {predicted_users} ± {round(uncertainty)}", file=sys.stderr)

    # Store predictions with uncertainty
    predictions[1] = {
        'date': (last_date + timedelta(days=1)).strftime('%Y-%m-%d'),
        'predicted_users': daily_predictions[0],
        'uncertainty': round(uncertainty)  # Single ± number
    }
    predictions[7] = {
        'date': (last_date + timedelta(days=7)).strftime('%Y-%m-%d'),
        'predicted_users': sum(daily_predictions[:7]),
        'uncertainty': round(uncertainty * 7)  # Scale uncertainty for cumulative periods
    }
    predictions[30] = {
        'date': (last_date + timedelta(days=30)).strftime('%Y-%m-%d'),
        'predicted_users': sum(daily_predictions[:30]),
        'uncertainty': round(uncertainty * 30)  # Scale uncertainty for cumulative periods
    }
    print("Cumulative Predictions with Uncertainty:", predictions, file=sys.stderr)

    return predictions

if __name__ == "__main__":
    try:
        user_data = json.loads(sys.stdin.read())
        print("Raw Input Data Sample:", user_data[:5] if user_data else "No data", file=sys.stderr)
        df = load_and_preprocess_data(user_data)
        daily_counts = calculate_users_per_day(df)
        level, trend, baseline_average, uncertainty = train_prediction_model(daily_counts)
        predictions = make_predictions(level, trend, baseline_average, uncertainty, daily_counts)
        print(json.dumps({
            "next_day": predictions[1],
            "next_week": predictions[7],
            "next_month": predictions[30]
        }))
    except Exception as e:
        print(f"Error in predict.py: {str(e)}", file=sys.stderr)
        traceback.print_exc(file=sys.stderr)
        sys.exit(1)
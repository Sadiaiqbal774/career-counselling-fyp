# CareerGuide - AI-Powered Career Counseling Platform

A professional career guidance application that uses machine learning to match students with suitable career paths and universities based on their academic background, interests, and strengths.

## Features

✨ **AI-Powered Career Matching** - Machine learning model trained on real student data predicts career fit  
📊 **Personalized Assessment** - Multi-part quiz evaluating academic skills, interests, and background  
🏫 **University Recommendations** - Curated institution list with admission merit requirements  
🔐 **Data Privacy** - Encrypted student information, never shared without consent  
📱 **Responsive Design** - Professional beige/brown interface optimized for all devices  

## Tech Stack

**Frontend:**
- React 18 with React Router
- Tailwind CSS + custom brown/beige theme
- Axios for API calls

**Backend:**
- Node.js/Express
- PostgreSQL database
- JWT authentication with bcrypt password hashing
- Nodemailer for password reset emails

**Machine Learning:**
- Python Flask
- scikit-learn RandomForestClassifier
- pandas for data processing
- joblib for model serialization

## Project Structure

```
career-counselling-app/
├── src/                          # React frontend
│   ├── pages/                    # Page components (Landing, Quiz, Result, etc.)
│   ├── components/               # Reusable components (ProtectedRoute, etc.)
│   ├── context/                  # AuthContext for user state
│   ├── data/                     # Quiz questions and configuration
│   ├── App.js                    # Main app routing
│   └── index.css                 # Global styles
├── server/                       # Express backend
│   ├── routes/                   # API endpoints (auth, quiz)
│   ├── sql/                      # Database schema
│   ├── index.js                  # Server entry point
│   ├── db.js                     # PostgreSQL connection
│   ├── package.json              # Backend dependencies
│   └── .env                      # Environment configuration (DO NOT COMMIT)
├── model training/               # ML model files
│   ├── model training/
│   │   ├── app.py                # Flask API for predictions
│   │   ├── career_model.pkl      # Trained RandomForest model
│   │   ├── background_encoder.pkl # LabelEncoder for Background field
│   │   ├── career_encoder.pkl     # LabelEncoder for Career predictions
│   │   ├── student_dataset_500.csv # Training dataset
│   │   └── universities_cleaned.csv # University recommendations
│   └── requirements.txt           # Python dependencies
├── public/                       # Static assets
├── package.json                  # Frontend dependencies
├── tailwind.config.js            # Tailwind configuration
└── README.md                     # This file
```

## Prerequisites

- **Node.js** 16+ (frontend and backend)
- **Python** 3.7+ (for ML model)
- **PostgreSQL** 12+ (database)
- **Git** (version control)

## Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/career-counselling-app.git
cd career-counselling-app
```

### 2. Frontend Setup

```bash
# Install dependencies
npm install

# Create .env for frontend (optional)
echo "REACT_APP_API_URL=http://localhost:4000" > .env
```

### 3. Backend Setup

```bash
cd server

# Install dependencies
npm install

# Create .env file with your configuration
echo "DATABASE_URL=postgresql://postgres:password@localhost:5432/careerdb" > .env
echo "JWT_SECRET=your_jwt_secret_key_here" >> .env
echo "FRONTEND_URL=http://localhost:3000" >> .env
echo "FLASK_API_URL=http://localhost:5000" >> .env
# Optional: Add SMTP settings for email notifications
```

### 4. Database Setup

```bash
# Create database (using psql)
psql -U postgres -c "CREATE DATABASE careerdb;"

# Load schema
psql -U postgres -d careerdb -f sql/init.sql
```

### 5. ML Model Setup

```bash
cd "model training/model training"

# Create and activate Python virtual environment
python -m venv .venv
.\.venv\Scripts\activate  # Windows
# OR
source .venv/bin/activate  # macOS/Linux

# Install Python dependencies
pip install -r requirements.txt
```

## Running the Application

You'll need **three terminal windows** running simultaneously:

### Terminal 1: Flask ML Service (Port 5000)

```bash
cd "model training/model training"
.\.venv\Scripts\python.exe app.py  # Windows
# OR
python app.py  # macOS/Linux
```

Expected output:
```
* Running on http://127.0.0.1:5000
```

### Terminal 2: Express Backend (Port 4000)

```bash
cd server
npm run dev
```

Expected output:
```
Server running on port 4000
```

### Terminal 3: React Frontend (Port 3000)

```bash
npm start
```

The app will open automatically at `http://localhost:3000`

## Assessment Flow

1. **Sign Up/Login** - Create account or log in
2. **General Quiz** - Interest-based assessment (multiple choice)
3. **Specific Quiz** - Category-focused questions
4. **Detailed Quiz** - ML model input (Math, Biology, Computer, Communication, Marks, Background, Leadership)
5. **Results** - AI-predicted career + university recommendations

## API Endpoints

### Authentication (Express on port 4000)
- `POST /api/auth/register` - Create new account
- `POST /api/auth/login` - Login with email/password
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password with token
- `GET /api/auth/me` - Get current user (requires JWT)

### Quiz & Predictions (Express proxies to Flask)
- `POST /api/quiz/predict` - Get career prediction and university list
- `GET /api/quiz/encoders` - Get valid values for dropdowns

### ML Model (Flask on port 5000)
- `POST /predict` - Direct prediction endpoint
- `GET /encoders` - Valid encoder values

## Environment Variables

Create `.env` files in `server/` and `.env.local` in the root:

**server/.env (NEVER commit):**
```
DATABASE_URL=postgresql://postgres:password@localhost:5432/careerdb
JWT_SECRET=your-secret-key-change-in-production
FRONTEND_URL=http://localhost:3000
FLASK_API_URL=http://localhost:5000
SMTP_HOST=smtp.gmail.com      # Optional
SMTP_PORT=587                 # Optional
SMTP_USER=your-email@gmail.com # Optional
SMTP_PASS=your-app-password   # Optional
```

## Color Scheme

- **Primary Background:** #F7EFE7 (Light Beige)
- **Card Background:** #FFF8F0 (Lighter Beige)
- **Primary Text:** #2b1b0e (Dark Brown)
- **Muted Text:** #7a5f4f (Medium Brown)
- **Accent:** #7C5D42 (Warm Brown)

## Deployment

### Frontend (Vercel/Netlify)
1. Build: `npm run build`
2. Deploy the `build/` folder
3. Set environment variable: `REACT_APP_API_URL=<your-backend-url>`

### Backend (Heroku/Railway/Render)
1. Push `server/` folder
2. Set environment variables via platform dashboard
3. Ensure PostgreSQL is connected

### ML Model (Same server as backend or separate)
1. Deploy Flask app alongside backend
2. Ensure `model training/model training/` files are included
3. Set `FLASK_API_URL` to Flask service address

## Troubleshooting

**"Model service unavailable" error:**
- Ensure Flask is running on port 5000
- Check `FLASK_API_URL` in `server/.env`
- Verify model files exist: `career_model.pkl`, encoders

**"Cannot connect to database" error:**
- Verify PostgreSQL is running
- Check `DATABASE_URL` format
- Run `psql -l` to list databases
- Ensure `careerdb` exists and schema is loaded

**"Port already in use" error:**
- Change port in `server/index.js` or kill existing process
- Windows: `netstat -ano | findstr :PORT`
- macOS/Linux: `lsof -i :PORT`

## Model Training

To retrain the model with new data:

```bash
cd "model training/model training"
python train_model.py
```

This will regenerate:
- `career_model.pkl`
- `background_encoder.pkl`
- `career_encoder.pkl`

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit changes: `git commit -m "Add your feature"`
4. Push to branch: `git push origin feature/your-feature`
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Privacy & Data Security

- All student data is encrypted
- Assessment results are stored securely
- We never share information without consent
- Password reset tokens expire after 1 hour
- JWT tokens are session-based (not stored long-term)

## Support

For issues, questions, or suggestions:
- Open a GitHub issue
- Email: support@careerguide.app (placeholder)

---

**Built with ❤️ for students seeking clarity in their career path.**

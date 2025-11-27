import os
import random
import datetime
import requests
import torch
import torch.nn as nn
from torchvision import transforms, models
from PIL import Image
from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from werkzeug.utils import secure_filename
from werkzeug.security import generate_password_hash, check_password_hash

# --- BREVO EMAIL CONFIGURATION ---
# Loads from Environment Variables (Safe for GitHub)
BREVO_API_KEY = os.environ.get("BREVO_API_KEY") 
SENDER_EMAIL = os.environ.get("SENDER_EMAIL")

app = Flask(__name__)
CORS(app)

# --- DATABASE CONFIGURATION (Cloud & Local Support) ---
# This block checks if we are on the Cloud. If not, it uses your local settings.
DB_HOST = os.environ.get('DB_HOST', 'localhost')
DB_USER = os.environ.get('DB_USER', 'kinga_user')
DB_PASS = os.environ.get('DB_PASS', 'kinga123')
DB_NAME = os.environ.get('DB_NAME', 'kinga_db')
DB_PORT = os.environ.get('DB_PORT', '3306')

app.config['SQLALCHEMY_DATABASE_URI'] = f'mysql+pymysql://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

UPLOAD_FOLDER = 'static/uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

db = SQLAlchemy(app)

# --- MODELS ---
class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    full_name = db.Column(db.String(100))
    email = db.Column(db.String(100), unique=True)
    password_hash = db.Column(db.String(255))
    otp_code = db.Column(db.String(6))
    is_verified = db.Column(db.Boolean, default=False)

class Pest(db.Model):
    __tablename__ = 'pests'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100))
    description = db.Column(db.Text)
    recommended_actions = db.Column(db.Text)
    causes = db.Column(db.Text)
    effects = db.Column(db.Text)
    swahili_name = db.Column(db.String(100))
    swahili_actions = db.Column(db.Text)
    swahili_causes = db.Column(db.Text)
    swahili_effects = db.Column(db.Text)

class Prediction(db.Model):
    __tablename__ = 'predictions'
    id = db.Column(db.Integer, primary_key=True)
    pest_id = db.Column(db.Integer, db.ForeignKey('pests.id'), nullable=True)
    image_path = db.Column(db.String(255))
    confidence = db.Column(db.Float)
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    pest = db.relationship('Pest', backref='predictions')

# --- BREVO EMAIL FUNCTION ---
def send_real_email_brevo(to_email, otp_code):
    if not BREVO_API_KEY:
        print("Skipping email: No API Key found.")
        return

    url = "https://api.brevo.com/v3/smtp/email"
    headers = {
        "accept": "application/json",
        "api-key": BREVO_API_KEY,
        "content-type": "application/json"
    }
    
    html_content = f"""
    <html>
      <body style="font-family: Arial, sans-serif; padding: 20px;">
        <h2 style="color: #1b5e20;">Kinga Pest Control</h2>
        <p>Hello,</p>
        <p>Use the code below to verify your account or reset your password:</p>
        <h1 style="background-color: #f0f0f0; padding: 10px; display: inline-block; letter-spacing: 5px;">{otp_code}</h1>
        <p>This code is valid for 10 minutes.</p>
        <p>Thank you,<br>The Kinga Team</p>
      </body>
    </html>
    """

    payload = {
        "sender": {"name": "Kinga App", "email": SENDER_EMAIL},
        "to": [{"email": to_email}],
        "subject": f"Your Kinga Verification Code: {otp_code}",
        "htmlContent": html_content
    }

    try:
        response = requests.post(url, json=payload, headers=headers)
        if response.status_code == 201:
            print(f"Email sent successfully to {to_email}")
        else:
            print("Failed to send email:", response.text)
    except Exception as e:
        print("Error sending email:", e)


# --- AUTH ENDPOINTS ---

@app.route('/signup', methods=['POST'])
def signup():
    data = request.json
    if User.query.filter_by(email=data['email']).first():
        return jsonify({'error': 'Email already exists'}), 400

    otp = str(random.randint(100000, 999999))
    hashed_pw = generate_password_hash(data['password'])
    
    new_user = User(
        full_name=data['fullName'],
        email=data['email'],
        password_hash=hashed_pw,
        otp_code=otp,
        is_verified=False
    )
    db.session.add(new_user)
    db.session.commit()
    
    # Send Email (Or print if no key)
    if BREVO_API_KEY:
        send_real_email_brevo(data['email'], otp)
    else:
        print(f"--- LOCAL MODE: OTP IS {otp} ---")
    
    return jsonify({'message': 'Signup successful.'})

@app.route('/verify', methods=['POST'])
def verify():
    data = request.json
    user = User.query.filter_by(email=data['email']).first()
    
    if not user or user.otp_code != data['otp']:
        return jsonify({'error': 'Invalid OTP Code'}), 400
    
    user.is_verified = True
    user.otp_code = None 
    db.session.commit()
    return jsonify({'message': 'Account verified!'})

@app.route('/login', methods=['POST'])
def login():
    data = request.json
    user = User.query.filter_by(email=data['email']).first()
    
    if not user or not check_password_hash(user.password_hash, data['password']):
        return jsonify({'error': 'Invalid email or password'}), 401
    
    if not user.is_verified:
        return jsonify({'error': 'Account not verified. Please verify first.'}), 403

    return jsonify({'message': 'Login successful', 'user_id': user.id, 'name': user.full_name})

@app.route('/forgot-password', methods=['POST'])
def forgot_password():
    data = request.json
    user = User.query.filter_by(email=data['email']).first()
    if not user:
        return jsonify({'error': 'Email not found'}), 404
    
    otp = str(random.randint(100000, 999999))
    user.otp_code = otp
    db.session.commit()
    
    if BREVO_API_KEY:
        send_real_email_brevo(data['email'], otp)
    else:
        print(f"--- LOCAL MODE: OTP IS {otp} ---")
    
    return jsonify({'message': 'OTP sent'})

@app.route('/reset-password', methods=['POST'])
def reset_password():
    data = request.json
    user = User.query.filter_by(email=data['email']).first()
    
    if not user or user.otp_code != data['otp']:
        return jsonify({'error': 'Invalid OTP'}), 400
        
    user.password_hash = generate_password_hash(data['newPassword'])
    user.otp_code = None
    db.session.commit()
    
    return jsonify({'message': 'Password reset successful. Please login.'})

# --- AI LOGIC ---
try:
    with open("class_names.txt", "r") as f:
        class_names = [line.strip() for line in f.readlines()]
    model = models.resnet18(pretrained=False)
    model.fc = nn.Linear(model.fc.in_features, len(class_names))
    model.load_state_dict(torch.load('pest_model.pth'))
    model.eval()
except:
    print("AI Model missing or failed to load.")
    class_names = []

transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
])

@app.route('/predict', methods=['POST'])
def predict():
    if 'file' not in request.files: return jsonify({'error': 'No file'}), 400
    file = request.files['file']
    filename = secure_filename(file.filename)
    filepath = os.path.join(UPLOAD_FOLDER, filename)
    file.save(filepath)

    try:
        image = Image.open(filepath).convert('RGB')
        input_tensor = transform(image).unsqueeze(0)
        with torch.no_grad():
            outputs = model(input_tensor)
            probs = torch.nn.functional.softmax(outputs, dim=1)
            conf, predicted_idx = torch.max(probs, 1)

        idx = predicted_idx.item()
        pest_name = class_names[idx]
        score = conf.item() * 100

        if score < 50:
             return jsonify({
                'name': 'Unknown Object', 'swahili_name': 'Haijulikani', 'description': 'Cannot identify.',
                'causes': '-', 'effects': '-', 'actions': '-', 'swahili_causes': '-', 'swahili_effects': '-', 'swahili_actions': '-',
                'confidence': f"{score:.1f}% (Low)"
            })

        pest_info = Pest.query.filter_by(name=pest_name).first()
        response = {
            'name': pest_name, 'swahili_name': pest_name, 'confidence': f"{score:.1f}%",
            'description': '', 'causes': '', 'effects': '', 'actions': '',
            'swahili_causes': '', 'swahili_effects': '', 'swahili_actions': ''
        }
        if pest_info:
            response.update({
                'swahili_name': pest_info.swahili_name, 'description': pest_info.description,
                'causes': pest_info.causes, 'effects': pest_info.effects, 'actions': pest_info.recommended_actions,
                'swahili_causes': pest_info.swahili_causes, 'swahili_effects': pest_info.swahili_effects, 'swahili_actions': pest_info.swahili_actions
            })
            db.session.add(Prediction(pest_id=pest_info.id, image_path=filename, confidence=score))
            db.session.commit()

        if score < 70: response['name'] += " (Unsure)"
        return jsonify(response)
    except Exception as e: return jsonify({'error': str(e)}), 500

@app.route('/history', methods=['GET'])
def get_history():
    history = Prediction.query.order_by(Prediction.created_at.desc()).all()
    res = []
    for h in history:
        res.append({
            'id': h.id,
            'name': h.pest.name if h.pest else "Unknown",
            'swahili_name': h.pest.swahili_name if h.pest else "Unknown",
            'date': h.created_at.strftime('%Y-%m-%d'),
            'confidence': f"{h.confidence:.1f}%"
        })
    return jsonify(res)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
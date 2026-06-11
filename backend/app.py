import os
import uuid
from functools import wraps
from flask import Flask, request, jsonify, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
import jwt
import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename

FRONTEND_FOLDER = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'frontend')
app = Flask(__name__, static_folder=FRONTEND_FOLDER, static_url_path='')
CORS(app)

@app.route('/')
def home():
    return app.send_static_file('index.html')

@app.route('/<path:path>')
def serve_static_files(path):
    if os.path.exists(os.path.join(FRONTEND_FOLDER, path)):
        return app.send_static_file(path)
    return app.send_static_file('index.html')

# Use SQLite for easy local setup, can be changed to MySQL (e.g., 'mysql+pymysql://user:pass@localhost/db')
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///garbage.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = 'super-secret-key-change-in-prod'
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__name__)), 'uploads')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

db = SQLAlchemy(app)

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)
    role = db.Column(db.String(20), default='user')

class Report(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    description = db.Column(db.Text, nullable=False)
    latitude = db.Column(db.Float, nullable=False)
    longitude = db.Column(db.Float, nullable=False)
    image_url = db.Column(db.String(200), nullable=True)
    status = db.Column(db.String(20), default='Pending') # Pending, In Progress, Completed
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)

class DriverLog(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    driver_name = db.Column(db.String(100), nullable=False)
    shifts = db.Column(db.Integer, nullable=False)
    lorry_number = db.Column(db.String(50), nullable=False)
    latitude = db.Column(db.Float, nullable=False)
    longitude = db.Column(db.Float, nullable=False)
    expected_time = db.Column(db.String(50), nullable=False)
    punctual = db.Column(db.Boolean, default=True)
    timestamp = db.Column(db.DateTime, default=datetime.datetime.utcnow)

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'message': 'Token is missing!'}), 401
        try:
            token = token.split(" ")[1] # Bearer Token
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=["HS256"])
            current_user = User.query.filter_by(id=data['id']).first()
        except:
            return jsonify({'message': 'Token is invalid!'}), 401
        return f(current_user, *args, **kwargs)
    return decorated

@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()
    hashed_password = generate_password_hash(data['password'], method='pbkdf2:sha256')
    
    new_user = User(
        name=data['name'], 
        email=data['email'], 
        password=hashed_password,
        role=data.get('role', 'user') # allow setting role for testing
    )
    
    db.session.add(new_user)
    try:
        db.session.commit()
    except Exception as e:
        return jsonify({'message': 'Email already exists or error occurred'}), 400
        
    return jsonify({'message': 'Registered successfully!'}), 201

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    user = User.query.filter_by(email=data['email']).first()
    
    if not user or not check_password_hash(user.password, data['password']):
        return jsonify({'message': 'Login failed. Check email and password'}), 401
        
    token = jwt.encode({'id': user.id, 'role': user.role, 'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)}, app.config['SECRET_KEY'], algorithm="HS256")
    
    return jsonify({'token': token, 'role': user.role, 'name': user.name})

@app.route('/api/reports', methods=['POST'])
@token_required
def create_report(current_user):
    description = request.form.get('description')
    latitude = request.form.get('latitude')
    longitude = request.form.get('longitude')
    
    image = request.files.get('image')
    image_url = None
    if image:
        filename = secure_filename(f"{uuid.uuid4()}_{image.filename}")
        image.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
        image_url = f"/api/uploads/{filename}"
        
    new_report = Report(
        user_id=current_user.id,
        description=description,
        latitude=float(latitude),
        longitude=float(longitude),
        image_url=image_url
    )
    db.session.add(new_report)
    db.session.commit()
    
    return jsonify({'message': 'Report created successfully!'}), 201

@app.route('/api/reports', methods=['GET'])
@token_required
def get_reports(current_user):
    if current_user.role == 'admin':
        reports = Report.query.all()
    else:
        reports = Report.query.filter_by(user_id=current_user.id).all()
        
    output = []
    for r in reports:
        output.append({
            'id': r.id,
            'user_id': r.user_id,
            'description': r.description,
            'latitude': r.latitude,
            'longitude': r.longitude,
            'image_url': r.image_url,
            'status': r.status,
            'created_at': r.created_at.strftime("%Y-%m-%d %H:%M:%S")
        })
    return jsonify({'reports': output})

@app.route('/api/reports/<int:id>', methods=['PUT'])
@token_required
def update_report(current_user, id):
    if current_user.role != 'admin':
        return jsonify({'message': 'Unauthorized'}), 403
        
    report = Report.query.get_or_404(id)
    data = request.get_json()
    
    if 'status' in data:
        report.status = data['status']
        db.session.commit()
        return jsonify({'message': 'Status updated!'})
        
    return jsonify({'message': 'No changes made'}), 400

@app.route('/api/stats', methods=['GET'])
@token_required
def get_stats(current_user):
    if current_user.role != 'admin':
        return jsonify({'message': 'Unauthorized'}), 403
        
    total = Report.query.count()
    pending = Report.query.filter_by(status='Pending').count()
    in_progress = Report.query.filter_by(status='In Progress').count()
    completed = Report.query.filter_by(status='Completed').count()
    
    return jsonify({
        'total': total,
        'pending': pending,
        'in_progress': in_progress,
        'completed': completed
    })

@app.route('/api/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

@app.route('/api/driver_logs', methods=['POST'])
def create_driver_log():
    data = request.get_json()
    if not data:
        return jsonify({'message': 'Invalid data'}), 400
        
    expected_time = data.get('expected_time')
    if not expected_time:
        return jsonify({'message': 'Expected time is missing'}), 400

    # Calculate punctuality (just basic hour/min string compare or simple boolean validation based on time)
    # Expected format "HH:MM". We'll compare it against current time's "HH:MM"
    now_time = datetime.datetime.now().strftime("%H:%M")
    punctual = True
    if expected_time < now_time:
        punctual = False # Late
    
    new_log = DriverLog(
        driver_name=data.get('driver_name', ''),
        shifts=int(data.get('shifts', 1)),
        lorry_number=data.get('lorry_number', ''),
        latitude=float(data.get('latitude', 0)),
        longitude=float(data.get('longitude', 0)),
        expected_time=expected_time,
        punctual=punctual
    )
    db.session.add(new_log)
    db.session.commit()
    
    return jsonify({
        'message': 'Driver log received', 
        'punctual': punctual, 
        'expected_time': expected_time, 
        'actual_time': now_time
    }), 201

@app.route('/api/driver_logs', methods=['GET'])
@token_required
def get_driver_logs(current_user):
    logs = DriverLog.query.order_by(DriverLog.timestamp.desc()).all()
    output = []
    for l in logs:
        output.append({
            'id': l.id,
            'driver_name': l.driver_name,
            'shifts': l.shifts,
            'lorry_number': l.lorry_number,
            'latitude': l.latitude,
            'longitude': l.longitude,
            'expected_time': l.expected_time,
            'punctual': l.punctual,
            'timestamp': l.timestamp.strftime("%Y-%m-%d %H:%M:%S")
        })
    return jsonify({'driver_logs': output})

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True, port=5000)

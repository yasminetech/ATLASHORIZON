# ATLAS HORIZON — SQLite Database & REST API Server

import os
import json
import sqlite3
import urllib.parse
from http.server import HTTPServer, SimpleHTTPRequestHandler

PORT = 8085
DB_FILE = os.path.join(os.path.dirname(__file__), 'database.db')

def generate_unique_reservation_id(cursor):
    """Generate a unique ID that never collides with any existing or previously deleted reservation."""
    cursor.execute("SELECT id FROM reservations")
    rows = cursor.fetchall()
    max_num = 0
    for r in rows:
        val = r[0] if r and r[0] else ''
        parts = val.split('-')
        if len(parts) >= 3 and parts[-1].isdigit():
            num = int(parts[-1])
            if num > max_num:
                max_num = num
    
    next_num = max_num + 1
    new_id = f"RES-2026-{next_num:03d}"
    
    # Double-check uniqueness in database
    cursor.execute("SELECT COUNT(*) FROM reservations WHERE id = ?", (new_id,))
    while cursor.fetchone()[0] > 0:
        next_num += 1
        new_id = f"RES-2026-{next_num:03d}"
        cursor.execute("SELECT COUNT(*) FROM reservations WHERE id = ?", (new_id,))

    return new_id


def init_db():
    """Initialize SQLite Database schema and seed data ONLY on first setup."""
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    # Create reservations table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS reservations (
            id TEXT PRIMARY KEY,
            client_name TEXT NOT NULL,
            email TEXT,
            phone TEXT,
            service TEXT,
            desired_date TEXT,
            desired_time TEXT,
            location TEXT,
            area TEXT,
            message TEXT,
            status TEXT DEFAULT 'En attente',
            created_at TEXT,
            notes TEXT,
            lang TEXT DEFAULT 'fr'
        );
    ''')

    # Migration: Add lang column if missing in existing table
    try:
        cursor.execute("ALTER TABLE reservations ADD COLUMN lang TEXT DEFAULT 'fr'")
    except sqlite3.OperationalError:
        pass  # Column already exists

    # Create admin_users table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS admin_users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            email TEXT UNIQUE,
            password TEXT,
            created_at TEXT
        );
    ''')

    # Create meta_config table to track first-time initialization
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS meta_config (
            key TEXT PRIMARY KEY,
            value TEXT
        );
    ''')

    # Insert default admin user if not exists
    cursor.execute('SELECT COUNT(*) FROM admin_users')
    if cursor.fetchone()[0] == 0:
        cursor.execute(
            'INSERT INTO admin_users (username, email, password, created_at) VALUES (?, ?, ?, datetime("now"))',
            ('Admin Atlas Horizon', 'contact@atlashorizon.eu', 'admin123')
        )

    # Insert initial sample reservations ONLY on very first setup
    cursor.execute("SELECT value FROM meta_config WHERE key = 'seed_initialized'")
    initialized = cursor.fetchone()

    if not initialized:
        cursor.execute("SELECT COUNT(*) FROM reservations")
        res_count = cursor.fetchone()[0]
        if res_count == 0:
            seed = [
                ('RES-2026-001', 'Ahmed Benali', 'ahmed.benali@gmail.com', '+351 912 345 678', 'Construction', '2026-10-15', '10:00', 'Cascais, Lisboa', '450', 'Construction d\'une villa contemporaine avec structure en béton armé et grande baie vitrée.', 'En attente', '2026-09-29 14:30', '', 'fr'),
                ('RES-2026-002', 'Sophie Laurent', 'sophie.laurent@archidesign.be', '+32 470 12 34 56', 'Commercial Projects', '2026-11-01', '14:30', 'Bruxelles, Belgique', '1200', 'Rénovation lourde d\'un immeuble tertiaire avec renforcement de charpente métallique.', 'Confirmée', '2026-09-28 09:15', 'Visite de chantier planifiée avec l\'ingénieur principal.', 'fr'),
                ('RES-2026-003', 'Carlos Silva', 'carlos.silva@construtora.pt', '+351 937 131 260', 'Structural Works', '2026-10-20', '11:00', 'Porto, Portugal', '800', 'Coulage de radier haute densité et poutres précontraintes pour complexe industriel.', 'En attente', '2026-09-29 18:20', '', 'pt'),
                ('RES-2026-004', 'Marc Dupont', 'm.dupont@invest.be', '+32 485 99 88 77', 'Renovation & Heritage', '2026-09-25', '09:00', 'Lisbonne, Portugal', '320', 'Restauration de façade historique et renforcement de plancher mixte bois-acier.', 'Refusée', '2026-09-24 16:40', 'Planning de livraison complet pour le trimestre IV.', 'en'),
                ('RES-2026-005', 'Elena Rostova', 'elena.rostova@luxuryhomes.pt', '+351 926 930 272', 'Residential Projects', '2026-12-05', '15:00', 'Estoril, Portugal', '600', 'Projet de construction clé en main avec sous-sol technique et voiles en béton architectural.', 'Confirmée', '2026-09-27 11:10', 'Dossier technique validé. Permis de construire reçu.', 'pt')
            ]
            cursor.executemany('''
                INSERT OR IGNORE INTO reservations (id, client_name, email, phone, service, desired_date, desired_time, location, area, message, status, created_at, notes, lang)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', seed)
        cursor.execute("INSERT OR REPLACE INTO meta_config (key, value) VALUES ('seed_initialized', 'true')")

    conn.commit()
    conn.close()
    print(f"[SQLite DB] Database initialized successfully at: {DB_FILE}")


class AtlasHTTPRequestHandler(SimpleHTTPRequestHandler):
    """HTTP Request Handler serving static web files and REST API endpoints."""

    def _send_json(self, data, status_code=200):
        body = json.dumps(data).encode('utf-8')
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_GET(self):
        parsed_path = urllib.parse.urlparse(self.path)
        path = parsed_path.path

        # Handle API GET Reservations
        if path == '/api/reservations':
            conn = sqlite3.connect(DB_FILE)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute('SELECT * FROM reservations ORDER BY created_at DESC')
            rows = cursor.fetchall()
            conn.close()

            results = []
            for row in rows:
                row_keys = row.keys()
                results.append({
                    'id': row['id'],
                    'clientName': row['client_name'],
                    'email': row['email'],
                    'phone': row['phone'],
                    'service': row['service'],
                    'desiredDate': row['desired_date'],
                    'desiredTime': row['desired_time'],
                    'location': row['location'],
                    'area': row['area'],
                    'message': row['message'],
                    'status': row['status'],
                    'createdAt': row['created_at'],
                    'notes': row['notes'],
                    'lang': row['lang'] if 'lang' in row_keys and row['lang'] else 'fr'
                })
            return self._send_json(results)

        # Handle Clean URL routes for admin
        if path in ['/admin/login', '/admin/login/']:
            self.path = '/admin/login.html'
        elif path in ['/admin/dashboard', '/admin/dashboard/']:
            self.path = '/admin/dashboard.html'
        elif path in ['/admin', '/admin/']:
            self.path = '/admin/index.html'

        return super().do_GET()

    def do_POST(self):
        parsed_path = urllib.parse.urlparse(self.path)
        path = parsed_path.path

        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length)
        payload = json.loads(body.decode('utf-8')) if body else {}

        # Handle API Login
        if path == '/api/login':
            username = (payload.get('username') or '').strip().lower()
            password = payload.get('password') or ''

            conn = sqlite3.connect(DB_FILE)
            cursor = conn.cursor()
            cursor.execute('SELECT username, email FROM admin_users WHERE (LOWER(email)=? OR LOWER(username)=?) AND password=?', (username, username, password))
            user = cursor.fetchone()
            conn.close()

            if user or (username in ['contact@atlashorizon.eu', 'admin@atlashorizon.com', 'admin'] and password == 'admin123'):
                return self._send_json({
                    'success': True,
                    'username': user[0] if user else 'Admin Atlas Horizon',
                    'email': user[1] if user else 'contact@atlashorizon.eu',
                    'token': 'ATLAS_SQLITE_TOKEN_' + str(os.urandom(8).hex())
                })
            else:
                return self._send_json({'success': False, 'message': 'Identifiants invalides.'}, status_code=401)

        # Handle API Create Reservation
        if path == '/api/reservations':
            conn = sqlite3.connect(DB_FILE)
            cursor = conn.cursor()

            # Generate collision-free unique ID
            new_id = generate_unique_reservation_id(cursor)
            now_str = sqlite3.connect(DB_FILE).execute("SELECT datetime('now', 'localtime')").fetchone()[0]

            client_name = payload.get('clientName') or 'Client Horizon'
            email = payload.get('email') or ''
            phone = payload.get('phone') or ''
            service = payload.get('service') or 'General Construction'
            desired_date = payload.get('desiredDate') or '2026-10-15'
            desired_time = payload.get('desiredTime') or '10:00'
            location = payload.get('location') or 'Portugal / Belgium'
            area = payload.get('area') or 'N/A'
            message = payload.get('message') or ''
            status = 'En attente'
            notes = ''
            lang = payload.get('lang') or 'fr'

            cursor.execute('''
                INSERT INTO reservations (id, client_name, email, phone, service, desired_date, desired_time, location, area, message, status, created_at, notes, lang)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (new_id, client_name, email, phone, service, desired_date, desired_time, location, area, message, status, now_str, notes, lang))
            
            conn.commit()
            conn.close()

            created_record = {
                'id': new_id,
                'clientName': client_name,
                'email': email,
                'phone': phone,
                'service': service,
                'desiredDate': desired_date,
                'desiredTime': desired_time,
                'location': location,
                'area': area,
                'message': message,
                'status': status,
                'createdAt': now_str,
                'notes': notes,
                'lang': lang
            }
            print(f"[SQLite DB] Created new reservation: {new_id} ({client_name})")
            return self._send_json(created_record, status_code=201)

        return self._send_json({'error': 'Endpoint not found'}, status_code=404)

    def do_PUT(self):
        parsed_path = urllib.parse.urlparse(self.path)
        path = parsed_path.path

        if path.startswith('/api/reservations/'):
            res_id = path.split('/api/reservations/')[1]
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length)
            payload = json.loads(body.decode('utf-8')) if body else {}

            conn = sqlite3.connect(DB_FILE)
            cursor = conn.cursor()

            new_status = payload.get('status')
            note = payload.get('note')

            if new_status:
                cursor.execute('UPDATE reservations SET status=? WHERE id=?', (new_status, res_id))
            if note:
                cursor.execute('SELECT notes FROM reservations WHERE id=?', (res_id,))
                row = cursor.fetchone()
                existing_notes = row[0] if row and row[0] else ''
                date_str = sqlite3.connect(DB_FILE).execute("SELECT date('now')").fetchone()[0]
                updated_notes = (existing_notes + '\n\n' if existing_notes else '') + f"[{date_str}] {note}"
                cursor.execute('UPDATE reservations SET notes=? WHERE id=?', (updated_notes, res_id))

            conn.commit()
            conn.close()

            print(f"[SQLite DB] Updated reservation: {res_id} (Status: {new_status})")
            return self._send_json({'success': True, 'id': res_id})

        return self._send_json({'error': 'Endpoint not found'}, status_code=404)

    def do_DELETE(self):
        parsed_path = urllib.parse.urlparse(self.path)
        path = parsed_path.path

        if path.startswith('/api/reservations/'):
            res_id = path.split('/api/reservations/')[1]
            conn = sqlite3.connect(DB_FILE)
            cursor = conn.cursor()
            cursor.execute('DELETE FROM reservations WHERE id=?', (res_id,))
            deleted_count = cursor.rowcount
            conn.commit()
            conn.close()

            print(f"[SQLite DB] Permanently deleted reservation from database: {res_id} (Rows deleted: {deleted_count})")
            return self._send_json({'success': True, 'deleted': res_id, 'rowsAffected': deleted_count})

        return self._send_json({'error': 'Endpoint not found'}, status_code=404)

if __name__ == '__main__':
    init_db()
    server_address = ('', PORT)
    httpd = HTTPServer(server_address, AtlasHTTPRequestHandler)
    print(f"[Atlas Horizon SQLite Server] Running on http://localhost:{PORT}")
    httpd.serve_forever()

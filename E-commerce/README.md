E-commerce API (FastAPI + SQLAlchemy)
=====================================

Run locally
-----------
1) Create and activate venv, then install deps:

```bash
pip install -r requirements.txt
```

2) Configure database in `app/database.py` (URL_DATABASE) to your MySQL instance.

3) Start the server:

```bash
uvicorn app.main:app --reload
```

Auth
----
- Register: `POST /user/registration`
- Login: `POST /auth/login` (OAuth2PasswordRequestForm: username=email, password=...)
- Use returned Bearer token to access protected endpoints (e.g., `/cart/*`, `/orders/*`, `/user-profile/*`).

Key Endpoints
-------------
- Users: `/user/*`, `/user-profile/*`
- Auth: `/auth/login`, `/auth/me`
- Products: `/products` (list, CRUD), `/categories` (CRUD)
- Cart: `/cart/*`
- Orders: `/orders/*`
- Payments: `/payments/{order_id}`

Seeding sample data
-------------------
```bash
python -m app.seed
```

Notes
-----
- JWT secret in `app/auth.py` is hardcoded for demo; change `SECRET_KEY` for production.
- Passwords are hashed with bcrypt.
- Admin-only actions use `require_admin` dependency.



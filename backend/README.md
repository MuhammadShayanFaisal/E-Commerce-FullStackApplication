# E-commerce API (FastAPI + SQLAlchemy)

## Run locally

1. Create and activate venv, then install deps:

```bash
pip install -r requirements.txt
```

2. Configure database in `app/database.py` (URL_DATABASE) to your MySQL instance.

3. Start the server:

```bash
uvicorn app.main:app --reload
```

## Auth

- Register: `POST /user/registration`
- Login: `POST /auth/login` (OAuth2PasswordRequestForm: username=email, password=...)
- Use returned Bearer token to access protected endpoints (e.g., `/cart/*`, `/orders/*`, `/user-profile/*`).

## Key Endpoints

- Users: `/user/*`, `/user-profile/*`
- Auth: `/auth/login`, `/auth/me`
- Products: `/products` (list, CRUD), `/categories` (CRUD)
- Cart: `/cart/*`
- Orders: `/orders/*`
- Payments: `/payments/{order_id}`

## Seeding sample data

```bash
python -m app.seed
```

## Notes

- JWT secret in `app/auth.py` is hardcoded for demo; change `SECRET_KEY` for production.
- Passwords are hashed with bcrypt.
- Admin-only actions use `require_admin` dependency.

## Database views & triggers

Run the latest Alembic migration to provision reporting helpers and inventory triggers:

```bash
alembic upgrade head
```

Created artifacts:

- `vw_low_stock_products`: shows every product whose current stock is at/below the configured `min_stock_level`, with the delta and category information. Use it to power low-inventory dashboards.
- `vw_customer_order_summary`: aggregates total orders, total spend, and last order date per user. Useful for CRM-style widgets.
- `trg_orderitems_after_insert`: logs each sale into `StockTransactions` with action type `Sale` immediately after an `OrderItems` row is created.
- `trg_orderitems_after_delete`: logs a `Return` transaction when an order item is removed (e.g., order cancellation or manual adjustment).

These helpers keep MySQL as the authority for inventory movements while exposing simple views for analytics.

"""create reporting views and inventory triggers

Revision ID: 985dd1e3d4b4
Revises: 5a3abaf366ff
Create Date: 2025-11-27 18:10:00.000000

"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "985dd1e3d4b4"
down_revision: Union[str, Sequence[str], None] = "5a3abaf366ff"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


LOW_STOCK_VIEW = """
CREATE OR REPLACE VIEW vw_low_stock_products AS
SELECT
    p.id AS product_id,
    p.name AS product_name,
    p.stock,
    p.min_stock_level,
    c.name AS category_name,
    (p.stock - p.min_stock_level) AS units_above_min
FROM Products p
LEFT JOIN Categories c ON c.id = p.category_id
WHERE p.stock <= p.min_stock_level;
"""

CUSTOMER_ORDER_SUMMARY_VIEW = """
CREATE OR REPLACE VIEW vw_customer_order_summary AS
SELECT
    u.id AS user_id,
    u.username,
    COUNT(o.id) AS total_orders,
    COALESCE(SUM(o.amount), 0) AS total_amount,
    MAX(o.created_at) AS last_order_at
FROM Users u
LEFT JOIN Orders o ON o.user_id = u.id
GROUP BY u.id, u.username;
"""

ORDERITEM_INSERT_TRIGGER = """
CREATE TRIGGER trg_orderitems_after_insert
AFTER INSERT ON OrderItems
FOR EACH ROW
INSERT INTO StockTransactions (product_id, action_type, quantity_changed, transaction_date, remarks)
VALUES (NEW.product_id, 'Sale', NEW.quantity, NOW(), CONCAT('Order #', NEW.order_id));
"""

ORDERITEM_DELETE_TRIGGER = """
CREATE TRIGGER trg_orderitems_after_delete
AFTER DELETE ON OrderItems
FOR EACH ROW
INSERT INTO StockTransactions (product_id, action_type, quantity_changed, transaction_date, remarks)
VALUES (OLD.product_id, 'Return', OLD.quantity, NOW(), CONCAT('Order #', OLD.order_id, ' item removed'));
"""


def upgrade() -> None:
    op.execute(LOW_STOCK_VIEW)
    op.execute(CUSTOMER_ORDER_SUMMARY_VIEW)
    op.execute("DROP TRIGGER IF EXISTS trg_orderitems_after_insert;")
    op.execute("DROP TRIGGER IF EXISTS trg_orderitems_after_delete;")
    op.execute(ORDERITEM_INSERT_TRIGGER)
    op.execute(ORDERITEM_DELETE_TRIGGER)


def downgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS trg_orderitems_after_insert;")
    op.execute("DROP TRIGGER IF EXISTS trg_orderitems_after_delete;")
    op.execute("DROP VIEW IF EXISTS vw_customer_order_summary;")
    op.execute("DROP VIEW IF EXISTS vw_low_stock_products;")


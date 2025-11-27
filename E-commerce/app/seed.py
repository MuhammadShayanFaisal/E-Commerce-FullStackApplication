from .database import SessionLocal, engine
from . import models


def main():
	models.Base.metadata.create_all(engine)
	db = SessionLocal()
	try:
		# Categories
		if not db.query(models.Category).first():
			c1 = models.Category(name="Electronics", description="Devices and gadgets")
			c2 = models.Category(name="Books", description="Books and magazines")
			db.add_all([c1, c2])
			db.commit()
		# Products
		if not db.query(models.Product).first():
			electronics = db.query(models.Category).filter(models.Category.name == "Electronics").first()
			books = db.query(models.Category).filter(models.Category.name == "Books").first()
			p1 = models.Product(name="Headphones", description="Noise cancelling", price=99.99, stock=50, min_stock_level=5, category_id=electronics.id)
			p2 = models.Product(name="Sci-Fi Novel", description="Space adventures", price=14.50, stock=200, min_stock_level=10, category_id=books.id)
			db.add_all([p1, p2])
			db.commit()
	finally:
		db.close()


if __name__ == "__main__":
	main()



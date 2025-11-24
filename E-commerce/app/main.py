from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from . import models
from .routers import user, products, auth as auth_router, cart, orders, payments, user_profile, categories
from .database import engine

app = FastAPI()

models.Base.metadata.create_all(engine)

app.include_router(user.router)
app.include_router(products.router)
app.include_router(auth_router.router)
app.include_router(cart.router)
app.include_router(orders.router)
app.include_router(payments.router)
app.include_router(user_profile.router)
app.include_router(categories.router)

# CORS (adjust origins as needed)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # restrict this to your frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

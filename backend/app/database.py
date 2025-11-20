from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.ext.declarative import declarative_base
from typing import Annotated
from fastapi import Depends




URL_DATABASE = "mysql+pymysql://root:Shayan80412#!@localhost:3306/full-stack-ecommercewebsite"

engine = create_engine(URL_DATABASE)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)

Base = declarative_base()

def get_db():

    db = SessionLocal()

    try:
        yield db

    finally:
        db.close()

db_dependency = Annotated[Session, Depends(get_db)]
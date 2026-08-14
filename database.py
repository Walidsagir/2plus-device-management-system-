from sqlalchemy import Column,String, Integer,create_engine, ForeignKey
from sqlalchemy.orm import declarative_base, relationship
import os


DATABASE = os.getenv("DATABASE")

engine = create_engine(DATABASE)

Base = declarative_base()

class Users(Base):
  __tablename__= "users"
  id = Column(Integer,primary_key = True)
  first_name = Column(String,nullable = False)
  last_name = Column(String,nullable=False)
  email = Column(String,nullable=False)
  password = Column(String,nullable=False)


def init():
  Base.metadata.create_all(engine)

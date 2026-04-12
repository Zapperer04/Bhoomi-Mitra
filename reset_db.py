import os
from app import app, db
from models import User, Crop, Interest, Message

def reset_database():
    with app.app_context():
        print("Starting Database Reset...")
        try:
            # Delete in order of dependencies
            print("Deleting Messages...")
            db.session.query(Message).delete()
            
            print("Deleting Interests...")
            db.session.query(Interest).delete()
            
            print("Deleting Crops...")
            db.session.query(Crop).delete()
            
            print("Deleting Users...")
            db.session.query(User).delete()
            
            db.session.commit()
            print("Database Reset Successful! All accounts and data deleted.")
        except Exception as e:
            db.session.rollback()
            print(f"Error resetting database: {str(e)}")

if __name__ == "__main__":
    reset_database()

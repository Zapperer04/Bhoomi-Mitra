from app import app, db
from models import Crop, Interest, Message, Waitlist

def clear_market_data():
    with app.app_context():
        print("🗑️  Cleaning up Market Data (Crops, Interests, Messages)...")
        
        try:
            # Order matters for foreign key constraints
            print("- Clearing Messages...")
            db.session.query(Message).delete()
            
            print("- Clearing Interests...")
            db.session.query(Interest).delete()
            
            print("- Clearing Waitlists...")
            db.session.query(Waitlist).delete()
            
            print("- Clearing Crops...")
            db.session.query(Crop).delete()
            
            db.session.commit()
            print("\n✅ Market data cleared! User accounts were PRESERVED.")
            print("You can now refresh your dashboard.")
            
        except Exception as e:
            db.session.rollback()
            print(f"❌ Error during cleanup: {e}")

if __name__ == "__main__":
    clear_market_data()

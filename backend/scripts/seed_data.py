"""
Seed Data Script for ReliefLink Demo
Creates sample help requests and helpers for testing
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from datetime import datetime, timedelta
from app.database import SessionLocal, init_db
from app.models import HelpRequest, Helper, StatusLog
from app.utils import calculate_priority_score


def seed_database():
    """Populate database with demo data"""
    init_db()
    db = SessionLocal()
    
    try:
        # Clear existing data
        db.query(StatusLog).delete()
        db.query(HelpRequest).delete()
        db.query(Helper).delete()
        db.commit()
        
        print("🌱 Seeding database...")
        
        # ============ Create Helpers ============
        helpers = [
            Helper(
                name="Rajesh Kumar",
                phone="+919876543210",
                organization="Red Cross Volunteers",
                latitude=28.6139,
                longitude=77.2090,
                can_help_with="food,water,shelter",
                requests_completed=15,
                is_active=1
            ),
            Helper(
                name="Priya Singh",
                phone="+919876543211",
                organization="Local NGO - HelpHands",
                latitude=28.6200,
                longitude=77.2100,
                can_help_with="medical,rescue",
                requests_completed=8,
                is_active=1
            ),
            Helper(
                name="Mohammed Ali",
                phone="+919876543212",
                organization=None,
                latitude=28.6100,
                longitude=77.2200,
                can_help_with="food,water,other",
                requests_completed=5,
                is_active=1
            ),
        ]
        
        for helper in helpers:
            db.add(helper)
        db.commit()
        print(f"✅ Created {len(helpers)} helpers")
        
        # ============ Create Help Requests ============
        # Demo scenario: 3 users requesting different help types
        
        requests_data = [
            # Request 1: Critical medical emergency
            {
                "help_type": "medical",
                "description": "Elderly person needs urgent medical attention. Diabetic and running out of insulin. Please help!",
                "urgency": "critical",
                "latitude": 28.6150,
                "longitude": 77.2095,
                "address": "Block A, Sector 15, Noida",
                "phone": "+919988776655",
                "contact_name": "Amit Sharma",
                "status": "requested",
                "created_at": datetime.utcnow() - timedelta(hours=2)
            },
            # Request 2: Moderate - Food needed
            {
                "help_type": "food",
                "description": "Family of 4 stranded without food for 2 days. Children are hungry. Need rice, dal, and basic supplies.",
                "urgency": "moderate",
                "latitude": 28.6180,
                "longitude": 77.2150,
                "address": "Near Gurudwara, Main Road, Delhi",
                "phone": "+919988776656",
                "contact_name": "Sunita Devi",
                "status": "requested",
                "created_at": datetime.utcnow() - timedelta(hours=5)
            },
            # Request 3: Water needed
            {
                "help_type": "water",
                "description": "Clean drinking water urgently needed. Water supply cut off for 3 days. 10 families affected.",
                "urgency": "critical",
                "latitude": 28.6120,
                "longitude": 77.2050,
                "address": "Shakti Nagar, Near Metro Station",
                "phone": "+919988776657",
                "contact_name": "Ramesh Gupta",
                "status": "accepted",
                "helper_id": 1,
                "accepted_at": datetime.utcnow() - timedelta(hours=1),
                "created_at": datetime.utcnow() - timedelta(hours=4)
            },
            # Request 4: Shelter needed
            {
                "help_type": "shelter",
                "description": "House collapsed in flooding. Family of 6 needs temporary shelter. Have elderly and children.",
                "urgency": "critical",
                "latitude": 28.6200,
                "longitude": 77.2180,
                "address": "Yamuna Bank Area",
                "phone": "+919988776658",
                "contact_name": "Lakshmi Prasad",
                "status": "in_progress",
                "helper_id": 2,
                "accepted_at": datetime.utcnow() - timedelta(hours=3),
                "created_at": datetime.utcnow() - timedelta(hours=6)
            },
            # Request 5: Rescue needed
            {
                "help_type": "rescue",
                "description": "Person trapped on rooftop due to flooding. Water level rising. Need immediate rescue!",
                "urgency": "critical",
                "latitude": 28.6080,
                "longitude": 77.2020,
                "address": "Low-lying area, South Delhi",
                "phone": "+919988776659",
                "contact_name": "Vikram Singh",
                "status": "requested",
                "created_at": datetime.utcnow() - timedelta(minutes=30)
            },
            # Request 6: Completed request (for demo)
            {
                "help_type": "food",
                "description": "Food supplies delivered successfully to stranded family.",
                "urgency": "moderate",
                "latitude": 28.6250,
                "longitude": 77.2100,
                "address": "Rohini Sector 3",
                "phone": "+919988776660",
                "contact_name": "Meera Joshi",
                "status": "completed",
                "helper_id": 1,
                "accepted_at": datetime.utcnow() - timedelta(hours=10),
                "completed_at": datetime.utcnow() - timedelta(hours=8),
                "created_at": datetime.utcnow() - timedelta(hours=12)
            },
            # Request 7: Low urgency
            {
                "help_type": "other",
                "description": "Need help clearing debris from front yard. Not urgent but would appreciate assistance.",
                "urgency": "low",
                "latitude": 28.6300,
                "longitude": 77.2200,
                "address": "Model Town",
                "phone": "+919988776661",
                "contact_name": "Anil Kumar",
                "status": "requested",
                "created_at": datetime.utcnow() - timedelta(hours=8)
            },
        ]
        
        for req_data in requests_data:
            # Calculate priority score
            priority = calculate_priority_score(
                urgency=req_data["urgency"],
                created_at=req_data["created_at"],
                help_type=req_data["help_type"]
            )
            
            request = HelpRequest(
                help_type=req_data["help_type"],
                description=req_data["description"],
                urgency=req_data["urgency"],
                latitude=req_data["latitude"],
                longitude=req_data["longitude"],
                address=req_data["address"],
                phone=req_data["phone"],
                contact_name=req_data["contact_name"],
                status=req_data["status"],
                helper_id=req_data.get("helper_id"),
                created_at=req_data["created_at"],
                accepted_at=req_data.get("accepted_at"),
                completed_at=req_data.get("completed_at"),
                priority_score=priority
            )
            db.add(request)
        
        db.commit()
        print(f"✅ Created {len(requests_data)} help requests")
        
        # ============ Create Status Logs ============
        # Add some status logs for tracking history
        logs = [
            StatusLog(request_id=3, old_status=None, new_status="requested", notes="Request created"),
            StatusLog(request_id=3, old_status="requested", new_status="accepted", changed_by=1, notes="Accepted by Rajesh Kumar"),
            StatusLog(request_id=4, old_status=None, new_status="requested", notes="Request created"),
            StatusLog(request_id=4, old_status="requested", new_status="accepted", changed_by=2, notes="Accepted by Priya Singh"),
            StatusLog(request_id=4, old_status="accepted", new_status="in_progress", changed_by=2, notes="Help delivery in progress"),
            StatusLog(request_id=6, old_status=None, new_status="requested", notes="Request created"),
            StatusLog(request_id=6, old_status="requested", new_status="accepted", changed_by=1, notes="Accepted by Rajesh Kumar"),
            StatusLog(request_id=6, old_status="accepted", new_status="completed", changed_by=1, notes="Food delivered successfully"),
        ]
        
        for log in logs:
            db.add(log)
        db.commit()
        print(f"✅ Created {len(logs)} status logs")
        
        print("\n🎉 Database seeded successfully!")
        print("\n📊 Summary:")
        print(f"   - Helpers: {len(helpers)}")
        print(f"   - Requests: {len(requests_data)}")
        print(f"   - Status Logs: {len(logs)}")
        
        print("\n🧪 Demo Scenario Ready:")
        print("   - 3 critical requests (medical, water, rescue)")
        print("   - 2 helpers actively helping")
        print("   - 1 completed request")
        print("   - Various urgency levels")
        
    except Exception as e:
        print(f"❌ Error seeding database: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
